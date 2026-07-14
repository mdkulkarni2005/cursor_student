import { prisma, type User } from "@studentos/db";
import { getObjectBuffer, putObject, keys } from "@studentos/storage";
import { renderReportDocx, renderReportDocxProgrammatic, inspectTemplate, fillTemplate, type PlaceholderFields, type ReportContent } from "@studentos/documents";
import {
  generateReportContent,
  generateTemplateContent,
  expandPptToReport,
  assessContext,
  answersToContext,
  generateSlideImage,
  suggestReportFigures,
  withAiRetry,
  type ClarifyQuestion,
  type FigureSuggestion,
} from "@studentos/ai";
import { assertWithinQuota, recordUsage } from "@/lib/entitlements";
import { getOrCreateCurrentWorkspace } from "@/lib/workspace";
import { analyzeReport, type ReportLike } from "@/lib/quality";
import { intakeQuestions } from "@/lib/reports/intake";
import { addJobCostCents } from "@/lib/jobs";

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const PNG_MIME = "image/png";

/** Resolve each section's figure (R2 key → PNG bytes) for the programmatic renderer. */
async function resolveFigureBuffers(content: ReportContent): Promise<Map<number, Buffer>> {
  const images = new Map<number, Buffer>();
  await Promise.all(
    content.sections.map(async (s, i) => {
      if (s.image) {
        try { images.set(i, await getObjectBuffer(s.image)); } catch { /* missing figure → render without it */ }
      }
    }),
  );
  return images;
}

/** Render the DEFAULT (no custom template) report with the programmatic builder + embedded figures. */
async function renderDefaultReport(content: ReportContent): Promise<Buffer> {
  return renderReportDocxProgrammatic(content, await resolveFigureBuffers(content));
}

export type GenerateReportInput = {
  userId: string;
  title: string;
  reportType: string;
  guidelines?: string;
  templateKey?: string;
  /** Real-world values (company, role, mentor, PRN, …) used to fill cover-page placeholders. */
  fields?: PlaceholderFields;
  /** Web flow only: pause to ask the user clarifying/intake questions before generating.
   *  Non-interactive callers (scripts, project bundles) leave this off and generate straight through. */
  interactive?: boolean;
};

/** Field keys fillPlaceholders understands — used to pick structured answers out of the clarify map. */
const FIELD_KEYS = ["name", "company", "role", "duration", "mentor", "technologies", "prn", "department", "college", "semester", "guide", "objective", "teammates", "tools", "apparatus", "method"] as const;

/** Profile-derived placeholder fields (always available, no questions needed). */
function profileFields(user: User & { institution?: { name: string } | null }): PlaceholderFields {
  return {
    name: user.name ?? undefined,
    department: user.department ?? undefined,
    semester: user.semester ?? undefined,
    college: user.institution?.name ?? undefined,
  };
}

/** Profile-derived cover-page student fields for the default (programmatic) report format. */
function defaultStudentFields(user: User & { institution?: { name: string } | null }): ReportContent["student"] {
  return {
    name: user.name ?? "Student",
    roll: "—",
    department: user.department ?? "—",
    semester: user.semester ?? "—",
    college: user.institution?.name ?? "—",
    guide: "—",
  };
}

/** Pick the placeholder-relevant entries out of the clarify answer map (ids == field keys). */
function fieldsFromAnswers(answers: Record<string, string>): PlaceholderFields {
  const out: PlaceholderFields = {};
  for (const k of FIELD_KEYS) {
    const v = answers[k]?.trim();
    if (v) out[k] = v;
  }
  return out;
}

/** Merge intake + AI-gap questions, de-duplicating by id and capping the count. */
function mergeQuestions(intake: ClarifyQuestion[], gaps: ClarifyQuestion[]): ClarifyQuestion[] {
  const seen = new Set<string>();
  const out: ClarifyQuestion[] = [];
  for (const q of [...intake, ...gaps]) {
    if (seen.has(q.id)) continue;
    seen.add(q.id);
    out.push(q);
    if (out.length >= 8) break;
  }
  return out;
}

type Produced = {
  data: ReportLike;
  model: string;
  costCents: number;
  render: () => Promise<Buffer>;
  templateIdToSet?: string;
};

/** Generate the report content (no rendering yet), for either a user template or the default. */
async function produceContent(user: User & { institution: { name: string } | null }, input: GenerateReportInput): Promise<Produced> {
  if (input.templateKey) {
    const templateBuffer = await getObjectBuffer(input.templateKey);
    const inspection = inspectTemplate(templateBuffer);
    if (!inspection.ok) throw new Error(inspection.issues[0] ?? "We couldn't read that template.");
    // Don't write prose into presentation/slides/photograph appendix headings — those produced
    // "Slide 1 — …" and photo-caption filler. The heading stays (template text preserved); we
    // simply skip generating body content for it.
    const SKIP_SECTION = /presentation|slide|power\s*point|\bppt\b|photograph/i;
    const fillHeadings = inspection.sections.filter((h) => !SKIP_SECTION.test(h));
    const gen = await generateTemplateContent({
      topic: input.title,
      docKind: "report",
      headings: fillHeadings,
      department: user.department ?? undefined,
      guidelines: input.guidelines,
    });
    const data: ReportLike = {
      sections: fillHeadings.map((h) => ({ heading: h, content: gen.contentByHeading[h] ?? "" })),
    };
    const fields: PlaceholderFields = { ...profileFields(user), ...input.fields };
    return { data, model: gen.model, costCents: gen.costCents, render: async () => fillTemplate(templateBuffer, gen.contentByHeading, fields).buffer };
  }

  const template = await prisma.template.findFirst({ where: { type: "REPORT", isDefault: true } });
  if (!template) throw new Error("No default report template configured — run the template seed.");
  const student = defaultStudentFields(user);
  const gen = await generateReportContent({
    title: input.title,
    reportType: input.reportType,
    guidelines: input.guidelines,
    student,
  });
  return {
    data: gen.content,
    model: gen.model,
    costCents: gen.costCents,
    templateIdToSet: template.id,
    // Default format → programmatic builder (supports embedded AI figures). Custom uploaded
    // templates keep the docxtemplater path above.
    render: async () => renderDefaultReport(gen.content),
  };
}

/** Render + persist a finished report (READY). Used by first-pass and resume. */
async function finalize(docId: string, userId: string, produced: Produced): Promise<void> {
  const buffer = await produced.render();
  const exportKey = keys.exportFile(docId, "DOCX");
  await putObject(exportKey, buffer, DOCX_MIME);
  await prisma.$transaction([
    prisma.documentContent.upsert({
      where: { documentId: docId },
      create: { documentId: docId, data: produced.data as unknown as object },
      update: { data: produced.data as unknown as object },
    }),
    prisma.documentExport.create({
      data: { documentId: docId, format: "DOCX", storageKey: exportKey, sizeBytes: buffer.length },
    }),
    prisma.document.update({ where: { id: docId }, data: { status: "READY", quality: analyzeReport(produced.data) } }),
    prisma.generationJob.update({
      where: { documentId: docId },
      data: { status: "SUCCEEDED", model: produced.model, finishedAt: new Date(), pending: undefined, costCents: { increment: produced.costCents } },
    }),
  ]);
  await recordUsage(userId, "REPORT", docId);
}

export type GenerateOutcome = { docId: string; status: "ready" | "needs_input" };

/** Ordered, user-facing generation stages — surfaced live on the report page while it generates. */
export const REPORT_STAGES = [
  { key: "draft", label: "Drafting your report" },
  { key: "review", label: "Checking for missing details" },
  { key: "format", label: "Formatting & finalizing" },
] as const;
export type ReportStageKey = (typeof REPORT_STAGES)[number]["key"];

/** Record the live progress stage on the job so the polling UI can show it. */
export async function setReportStage(docId: string, stage: ReportStageKey): Promise<void> {
  const job = await prisma.generationJob.findUnique({ where: { documentId: docId }, select: { pending: true } });
  const pending = (job?.pending ?? {}) as Record<string, unknown>;
  await prisma.generationJob
    .update({ where: { documentId: docId }, data: { pending: { ...pending, stage } as unknown as object } })
    .catch(() => {});
}

/** FAST: create the report doc (GENERATING) so the action can redirect immediately. */
export async function createReportDoc(input: GenerateReportInput): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: input.userId }, include: { institution: true } });
  if (!user) throw new Error("User not found.");
  await assertWithinQuota(user, "REPORT");
  const workspace = await getOrCreateCurrentWorkspace(user);
  const doc = await prisma.document.create({
    data: {
      ownerId: user.id,
      type: "REPORT",
      title: input.title,
      status: "GENERATING",
      workspaceId: workspace.id,
      job: { create: { status: "RUNNING", startedAt: new Date(), pending: { stage: "draft" } as object } },
    },
  });
  return doc.id;
}

/** SLOW: the actual generation — runs in the background (Next `after`), never blocks the user. */
export async function runReportGeneration(docId: string, input: GenerateReportInput): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: input.userId }, include: { institution: true } });
  if (!user) return;
  try {
    // Ask the real-world questions FIRST: a deterministic, report-type-specific intake
    // (company, role, mentor, PRN, …) merged with any AI-detected context gaps. These
    // answers both enrich the writing AND fill the template's cover-page placeholders,
    // so we collect them before spending a full generation. Only the interactive web flow
    // pauses for input — non-interactive callers (scripts, project bundles) generate straight through.
    if (input.interactive) {
    await setReportStage(docId, "review");
    const intake = intakeQuestions(input.reportType);
    const ctx = await withAiRetry(
      () => assessContext({
        task: "report",
        topic: input.title,
        context: input.guidelines,
        department: user.department ?? undefined,
      }),
      { label: "report.assess" },
    ).catch(() => ({ ready: true, questions: [] as ClarifyQuestion[] }));
    const questions = mergeQuestions(intake, ctx.ready ? [] : ctx.questions);

    if (questions.length > 0) {
      await prisma.document.update({ where: { id: docId }, data: { status: "NEEDS_INPUT" } });
      await prisma.generationJob.update({
        where: { documentId: docId },
        data: {
          status: "NEEDS_INPUT",
          pending: {
            questions,
            title: input.title,
            reportType: input.reportType,
            guidelines: input.guidelines ?? null,
            templateKey: input.templateKey ?? null,
          } as unknown as object,
        },
      });
      return;
    }
    } // end interactive question step

    // No questions needed (or non-interactive) — generate straight through.
    await setReportStage(docId, "draft");
    const produced = await withAiRetry(() => produceContent(user, input), { label: "report.produce" });
    if (produced.templateIdToSet) {
      await prisma.document.update({ where: { id: docId }, data: { templateId: produced.templateIdToSet } });
    }
    await setReportStage(docId, "format");
    // Persist the uploaded template key + fields to `inputRefs` (NOT `pending` — finalize() below
    // clears `pending`) so later in-app edits can still re-fill and re-render the original .docx.
    if (input.templateKey) {
      await prisma.generationJob.update({
        where: { documentId: docId },
        data: { inputRefs: { templateKey: input.templateKey, fields: input.fields ?? null } as unknown as object },
      });
    }
    await finalize(docId, user.id, produced);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.document.update({ where: { id: docId }, data: { status: "FAILED" } }).catch(() => {});
    await prisma.generationJob
      .update({ where: { documentId: docId }, data: { status: "FAILED", error: message, finishedAt: new Date() } })
      .catch(() => {});
  }
}

/** Flip an existing report to GENERATING (used by the resume action before backgrounding). Ownership-scoped — a no-op for a docId the caller doesn't own. */
export async function markReportGenerating(docId: string, userId: string): Promise<void> {
  const { count } = await prisma.document.updateMany({
    where: { id: docId, ownerId: userId },
    data: { status: "GENERATING" },
  });
  if (count === 0) return;
  await prisma.generationJob.update({ where: { documentId: docId }, data: { status: "RUNNING" } }).catch(() => {});
  await setReportStage(docId, "draft");
}

/** Synchronous create+run (kept for non-interactive callers / scripts). */
export async function generateAndStoreReport(input: GenerateReportInput): Promise<GenerateOutcome> {
  const docId = await createReportDoc(input);
  await runReportGeneration(docId, input);
  const doc = await prisma.document.findUnique({ where: { id: docId }, select: { status: true } });
  return { docId, status: doc?.status === "NEEDS_INPUT" ? "needs_input" : "ready" };
}

/** PPT → Report (#8.1): expand an existing deck into a written report (metered as a report). */
/** FAST: validate the PPT, create the REPORT doc (GENERATING), return its id so the action can
 *  redirect immediately. The heavy AI + render runs in the background via `runConvertedReport`. */
export async function createConvertedReportDoc(userId: string, pptDocId: string): Promise<{ docId: string }> {
  const ppt = await prisma.document.findFirst({
    where: { id: pptDocId, ownerId: userId, type: "PPT" },
    include: { content: true, owner: { include: { institution: true } } },
  });
  if (!ppt?.content) throw new Error("Presentation not found or has no content.");
  const slides = ((ppt.content.data as { slides?: { heading: string; bullets: string[] }[] }).slides) ?? [];
  if (slides.length === 0) throw new Error("This presentation has no slides to convert.");

  const user = ppt.owner;
  await assertWithinQuota(user, "REPORT");
  const workspace = await getOrCreateCurrentWorkspace(user);

  const doc = await prisma.document.create({
    data: {
      ownerId: user.id,
      type: "REPORT",
      title: ppt.title,
      status: "GENERATING",
      workspaceId: workspace.id,
      job: { create: { status: "RUNNING", startedAt: new Date(), pending: { stage: "draft" } as object } },
    },
  });
  return { docId: doc.id };
}

/** Synchronous create+run (kept for non-interactive callers / verify scripts). */
export async function convertPptToReport(userId: string, pptDocId: string): Promise<{ docId: string }> {
  const { docId } = await createConvertedReportDoc(userId, pptDocId);
  await runConvertedReport(docId, userId, pptDocId);
  return { docId };
}

/** SLOW: expand the PPT into a full report and finalize — runs in the background (Next `after`),
 *  so the request returns instantly and the report page shows the live generating poller. */
export async function runConvertedReport(reportDocId: string, userId: string, pptDocId: string): Promise<void> {
  try {
    const ppt = await prisma.document.findFirst({
      where: { id: pptDocId, ownerId: userId, type: "PPT" },
      include: { content: true, owner: { include: { institution: true } } },
    });
    if (!ppt?.content) throw new Error("Presentation not found or has no content.");
    const slides = ((ppt.content.data as { slides?: { heading: string; bullets: string[] }[] }).slides) ?? [];
    const user = ppt.owner;

    const template = await prisma.template.findFirst({ where: { type: "REPORT", isDefault: true } });
    if (!template) throw new Error("No default report template configured — run the template seed.");
    const student = defaultStudentFields(user);
    const gen = await withAiRetry(() => expandPptToReport({ title: ppt.title, reportType: "project", student, slides }), { label: "ppt-to-report" });
    await prisma.document.update({ where: { id: reportDocId }, data: { templateId: template.id } });
    await finalize(reportDocId, userId, {
      data: gen.content,
      model: gen.model,
      costCents: gen.costCents,
      render: async () => renderReportDocx(gen.content, await getObjectBuffer(template.storageKey)).buffer,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.document.update({ where: { id: reportDocId }, data: { status: "FAILED" } }).catch(() => {});
    await prisma.generationJob
      .update({ where: { documentId: reportDocId }, data: { status: "FAILED", error: message, finishedAt: new Date() } })
      .catch(() => {});
  }
}

type PendingState = {
  questions?: ClarifyQuestion[];
  title?: string;
  reportType?: string;
  guidelines?: string | null;
  templateKey?: string | null;
  fields?: PlaceholderFields;
};

/** Resume a NEEDS_INPUT report: fold the answers into context, regenerate, finish. */
export async function resumeReportGeneration(
  userId: string,
  docId: string,
  answers: Record<string, string>,
): Promise<string> {
  const doc = await prisma.document.findFirst({
    where: { id: docId, ownerId: userId, type: "REPORT" },
    include: { job: true },
  });
  // Accept GENERATING too: the action pre-flips status so the page shows progress immediately.
  if (!doc || (doc.status !== "NEEDS_INPUT" && doc.status !== "GENERATING")) throw new Error("This report isn't waiting for input.");

  const pending = (doc.job?.pending ?? {}) as PendingState;
  const extra = answersToContext(pending.questions ?? [], answers);
  const guidelines = [pending.guidelines ?? undefined, extra].filter(Boolean).join("\n") || undefined;
  // Structured values (company, role, PRN, …) that fill cover-page placeholders.
  const fields = fieldsFromAnswers(answers);

  await prisma.document.update({ where: { id: docId }, data: { status: "GENERATING" } });
  // Persist the collected fields so an in-browser edit can re-fill placeholders identically.
  await prisma.generationJob.update({
    where: { documentId: docId },
    data: { status: "RUNNING", pending: { ...pending, fields } as unknown as object },
  });
  await setReportStage(docId, "draft");

  const user = await prisma.user.findUnique({ where: { id: userId }, include: { institution: true } });
  if (!user) throw new Error("User not found.");

  try {
    const produced = await withAiRetry(
      () => produceContent(user, {
        userId,
        title: pending.title ?? doc.title,
        reportType: pending.reportType ?? "seminar",
        guidelines,
        templateKey: pending.templateKey ?? undefined,
        fields,
      }),
      { label: "report.resume" },
    );
    if (produced.templateIdToSet) {
      await prisma.document.update({ where: { id: docId }, data: { templateId: produced.templateIdToSet } });
    }
    await setReportStage(docId, "format");
    // Same durability requirement as runReportGeneration — see comment there.
    if (pending.templateKey) {
      await prisma.generationJob.update({
        where: { documentId: docId },
        data: { inputRefs: { templateKey: pending.templateKey, fields } as unknown as object },
      });
    }
    await finalize(docId, userId, produced);
    return docId;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.document.update({ where: { id: docId }, data: { status: "FAILED" } }).catch(() => {});
    await prisma.generationJob
      .update({ where: { documentId: docId }, data: { status: "FAILED", error: message, finishedAt: new Date() } })
      .catch(() => {});
    throw err;
  }
}

/**
 * Save in-browser edits to a report's text. Persists the edited content and re-renders the
 * DOCX in place (same deterministic export key, so the existing download link updates).
 * Re-render only runs for reports built on our default template (where we hold the buffer);
 * user-uploaded-template reports keep their existing DOCX and just save the edited text.
 */
export async function updateReportContent(userId: string, docId: string, data: ReportLike): Promise<{ reRendered: boolean }> {
  const doc = await prisma.document.findFirst({
    where: { id: docId, ownerId: userId, type: "REPORT" },
    include: { template: true, job: true, content: true, exports: { where: { format: "DOCX" }, take: 1 }, owner: { include: { institution: true } } },
  });
  if (!doc) throw new Error("Report not found.");

  // The editor's data model only round-trips {abstract, sections, references} — it has no
  // title/student fields at all — so those MUST be carried over from the stored content on every
  // save, or a default-format report loses them permanently and later crashes on figure approval
  // (ReportContentSchema requires title/student/abstract). Backfill from the profile if an earlier
  // save already dropped them. Merge field-by-field (not a spread) so `abstract: undefined` sent by
  // the editor doesn't clobber a previously-stored value.
  const stored = (doc.content?.data ?? null) as Partial<ReportContent> | null;
  const merged: ReportLike & Partial<ReportContent> = {
    title: stored?.title ?? doc.title,
    student: stored?.student ?? defaultStudentFields(doc.owner),
    abstract: data.abstract?.trim() || stored?.abstract?.trim() || "Abstract not yet provided.",
    references: data.references ?? stored?.references ?? [],
    sections: (data.sections ?? []).map((s) => {
      const prev = stored?.sections?.find((p) => p.heading === s.heading) ?? null;
      return prev?.image ? { ...s, image: prev.image, caption: prev.caption, imagePrompt: prev.imagePrompt } : s;
    }),
  };

  await prisma.documentContent.upsert({
    where: { documentId: docId },
    create: { documentId: docId, data: merged as unknown as object },
    update: { data: merged as unknown as object },
  });
  await prisma.document.update({ where: { id: docId }, data: { quality: analyzeReport(merged) } });

  const exportKey = doc.exports[0]?.storageKey ?? keys.exportFile(docId, "DOCX");
  const saveExport = async (buffer: Buffer) => {
    await putObject(exportKey, buffer, DOCX_MIME);
    if (doc.exports[0]) {
      await prisma.documentExport.update({ where: { id: doc.exports[0].id }, data: { sizeBytes: buffer.length } });
    } else {
      await prisma.documentExport.create({ data: { documentId: docId, format: "DOCX", storageKey: exportKey, sizeBytes: buffer.length } });
    }
  };

  // Default report → programmatic builder (embeds figures). Custom uploaded templates below.
  if (doc.template?.isDefault) {
    await saveExport(await renderDefaultReport(merged as unknown as ReportContent));
    return { reRendered: true };
  }
  if (doc.templateId && doc.template?.storageKey) {
    await saveExport(renderReportDocx(merged, await getObjectBuffer(doc.template.storageKey)).buffer);
    return { reRendered: true };
  }

  // User-uploaded-template report: re-fill the original .docx from the edited sections,
  // preserving the college format. The template key + collected fields live in `inputRefs`
  // (unlike `pending`, that field survives finalize() — see runReportGeneration/resumeReportGeneration).
  const inputRefs = (doc.job?.inputRefs ?? {}) as { templateKey?: string; fields?: PlaceholderFields };
  if (inputRefs.templateKey && data.sections && data.sections.length > 0) {
    const contentByHeading: Record<string, string> = {};
    for (const s of data.sections) contentByHeading[s.heading] = s.content;
    const { buffer } = fillTemplate(await getObjectBuffer(inputRefs.templateKey), contentByHeading, inputRefs.fields ?? {});
    await saveExport(buffer);
    return { reRendered: true };
  }

  return { reRendered: false };
}

// ----------------------- Report figures (suggest → approve → embed) -----------------------
// Figures are AI-generated images embedded into the DEFAULT report format. We PROPOSE figures
// (text only — no credits), the student approves each, and only then do we call the image model.

/** Re-render a default-format report and update its DOCX export in place. */
async function reRenderDefaultReportExport(
  docId: string,
  content: ReportContent,
  existingExport?: { id: string; storageKey: string } | null,
): Promise<void> {
  const buffer = await renderDefaultReport(content);
  const exportKey = existingExport?.storageKey ?? keys.exportFile(docId, "DOCX");
  await putObject(exportKey, buffer, DOCX_MIME);
  if (existingExport) await prisma.documentExport.update({ where: { id: existingExport.id }, data: { sizeBytes: buffer.length } });
  else await prisma.documentExport.create({ data: { documentId: docId, format: "DOCX", storageKey: exportKey, sizeBytes: buffer.length } });
}

/** Propose figures for a report (no image generated). Empty for custom-template reports. */
export async function getReportFigureSuggestions(userId: string, docId: string): Promise<FigureSuggestion[]> {
  const doc = await prisma.document.findFirst({ where: { id: docId, ownerId: userId, type: "REPORT" }, include: { content: true, template: true } });
  if (!doc?.content) return [];
  if (doc.template && !doc.template.isDefault) return []; // custom template can't embed figures
  const content = doc.content.data as unknown as ReportContent;
  const { figures, costCents } = await withAiRetry(() => suggestReportFigures({ title: content.title, sections: content.sections }), { label: "report.figures.suggest" });
  await addJobCostCents(docId, costCents);
  // Skip sections that already have an approved figure.
  return figures.filter((f) => f.sectionIndex < content.sections.length && !content.sections[f.sectionIndex]?.image);
}

/** Fill in title/student/abstract/references if an earlier save dropped them (see updateReportContent),
 *  so approving/removing a figure on an already-corrupted doc heals it instead of crashing on render. */
function backfillReportContent(raw: unknown, docTitle: string, owner: User & { institution?: { name: string } | null }): ReportContent {
  const data = raw as Partial<ReportContent>;
  return {
    title: data.title ?? docTitle,
    student: data.student ?? defaultStudentFields(owner),
    abstract: data.abstract?.trim() || "Abstract not yet provided.",
    sections: data.sections ?? [],
    references: data.references ?? [],
  };
}

/** Generate + embed an approved figure (the only step that spends image credits). */
export async function approveReportFigure(userId: string, docId: string, sectionIndex: number, imagePrompt: string, caption: string): Promise<{ ok: boolean; error?: string }> {
  const doc = await prisma.document.findFirst({ where: { id: docId, ownerId: userId, type: "REPORT" }, include: { content: true, template: true, exports: { where: { format: "DOCX" }, take: 1 }, owner: { include: { institution: true } } } });
  if (!doc?.content) return { ok: false, error: "Report not found." };
  const content = backfillReportContent(doc.content.data, doc.title, doc.owner);
  if (sectionIndex < 0 || sectionIndex >= content.sections.length) return { ok: false, error: "Invalid section." };

  const img = await generateSlideImage(imagePrompt, "1536x1024");
  if (!img) return { ok: false, error: "Image generation isn't available right now — try again." };
  await addJobCostCents(docId, img.costCents);
  const bytes = Buffer.from(img.dataUrl.split(",")[1] ?? "", "base64");
  const imageKey = `figures/${docId}/section-${sectionIndex}.png`;
  await putObject(imageKey, bytes, PNG_MIME);

  content.sections[sectionIndex] = { ...content.sections[sectionIndex], image: imageKey, caption, imagePrompt };
  await prisma.documentContent.update({ where: { documentId: docId }, data: { data: content as unknown as object } });
  await reRenderDefaultReportExport(docId, content, doc.exports[0]);
  return { ok: true };
}

/** Remove an embedded figure and re-render. */
export async function removeReportFigure(userId: string, docId: string, sectionIndex: number): Promise<{ ok: boolean }> {
  const doc = await prisma.document.findFirst({ where: { id: docId, ownerId: userId, type: "REPORT" }, include: { content: true, exports: { where: { format: "DOCX" }, take: 1 }, owner: { include: { institution: true } } } });
  if (!doc?.content) return { ok: false };
  const content = backfillReportContent(doc.content.data, doc.title, doc.owner);
  if (content.sections[sectionIndex]) {
    // Destructure-to-omit: strip these 4 fields, keep the rest — the discarded bindings are
    // intentional, not dead code.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { image: _i, caption: _c, imagePrompt: _p, imageWidthPct: _w, ...rest } = content.sections[sectionIndex];
    content.sections[sectionIndex] = rest;
  }
  await prisma.documentContent.update({ where: { documentId: docId }, data: { data: content as unknown as object } });
  await reRenderDefaultReportExport(docId, content, doc.exports[0]);
  return { ok: true };
}

/** Overwrite an approved figure's pixels in place (crop/pan/zoom done client-side) and re-render. */
export async function cropReportFigure(userId: string, docId: string, sectionIndex: number, pngDataUrl: string): Promise<{ ok: boolean; error?: string }> {
  const doc = await prisma.document.findFirst({ where: { id: docId, ownerId: userId, type: "REPORT" }, include: { content: true, exports: { where: { format: "DOCX" }, take: 1 }, owner: { include: { institution: true } } } });
  if (!doc?.content) return { ok: false, error: "Report not found." };
  const content = backfillReportContent(doc.content.data, doc.title, doc.owner);
  const section = content.sections[sectionIndex];
  if (!section?.image) return { ok: false, error: "No figure to crop." };

  const base64 = pngDataUrl.split(",")[1];
  if (!base64) return { ok: false, error: "Invalid image data." };
  await putObject(section.image, Buffer.from(base64, "base64"), PNG_MIME);
  await reRenderDefaultReportExport(docId, content, doc.exports[0]);
  return { ok: true };
}

/** Resize an approved figure (% of page width) and re-render. */
export async function resizeReportFigure(userId: string, docId: string, sectionIndex: number, widthPct: number): Promise<{ ok: boolean; error?: string }> {
  const doc = await prisma.document.findFirst({ where: { id: docId, ownerId: userId, type: "REPORT" }, include: { content: true, exports: { where: { format: "DOCX" }, take: 1 }, owner: { include: { institution: true } } } });
  if (!doc?.content) return { ok: false, error: "Report not found." };
  const content = backfillReportContent(doc.content.data, doc.title, doc.owner);
  const section = content.sections[sectionIndex];
  if (!section?.image) return { ok: false, error: "No figure to resize." };

  const pct = Math.min(100, Math.max(20, Math.round(widthPct)));
  content.sections[sectionIndex] = { ...section, imageWidthPct: pct };
  await prisma.documentContent.update({ where: { documentId: docId }, data: { data: content as unknown as object } });
  await reRenderDefaultReportExport(docId, content, doc.exports[0]);
  return { ok: true };
}

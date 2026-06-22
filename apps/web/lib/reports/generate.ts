import { prisma, type User } from "@studentos/db";
import { getObjectBuffer, putObject, keys } from "@studentos/storage";
import { renderReportDocx, inspectTemplate, fillTemplate, type PlaceholderFields } from "@studentos/documents";
import {
  generateReportContent,
  generateTemplateContent,
  expandPptToReport,
  assessContext,
  answersToContext,
  withAiRetry,
  type ClarifyQuestion,
} from "@studentos/ai";
import { assertWithinQuota, recordUsage } from "@/lib/entitlements";
import { getOrCreateCurrentWorkspace } from "@/lib/workspace";
import { analyzeReport, type ReportLike } from "@/lib/quality";
import { intakeQuestions } from "@/lib/reports/intake";

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

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
    return { data, model: gen.model, render: async () => fillTemplate(templateBuffer, gen.contentByHeading, fields).buffer };
  }

  const template = await prisma.template.findFirst({ where: { type: "REPORT", isDefault: true } });
  if (!template) throw new Error("No default report template configured — run the template seed.");
  const student = {
    name: user.name ?? "Student",
    roll: "—",
    department: user.department ?? "—",
    semester: user.semester ?? "—",
    college: user.institution?.name ?? "—",
    guide: "—",
  };
  const gen = await generateReportContent({
    title: input.title,
    reportType: input.reportType,
    guidelines: input.guidelines,
    student,
  });
  return {
    data: gen.content,
    model: gen.model,
    templateIdToSet: template.id,
    render: async () => renderReportDocx(gen.content, await getObjectBuffer(template.storageKey)).buffer,
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
      data: { status: "SUCCEEDED", model: produced.model, finishedAt: new Date(), pending: undefined },
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
    await finalize(docId, user.id, produced);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.document.update({ where: { id: docId }, data: { status: "FAILED" } }).catch(() => {});
    await prisma.generationJob
      .update({ where: { documentId: docId }, data: { status: "FAILED", error: message, finishedAt: new Date() } })
      .catch(() => {});
  }
}

/** Flip an existing report to GENERATING (used by the resume action before backgrounding). */
export async function markReportGenerating(docId: string): Promise<void> {
  await prisma.document.update({ where: { id: docId }, data: { status: "GENERATING" } }).catch(() => {});
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
    const student = {
      name: user.name ?? "Student",
      roll: "—",
      department: user.department ?? "—",
      semester: user.semester ?? "—",
      college: user.institution?.name ?? "—",
      guide: "—",
    };
    const gen = await withAiRetry(() => expandPptToReport({ title: ppt.title, reportType: "project", student, slides }), { label: "ppt-to-report" });
    await prisma.document.update({ where: { id: reportDocId }, data: { templateId: template.id } });
    await finalize(reportDocId, userId, {
      data: gen.content,
      model: gen.model,
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
    include: { template: true, job: true, exports: { where: { format: "DOCX" }, take: 1 } },
  });
  if (!doc) throw new Error("Report not found.");

  await prisma.documentContent.upsert({
    where: { documentId: docId },
    create: { documentId: docId, data: data as unknown as object },
    update: { data: data as unknown as object },
  });
  await prisma.document.update({ where: { id: docId }, data: { quality: analyzeReport(data) } });

  const exportKey = doc.exports[0]?.storageKey ?? keys.exportFile(docId, "DOCX");
  const saveExport = async (buffer: Buffer) => {
    await putObject(exportKey, buffer, DOCX_MIME);
    if (doc.exports[0]) {
      await prisma.documentExport.update({ where: { id: doc.exports[0].id }, data: { sizeBytes: buffer.length } });
    } else {
      await prisma.documentExport.create({ data: { documentId: docId, format: "DOCX", storageKey: exportKey, sizeBytes: buffer.length } });
    }
  };

  // Default-template report: re-render from structured data.
  if (doc.templateId && doc.template?.storageKey) {
    await saveExport(renderReportDocx(data, await getObjectBuffer(doc.template.storageKey)).buffer);
    return { reRendered: true };
  }

  // User-uploaded-template report: re-fill the original .docx from the edited sections,
  // preserving the college format. The template key + collected fields are carried on the job.
  const pending = (doc.job?.pending ?? {}) as { templateKey?: string; fields?: PlaceholderFields };
  if (pending.templateKey && data.sections && data.sections.length > 0) {
    const contentByHeading: Record<string, string> = {};
    for (const s of data.sections) contentByHeading[s.heading] = s.content;
    const { buffer } = fillTemplate(await getObjectBuffer(pending.templateKey), contentByHeading, pending.fields ?? {});
    await saveExport(buffer);
    return { reRendered: true };
  }

  return { reRendered: false };
}

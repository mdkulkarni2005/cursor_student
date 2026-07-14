import { prisma, type User } from "@studentos/db";
import { getObjectBuffer, putObject, keys } from "@studentos/storage";
import {
  renderPptx,
  inspectPptxTheme,
  fillPptxTemplate,
  inspectPptxStructure,
  fillPptxTemplateInPlace,
  resolvePptTheme,
  richToPlain,
  type PptxTheme,
  type PptxStructure,
  type PptContent,
} from "@studentos/documents";
import {
  generatePptContent,
  generatePptTemplateContent,
  generateSlideImage,
  slideImagePrompt,
  assessDraftGaps,
  answersToContext,
  withAiRetry,
  type ClarifyQuestion,
} from "@studentos/ai";
import { assertWithinQuota, recordUsage } from "@/lib/entitlements";
import { getOrCreateCurrentWorkspace } from "@/lib/workspace";
import { setJobStage } from "@/lib/jobs";

const PPTX_MIME =
  "application/vnd.openxmlformats-officedocument.presentationml.presentation";

export type GeneratePptInput = {
  userId: string;
  title: string;
  slideCount?: number;
  guidelines?: string;
  /** Optional: the user's own .pptx — we match its brand theme (colors + fonts). */
  templateKey?: string;
  /** Resume only: answers to the template's info-field questions (field label → value). */
  fieldAnswers?: Record<string, string>;
};

type Produced = {
  content: PptContent;
  model: string;
  costCents: number;
  theme?: PptxTheme;
  /** The user's template bytes — present only when a template was uploaded (enables layout cloning). */
  templateBuffer?: Buffer;
  /** Present for a STRUCTURED template (fill-in-place path): its detected slide roles. */
  structure?: PptxStructure;
  /** Info-table values to write (field label → value), for the structured path. */
  fieldValues?: Record<string, string>;
  /** Storage key of the uploaded .pptx — persisted so a later in-app edit can re-fill THIS template. */
  templateKey?: string;
  /** Unknown info-table fields we must ask the user about before finishing. */
  fieldQuestions?: ClarifyQuestion[];
};

function draftText(content: PptContent): string {
  return content.slides.map((s) => `${richToPlain(s.heading)} ${s.bullets.map(richToPlain).join(" ")}`).join("\n");
}

/** A clean, human label for an info-table field (drops trailing "of the internship" noise minimally). */
function fieldQuestionText(label: string): string {
  return `What is your "${label}"?`;
}

/** Derive a known info-field value from the topic/profile, or null if we must ask the user. */
function deriveFieldValue(
  label: string,
  input: GeneratePptInput,
  user: User & { institution: { name: string } | null },
): string | null {
  const l = label.toLowerCase();
  if (/title/.test(l)) return input.title;
  if (/\bname\b/.test(l) && !/company|organi[sz]ation|industry|guide|teacher|faculty|mentor/.test(l))
    return user.name ?? null;
  if (/branch|class|department/.test(l)) return user.department ?? null;
  return null; // PRN, Roll No., Duration/dates, LG Teacher, … → ask.
}

/** Build the structured deck: content keyed to the template's own sections + resolved info fields. */
async function produceStructured(
  user: User & { institution: { name: string } | null },
  input: GeneratePptInput,
  subtitle: string,
  templateBuffer: Buffer,
  theme: PptxTheme,
  structure: PptxStructure,
): Promise<Produced> {
  const sections = structure.slides
    .filter((s): s is Extract<PptxStructure["slides"][number], { kind: "section" }> => s.kind === "section")
    .map((s) => ({ heading: s.heading, instruction: s.instruction }));

  const { contentByHeading, model, costCents } = await withAiRetry(
    () =>
      generatePptTemplateContent({
        topic: input.title,
        subtitle,
        department: user.department ?? "—",
        sections,
        guidelines: input.guidelines,
      }),
    { label: "ppt.template" },
  );

  // Content.data mirrors the template's true sections so the in-app preview matches the file.
  // Templates own their layout — fill them as plain bullet sections (do not impose our layouts).
  const slides = sections.map((s) => ({
    layout: "bullets" as const,
    heading: s.heading,
    bullets: contentByHeading[s.heading] ?? ["(content pending)"],
  }));
  const content: PptContent = { title: input.title, subtitle, slides };

  // Resolve info-table fields: fill what we know, ask for the rest.
  const fieldValues: Record<string, string> = {};
  const fieldQuestions: ClarifyQuestion[] = [];
  for (const slide of structure.slides) {
    if (slide.kind !== "metadata") continue;
    for (const f of slide.fields) {
      if (!f.isPlaceholder) continue; // already filled in the template — leave it.
      const answered = input.fieldAnswers?.[f.label];
      if (answered) {
        fieldValues[f.label] = answered;
        continue;
      }
      const derived = deriveFieldValue(f.label, input, user);
      if (derived) fieldValues[f.label] = derived;
      else
        fieldQuestions.push({
          id: `field:${f.label}`,
          question: fieldQuestionText(f.label),
          type: "text",
          options: [],
        });
    }
  }

  return { content, model, costCents, theme, templateBuffer, structure, fieldValues, fieldQuestions, templateKey: input.templateKey };
}

/** Generate the deck content (no rendering yet), plus the user's theme if a template was given. */
async function produceContent(
  user: User & { institution: { name: string } | null },
  input: GeneratePptInput,
): Promise<Produced> {
  const subtitle = [user.name ?? "Student", user.department, user.institution?.name]
    .filter(Boolean)
    .join(" · ");

  let theme: PptxTheme | undefined;
  let templateBuffer: Buffer | undefined;
  if (input.templateKey) {
    templateBuffer = await getObjectBuffer(input.templateKey);
    theme = inspectPptxTheme(templateBuffer);
    if (!theme.ok) throw new Error(theme.issues[0] ?? "We couldn't read that PowerPoint template.");

    // STRUCTURED template (info table / fixed sections): keep its exact slides and fill in place,
    // steering content by the template's own per-section instructions. This is the faithful path.
    const structure = inspectPptxStructure(templateBuffer);
    if (structure.ok && structure.structured) {
      return produceStructured(user, input, subtitle, templateBuffer, theme, structure);
    }
    // Otherwise it's a theme-only design deck — fall through to a generic deck + clone/theme render.
  }

  const { content, model, costCents } = await withAiRetry(() => generatePptContent({
    title: input.title,
    subtitle,
    department: user.department ?? "—",
    slideCount: input.slideCount,
    guidelines: input.guidelines,
  }), { label: "ppt.generate" });

  // Images are generated in finalize() (once content is truly final — see comment there), not
  // here: this function can run again on resume after a NEEDS_INPUT pause, and generating here
  // would waste an image-model call on a draft that gets thrown away.
  return { content, model, costCents, theme, templateBuffer };
}

/** Persist the resolved render theme alongside the content so the in-app canvas renders
 *  brand-approximate (it can't re-read the uploaded .pptx) — the exact colors/fonts the file used.
 *  `templated` marks decks bound to an uploaded .pptx (in-app editing is disabled for those so an
 *  edit can't silently abandon the user's template; they download to edit in PowerPoint). */
function contentWithTheme(produced: Produced): object {
  return {
    ...produced.content,
    theme: resolvePptTheme(produced.theme),
    templated: !!produced.templateBuffer,
    // Structured-template decks only: persist the link + filled info-table values so the in-app
    // editor can re-fill THIS template on save (never a generic deck) without losing identity data.
    ...(produced.structure?.structured
      ? { templateKey: produced.templateKey, fieldValues: produced.fieldValues ?? {} }
      : {}),
  };
}

/**
 * Re-render a (from-scratch) deck's .pptx from edited content and replace the stored export — used
 * by the in-app editor's Save. Resolves each slide's persisted image key back to bytes so images
 * survive the re-render. Templated decks don't use this (editing is disabled for them).
 */
export async function rerenderPptExport(docId: string, content: PptContent): Promise<void> {
  const images = await Promise.all(
    content.slides.map(async (s) => {
      if (!s.image) return null;
      try {
        const buf = await getObjectBuffer(s.image);
        return `data:image/png;base64,${buf.toString("base64")}`;
      } catch {
        return null;
      }
    }),
  );
  const buffer = (await renderPptx(content, undefined, images)).buffer;
  const exportKey = keys.exportFile(docId, "PPTX");
  await putObject(exportKey, buffer, PPTX_MIME);
  const data = { ...content, theme: content.theme ?? resolvePptTheme(undefined), templated: false };
  await prisma.$transaction([
    prisma.documentContent.upsert({
      where: { documentId: docId },
      create: { documentId: docId, data: data as unknown as object },
      update: { data: data as unknown as object },
    }),
    prisma.documentExport.deleteMany({ where: { documentId: docId, format: "PPTX" } }),
    prisma.documentExport.create({
      data: { documentId: docId, format: "PPTX", storageKey: exportKey, sizeBytes: buffer.length },
    }),
  ]);
}

/** Render + persist a finished deck (READY). Used by first-pass and resume. */
async function finalize(docId: string, userId: string, produced: Produced): Promise<void> {
  // Generate images ONLY for slides the model marked `layout: "image"`, and ONLY here — content is
  // truly final at this point (produceContent can re-run on a NEEDS_INPUT resume with different
  // slides, so generating there would waste an image-model call on a draft that gets discarded).
  // Templates keep their own design and skip generated images.
  const images: (string | null)[] = produced.content.slides.map(() => null);
  let imageCostCentsTotal = 0;
  if (!produced.templateBuffer) {
    await Promise.all(
      produced.content.slides.map(async (s, i) => {
        if (s.layout !== "image") return;
        const img = await generateSlideImage(slideImagePrompt(richToPlain(s.heading) || produced.content.title, produced.content.title));
        if (!img) return;
        imageCostCentsTotal += img.costCents;
        const m = /^data:(image\/[a-z0-9.+-]+);base64,(.*)$/i.exec(img.dataUrl);
        if (!m) return;
        const key = keys.slideImage(docId, i);
        await putObject(key, Buffer.from(m[2]!, "base64"), m[1]!);
        s.image = key;
        images[i] = img.dataUrl;
      }),
    );
  }

  // With a template: try EXACT layout cloning; use it only if the integrity guard passes,
  // else fall back to the known-good theme renderer (still their brand colors/fonts).
  let buffer: Buffer;
  if (produced.templateBuffer && produced.structure?.structured) {
    // Structured template → FILL IN PLACE: keep every slide, write sections + info fields.
    const contentByHeading: Record<string, string[]> = {};
    for (const s of produced.content.slides) contentByHeading[richToPlain(s.heading)] = s.bullets.map(richToPlain);
    const filled = fillPptxTemplateInPlace(
      produced.templateBuffer,
      produced.structure,
      contentByHeading,
      produced.fieldValues ?? {},
    );
    buffer = filled.ok && filled.buffer ? filled.buffer : (await renderPptx(produced.content, produced.theme)).buffer;
  } else if (produced.templateBuffer) {
    // Theme-only design deck → try EXACT layout cloning; else the known-good theme renderer.
    const cloneContent = {
      title: produced.content.title,
      subtitle: produced.content.subtitle,
      slides: produced.content.slides.map((s) => ({ heading: richToPlain(s.heading), bullets: s.bullets.map(richToPlain) })),
    };
    const clone = fillPptxTemplate(produced.templateBuffer, cloneContent);
    buffer = clone.ok && clone.buffer ? clone.buffer : (await renderPptx(produced.content, produced.theme)).buffer;
  } else {
    buffer = (await renderPptx(produced.content, produced.theme, images)).buffer;
  }

  const content = contentWithTheme(produced);
  const exportKey = keys.exportFile(docId, "PPTX");
  await putObject(exportKey, buffer, PPTX_MIME);
  await prisma.$transaction([
    prisma.documentContent.upsert({
      where: { documentId: docId },
      create: { documentId: docId, data: content as unknown as object },
      update: { data: content as unknown as object },
    }),
    prisma.documentExport.create({
      data: { documentId: docId, format: "PPTX", storageKey: exportKey, sizeBytes: buffer.length },
    }),
    prisma.document.update({ where: { id: docId }, data: { status: "READY" } }),
    prisma.generationJob.update({
      where: { documentId: docId },
      data: { status: "SUCCEEDED", model: produced.model, finishedAt: new Date(), pending: undefined, costCents: { increment: produced.costCents + imageCostCentsTotal } },
    }),
  ]);
  await recordUsage(userId, "PPT", docId);
}

export type GeneratePptOutcome = { docId: string; status: "ready" | "needs_input" };

/** Ordered, user-facing PPT generation stages — shown live on the deck page while generating. */
export const PPT_STAGES = [
  { key: "draft", label: "Drafting your slides" },
  { key: "review", label: "Checking for missing details" },
  { key: "format", label: "Designing & finalizing" },
] as const;

/** FAST: create the deck doc (GENERATING) so the action can redirect immediately. */
export async function createPptDoc(input: GeneratePptInput): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: input.userId }, include: { institution: true } });
  if (!user) throw new Error("User not found.");
  await assertWithinQuota(user, "PPT");
  const workspace = await getOrCreateCurrentWorkspace(user);
  const doc = await prisma.document.create({
    data: {
      ownerId: user.id,
      type: "PPT",
      title: input.title,
      status: "GENERATING",
      workspaceId: workspace.id,
      job: { create: { status: "RUNNING", startedAt: new Date(), pending: { stage: "draft" } as object } },
    },
  });
  return doc.id;
}

/** SLOW: generate the deck — runs in the background (Next `after`), never blocks the user. */
export async function runPptGeneration(docId: string, input: GeneratePptInput): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: input.userId }, include: { institution: true } });
  if (!user) return;
  try {
    await setJobStage(docId, "draft");
    const produced = await produceContent(user, input);

    // STRUCTURED template: the template owns the structure, so don't ask topic-gap questions —
    // only ask for the info-table fields we couldn't derive (PRN, Roll No., dates, LG Teacher).
    if (produced.structure?.structured) {
      await setJobStage(docId, "review");
      if (produced.fieldQuestions && produced.fieldQuestions.length > 0) {
        await prisma.documentContent.upsert({
          where: { documentId: docId },
          create: { documentId: docId, data: contentWithTheme(produced) },
          update: { data: contentWithTheme(produced) },
        });
        await prisma.document.update({ where: { id: docId }, data: { status: "NEEDS_INPUT" } });
        await prisma.generationJob.update({
          where: { documentId: docId },
          data: {
            status: "NEEDS_INPUT",
            model: produced.model,
            pending: {
              questions: produced.fieldQuestions,
              title: input.title,
              slideCount: input.slideCount ?? null,
              guidelines: input.guidelines ?? null,
              templateKey: input.templateKey ?? null,
            } as unknown as object,
          },
        });
        return;
      }
      await setJobStage(docId, "format");
      await finalize(docId, user.id, produced);
      return;
    }

    await setJobStage(docId, "review");
    const gaps = await withAiRetry(() => assessDraftGaps({
      task: "presentation",
      topic: input.title,
      context: input.guidelines,
      draft: draftText(produced.content),
      department: user.department ?? undefined,
    }), { label: "ppt.gaps" });

    if (!gaps.ready && gaps.questions.length > 0) {
      await prisma.documentContent.upsert({
        where: { documentId: docId },
        create: { documentId: docId, data: produced.content as unknown as object },
        update: { data: produced.content as unknown as object },
      });
      await prisma.document.update({ where: { id: docId }, data: { status: "NEEDS_INPUT" } });
      await prisma.generationJob.update({
        where: { documentId: docId },
        data: {
          status: "NEEDS_INPUT",
          model: produced.model,
          pending: {
            questions: gaps.questions,
            title: input.title,
            slideCount: input.slideCount ?? null,
            guidelines: input.guidelines ?? null,
            templateKey: input.templateKey ?? null,
          } as unknown as object,
        },
      });
      return;
    }

    await setJobStage(docId, "format");
    await finalize(docId, user.id, produced);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.document.update({ where: { id: docId }, data: { status: "FAILED" } }).catch(() => {});
    await prisma.generationJob
      .update({ where: { documentId: docId }, data: { status: "FAILED", error: message, finishedAt: new Date() } })
      .catch(() => {});
  }
}

/** Mark an existing deck as GENERATING (resume action, before backgrounding). Ownership-scoped — a no-op for a docId the caller doesn't own. */
export async function markPptGenerating(docId: string, userId: string): Promise<void> {
  const { count } = await prisma.document.updateMany({
    where: { id: docId, ownerId: userId },
    data: { status: "GENERATING" },
  });
  if (count === 0) return;
  await prisma.generationJob.update({ where: { documentId: docId }, data: { status: "RUNNING" } }).catch(() => {});
  await setJobStage(docId, "draft");
}

/** Synchronous create+run (kept for non-interactive callers / scripts). */
export async function generateAndStorePpt(input: GeneratePptInput): Promise<GeneratePptOutcome> {
  const docId = await createPptDoc(input);
  await runPptGeneration(docId, input);
  const doc = await prisma.document.findUnique({ where: { id: docId }, select: { status: true } });
  return { docId, status: doc?.status === "NEEDS_INPUT" ? "needs_input" : "ready" };
}

type PendingState = {
  questions?: ClarifyQuestion[];
  title?: string;
  slideCount?: number | null;
  guidelines?: string | null;
  templateKey?: string | null;
};

/** Resume a NEEDS_INPUT deck: fold the answers into context, regenerate, finish. */
export async function resumePptGeneration(
  userId: string,
  docId: string,
  answers: Record<string, string>,
): Promise<string> {
  const doc = await prisma.document.findFirst({
    where: { id: docId, ownerId: userId, type: "PPT" },
    include: { job: true },
  });
  if (!doc || (doc.status !== "NEEDS_INPUT" && doc.status !== "GENERATING")) throw new Error("This presentation isn't waiting for input.");

  const pending = (doc.job?.pending ?? {}) as PendingState;

  // Info-table field answers (id `field:<label>`) fill the template's table; everything else is
  // topic context folded into guidelines.
  const fieldAnswers: Record<string, string> = {};
  for (const [id, value] of Object.entries(answers)) {
    if (id.startsWith("field:") && value.trim()) fieldAnswers[id.slice("field:".length)] = value.trim();
  }
  const topicQuestions = (pending.questions ?? []).filter((q) => !q.id.startsWith("field:"));
  const extra = answersToContext(topicQuestions, answers);
  const guidelines = [pending.guidelines ?? undefined, extra].filter(Boolean).join("\n") || undefined;

  await prisma.document.update({ where: { id: docId }, data: { status: "GENERATING" } });
  await prisma.generationJob.update({ where: { documentId: docId }, data: { status: "RUNNING" } });
  await setJobStage(docId, "draft");

  const user = await prisma.user.findUnique({ where: { id: userId }, include: { institution: true } });
  if (!user) throw new Error("User not found.");

  try {
    const produced = await produceContent(user, {
      userId,
      title: pending.title ?? doc.title,
      slideCount: pending.slideCount ?? undefined,
      guidelines,
      templateKey: pending.templateKey ?? undefined,
      fieldAnswers: Object.keys(fieldAnswers).length ? fieldAnswers : undefined,
    });
    await setJobStage(docId, "format");
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

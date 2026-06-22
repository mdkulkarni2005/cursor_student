import { prisma, type User } from "@studentos/db";
import { getObjectBuffer, putObject, keys } from "@studentos/storage";
import { renderPptx, inspectPptxTheme, fillPptxTemplate, type PptxTheme, type PptContent } from "@studentos/documents";
import {
  generatePptContent,
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
};

type Produced = {
  content: PptContent;
  model: string;
  theme?: PptxTheme;
  /** Per-slide images (data URLs), aligned to content.slides. Empty/undefined = text-only. */
  images?: (string | null)[];
  /** The user's template bytes — present only when a template was uploaded (enables layout cloning). */
  templateBuffer?: Buffer;
};

function draftText(content: PptContent): string {
  return content.slides.map((s) => `${s.heading} ${s.bullets.join(" ")}`).join("\n");
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
  }

  const { content, model } = await withAiRetry(() => generatePptContent({
    title: input.title,
    subtitle,
    department: user.department ?? "—",
    slideCount: input.slideCount,
    guidelines: input.guidelines,
  }), { label: "ppt.generate" });

  // Generated visuals are only for the from-scratch deck. With a template we clone the user's
  // exact layout (their design is the point) and skip generated images.
  const images = templateBuffer
    ? undefined
    : await Promise.all(
        content.slides.map((s) => generateSlideImage(slideImagePrompt(s.heading, input.title))),
      ).then((imgs) => imgs.map((im) => im?.dataUrl ?? null));

  return { content, model, theme, images, templateBuffer };
}

/** Render + persist a finished deck (READY). Used by first-pass and resume. */
async function finalize(docId: string, userId: string, produced: Produced): Promise<void> {
  // With a template: try EXACT layout cloning; use it only if the integrity guard passes,
  // else fall back to the known-good theme renderer (still their brand colors/fonts).
  let buffer: Buffer;
  if (produced.templateBuffer) {
    const clone = fillPptxTemplate(produced.templateBuffer, produced.content);
    buffer = clone.ok && clone.buffer ? clone.buffer : (await renderPptx(produced.content, produced.theme)).buffer;
  } else {
    buffer = (await renderPptx(produced.content, produced.theme, produced.images)).buffer;
  }
  const exportKey = keys.exportFile(docId, "PPTX");
  await putObject(exportKey, buffer, PPTX_MIME);
  await prisma.$transaction([
    prisma.documentContent.upsert({
      where: { documentId: docId },
      create: { documentId: docId, data: produced.content as unknown as object },
      update: { data: produced.content as unknown as object },
    }),
    prisma.documentExport.create({
      data: { documentId: docId, format: "PPTX", storageKey: exportKey, sizeBytes: buffer.length },
    }),
    prisma.document.update({ where: { id: docId }, data: { status: "READY" } }),
    prisma.generationJob.update({
      where: { documentId: docId },
      data: { status: "SUCCEEDED", model: produced.model, finishedAt: new Date(), pending: undefined },
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

/** Mark an existing deck as GENERATING (resume action, before backgrounding). */
export async function markPptGenerating(docId: string): Promise<void> {
  await prisma.document.update({ where: { id: docId }, data: { status: "GENERATING" } }).catch(() => {});
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
  const extra = answersToContext(pending.questions ?? [], answers);
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

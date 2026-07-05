import { prisma } from "@studentos/db";
import { getObjectBuffer } from "@studentos/storage";
import { generateDrawingViva, withAiRetry } from "@studentos/ai";
import { assertWithinQuota, recordUsage } from "@/lib/entitlements";
import { getOrCreateCurrentWorkspace } from "@/lib/workspace";
import { setJobStage } from "@/lib/jobs";

export type CreateDrawingVivaInput = {
  userId: string;
  title: string;
  instructions?: string;
  uploadKey: string;
  uploadMime: string;
};

export const DRAWING_VIVA_STAGES = [
  { key: "draft", label: "Analyzing your drawing" },
] as const;

/** FAST: create the doc (GENERATING) + a linked Upload row (so regenerate can reuse the image). */
export async function createDrawingVivaDoc(input: CreateDrawingVivaInput): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!user) throw new Error("User not found.");
  await assertWithinQuota(user, "BRANCH_SOLVER");
  const workspace = await getOrCreateCurrentWorkspace(user);
  const doc = await prisma.document.create({
    data: {
      ownerId: user.id,
      type: "DRAWING_VIVA",
      feature: "drawing-viva",
      title: input.title,
      status: "GENERATING",
      workspaceId: workspace.id,
      job: { create: { status: "RUNNING", startedAt: new Date(), pending: { stage: "draft" } as object } },
      uploads: { create: { ownerId: user.id, storageKey: input.uploadKey, mime: input.uploadMime, sizeBytes: 0, kind: "PHOTO" } },
    },
  });
  return doc.id;
}

/** SLOW: generate the viva set — runs in the background, never blocks the user. */
export async function runDrawingVivaGeneration(docId: string, input: CreateDrawingVivaInput): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!user) return;
  try {
    await setJobStage(docId, "draft");
    const bytes = await getObjectBuffer(input.uploadKey);
    const { content, model } = await withAiRetry(() => generateDrawingViva({
      instructions: input.instructions,
      subject: user.department ?? undefined,
      image: { data: new Uint8Array(bytes), mediaType: input.uploadMime },
    }), { label: "drawing-viva.generate" });

    await prisma.$transaction([
      prisma.vivaSet.upsert({
        where: { documentId: docId },
        create: { documentId: docId, questions: content.questions as unknown as object },
        update: { questions: content.questions as unknown as object },
      }),
      prisma.document.update({ where: { id: docId }, data: { status: "READY" } }),
      prisma.generationJob.update({ where: { documentId: docId }, data: { status: "SUCCEEDED", model, finishedAt: new Date() } }),
    ]);

    await recordUsage(user.id, "BRANCH_SOLVER", docId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.document.update({ where: { id: docId }, data: { status: "FAILED" } }).catch(() => {});
    await prisma.generationJob
      .update({ where: { documentId: docId }, data: { status: "FAILED", error: message, finishedAt: new Date() } })
      .catch(() => {});
  }
}

/** Regenerate from the same uploaded drawing (mirrors the existing /viva "Regenerate" action). */
export async function regenerateDrawingViva(userId: string, docId: string): Promise<void> {
  const doc = await prisma.document.findFirst({
    where: { id: docId, ownerId: userId, type: "DRAWING_VIVA" },
    include: { uploads: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  const upload = doc?.uploads[0];
  if (!doc || !upload) throw new Error("Original drawing not found.");

  await prisma.document.update({ where: { id: docId }, data: { status: "GENERATING" } });
  await runDrawingVivaGeneration(docId, {
    userId,
    title: doc.title,
    uploadKey: upload.storageKey,
    uploadMime: upload.mime,
  });
}

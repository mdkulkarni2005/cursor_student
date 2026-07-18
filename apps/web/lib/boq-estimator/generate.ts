import { prisma } from "@studentos/db";
import { getObjectBuffer, putObject, keys } from "@studentos/storage";
import { renderBoqDocx, type BOQEstimate } from "@studentos/documents";
import { generateBoqEstimate, boqFollowUp, withAiRetry, type BOQTurn } from "@studentos/ai";
import { assertWithinQuota, assertWithinCostBudget, recordUsage } from "@/lib/entitlements";
import { getOrCreateCurrentWorkspace } from "@/lib/workspace";
import { setJobStage, addJobCostCents } from "@/lib/jobs";

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

type BOQData = BOQEstimate & { conversation?: BOQTurn[] };

export type GenerateBOQInput = {
  userId: string;
  title: string;
  dimensionsText?: string;
  instructions?: string;
  uploadKey?: string;
  uploadMime?: string;
};

export const BOQ_STAGES = [
  { key: "draft", label: "Estimating quantities" },
  { key: "format", label: "Formatting & finalizing" },
] as const;

export async function createBoqDoc(input: GenerateBOQInput): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!user) throw new Error("User not found.");
  await assertWithinQuota(user, "BRANCH_SOLVER");
  const workspace = await getOrCreateCurrentWorkspace(user);
  const doc = await prisma.document.create({
    data: {
      ownerId: user.id,
      type: "BRANCH_SOLVER",
      feature: "boq-estimator",
      title: input.title,
      status: "GENERATING",
      workspaceId: workspace.id,
      job: { create: { status: "RUNNING", startedAt: new Date(), pending: { stage: "draft" } as object } },
    },
  });
  return doc.id;
}

export async function runBoqGeneration(docId: string, input: GenerateBOQInput): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!user) return;
  try {
    await setJobStage(docId, "draft");
    let image: { data: Uint8Array; mediaType: string } | undefined;
    if (input.uploadKey && input.uploadMime?.startsWith("image/")) {
      const bytes = await getObjectBuffer(input.uploadKey);
      image = { data: new Uint8Array(bytes), mediaType: input.uploadMime };
    }

    const { estimate, model, costCents } = await withAiRetry(() => generateBoqEstimate({
      dimensionsText: input.dimensionsText,
      instructions: input.instructions,
      subject: user.department ?? undefined,
      image,
    }), { label: "boq.estimate" });

    await setJobStage(docId, "format");
    const { buffer } = await renderBoqDocx(estimate, { title: input.title });
    const exportKey = keys.exportFile(docId, "DOCX");
    await putObject(exportKey, buffer, DOCX_MIME);

    await prisma.$transaction([
      prisma.documentContent.create({ data: { documentId: docId, data: estimate as unknown as object } }),
      prisma.documentExport.create({
        data: { documentId: docId, format: "DOCX", storageKey: exportKey, sizeBytes: buffer.length },
      }),
      prisma.document.update({ where: { id: docId }, data: { status: "READY" } }),
      prisma.generationJob.update({
        where: { documentId: docId },
        data: { status: "SUCCEEDED", model, finishedAt: new Date(), costCents: { increment: costCents } },
      }),
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

export async function getBoqDoc(userId: string, docId: string): Promise<{ title: string; data: BOQData } | null> {
  const doc = await prisma.document.findFirst({
    where: { id: docId, ownerId: userId, type: "BRANCH_SOLVER", feature: "boq-estimator" },
    include: { content: true },
  });
  if (!doc?.content) return null;
  return { title: doc.title, data: doc.content.data as unknown as BOQData };
}

export async function addBoqTurn(userId: string, docId: string, message: string): Promise<BOQData> {
  const text = message.trim();
  if (!text) throw new Error("Type a message first.");

  const lock = await prisma.document.updateMany({
    where: { id: docId, ownerId: userId, type: "BRANCH_SOLVER", feature: "boq-estimator", status: "READY" },
    data: { status: "GENERATING" },
  });
  if (lock.count === 0) throw new Error("This is busy — try again in a moment.");

  try {
    const loaded = await getBoqDoc(userId, docId);
    if (!loaded) throw new Error("Estimate not found.");
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("Estimate not found.");
    await assertWithinCostBudget(user);
    const { conversation = [], ...estimate } = loaded.data;

    const { result, costCents } = await withAiRetry(() => boqFollowUp({
      estimate: estimate as BOQEstimate,
      conversation,
      message: text,
      subject: user?.department ?? undefined,
    }), { label: "boq.followup" });
    await addJobCostCents(docId, costCents);

    const nextConversation: BOQTurn[] = [
      ...conversation,
      { speaker: "student", content: text },
      { speaker: "tutor", content: result.reply },
    ];
    const nextEstimate = result.revisedEstimate ?? (estimate as BOQEstimate);
    const nextData: BOQData = { ...nextEstimate, conversation: nextConversation };

    if (result.revisedEstimate) {
      const { buffer } = await renderBoqDocx(nextEstimate, { title: loaded.title });
      const exportKey = keys.exportFile(docId, "DOCX");
      await putObject(exportKey, buffer, DOCX_MIME);
      await prisma.documentExport.deleteMany({ where: { documentId: docId, format: "DOCX" } });
      await prisma.documentExport.create({ data: { documentId: docId, format: "DOCX", storageKey: exportKey, sizeBytes: buffer.length } });
    }
    await prisma.documentContent.update({ where: { documentId: docId }, data: { data: nextData as unknown as object } });
    return nextData;
  } finally {
    await prisma.document.update({ where: { id: docId }, data: { status: "READY" } }).catch(() => {});
  }
}

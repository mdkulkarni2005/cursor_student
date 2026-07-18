import { prisma } from "@studentos/db";
import { getObjectBuffer, putObject, keys } from "@studentos/storage";
import { renderAssignmentDocx, type AssignmentSolution } from "@studentos/documents";
import { generateBranchSolverSolution, branchSolverFollowUp, withAiRetry, type BranchSolverTurn } from "@studentos/ai";
import { assertWithinQuota, assertWithinCostBudget, recordUsage } from "@/lib/entitlements";
import { getOrCreateCurrentWorkspace } from "@/lib/workspace";
import { setJobStage, addJobCostCents } from "@/lib/jobs";

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

type BranchSolverData = AssignmentSolution & { conversation?: BranchSolverTurn[] };

export type GenerateBranchSolverInput = {
  userId: string;
  feature: string;
  title: string;
  questionText?: string;
  instructions?: string;
  uploadKey?: string;
  uploadMime?: string;
};

export const BRANCH_SOLVER_STAGES = [
  { key: "draft", label: "Solving" },
  { key: "format", label: "Formatting & finalizing" },
] as const;

export async function createBranchSolverDoc(input: GenerateBranchSolverInput): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!user) throw new Error("User not found.");
  await assertWithinQuota(user, "BRANCH_SOLVER");
  const workspace = await getOrCreateCurrentWorkspace(user);
  const doc = await prisma.document.create({
    data: {
      ownerId: user.id,
      type: "BRANCH_SOLVER",
      feature: input.feature,
      title: input.title,
      status: "GENERATING",
      workspaceId: workspace.id,
      job: { create: { status: "RUNNING", startedAt: new Date(), pending: { stage: "draft" } as object } },
    },
  });
  return doc.id;
}

export async function runBranchSolverGeneration(docId: string, input: GenerateBranchSolverInput): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!user) return;
  try {
    await setJobStage(docId, "draft");
    let image: { data: Uint8Array; mediaType: string } | undefined;
    if (input.uploadKey && input.uploadMime?.startsWith("image/")) {
      const bytes = await getObjectBuffer(input.uploadKey);
      image = { data: new Uint8Array(bytes), mediaType: input.uploadMime };
    }

    const { solution, model, costCents } = await withAiRetry(() => generateBranchSolverSolution({
      feature: input.feature,
      questionText: input.questionText,
      instructions: input.instructions,
      subject: user.department ?? undefined,
      image,
    }), { label: `branch-solver.${input.feature}` });

    await setJobStage(docId, "format");
    const { buffer } = await renderAssignmentDocx(solution, { title: input.title });
    const exportKey = keys.exportFile(docId, "DOCX");
    await putObject(exportKey, buffer, DOCX_MIME);

    await prisma.$transaction([
      prisma.documentContent.create({ data: { documentId: docId, data: solution as unknown as object } }),
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

export async function getBranchSolverDoc(
  userId: string,
  docId: string,
): Promise<{ title: string; feature: string | null; data: BranchSolverData } | null> {
  const doc = await prisma.document.findFirst({
    where: { id: docId, ownerId: userId, type: "BRANCH_SOLVER" },
    include: { content: true },
  });
  if (!doc?.content) return null;
  return { title: doc.title, feature: doc.feature, data: doc.content.data as unknown as BranchSolverData };
}

export async function addBranchSolverTurn(userId: string, docId: string, message: string): Promise<BranchSolverData> {
  const text = message.trim();
  if (!text) throw new Error("Type a message first.");

  const lock = await prisma.document.updateMany({
    where: { id: docId, ownerId: userId, type: "BRANCH_SOLVER", status: "READY" },
    data: { status: "GENERATING" },
  });
  if (lock.count === 0) throw new Error("This is busy — try again in a moment.");

  try {
    const loaded = await getBranchSolverDoc(userId, docId);
    if (!loaded) throw new Error("Document not found.");
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("Document not found.");
    await assertWithinCostBudget(user);
    const { conversation = [], ...solution } = loaded.data;

    const { result, costCents } = await withAiRetry(() => branchSolverFollowUp({
      feature: loaded.feature ?? "",
      solution: solution as AssignmentSolution,
      conversation,
      message: text,
      subject: user?.department ?? undefined,
    }), { label: "branch-solver.followup" });
    await addJobCostCents(docId, costCents);

    const nextConversation: BranchSolverTurn[] = [
      ...conversation,
      { speaker: "student", content: text },
      { speaker: "tutor", content: result.reply },
    ];
    const nextSolution = result.revisedSolution ?? (solution as AssignmentSolution);
    const nextData: BranchSolverData = { ...nextSolution, conversation: nextConversation };

    if (result.revisedSolution) {
      const { buffer } = await renderAssignmentDocx(nextSolution, { title: loaded.title });
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

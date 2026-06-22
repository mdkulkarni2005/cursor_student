import { prisma } from "@studentos/db";
import { getObjectBuffer, putObject, keys } from "@studentos/storage";
import { renderAssignmentDocx, type AssignmentSolution } from "@studentos/documents";
import { generateAssignmentSolution, assignmentFollowUp, withAiRetry, type AssignmentTurn } from "@studentos/ai";
import { assertWithinQuota, recordUsage } from "@/lib/entitlements";
import { getOrCreateCurrentWorkspace } from "@/lib/workspace";
import { setJobStage } from "@/lib/jobs";

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** Stored content: the solution + the running tutoring conversation (#8.2). */
type AssignmentData = AssignmentSolution & { conversation?: AssignmentTurn[] };

export type GenerateAssignmentInput = {
  userId: string;
  title: string;
  questionText?: string;
  instructions?: string;
  /** Storage key + mime of an uploaded photo/PDF of the question. */
  uploadKey?: string;
  uploadMime?: string;
};

/** Ordered, user-facing assignment stages — shown live on the assignment page while solving. */
export const ASSIGNMENT_STAGES = [
  { key: "draft", label: "Solving your assignment" },
  { key: "format", label: "Formatting & finalizing" },
] as const;

/** FAST: create the assignment doc (GENERATING) so the action can redirect immediately. */
export async function createAssignmentDoc(input: GenerateAssignmentInput): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!user) throw new Error("User not found.");
  await assertWithinQuota(user, "ASSIGNMENT");
  const workspace = await getOrCreateCurrentWorkspace(user);
  const doc = await prisma.document.create({
    data: {
      ownerId: user.id,
      type: "ASSIGNMENT",
      title: input.title,
      status: "GENERATING",
      workspaceId: workspace.id,
      job: { create: { status: "RUNNING", startedAt: new Date(), pending: { stage: "draft" } as object } },
    },
  });
  return doc.id;
}

/** SLOW: solve + render — runs in the background (Next `after`), never blocks the user. */
export async function runAssignmentGeneration(docId: string, input: GenerateAssignmentInput): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!user) return;
  try {
    await setJobStage(docId, "draft");
    let image: { data: Uint8Array; mediaType: string } | undefined;
    if (input.uploadKey && input.uploadMime?.startsWith("image/")) {
      const bytes = await getObjectBuffer(input.uploadKey);
      image = { data: new Uint8Array(bytes), mediaType: input.uploadMime };
    }

    const { solution, model } = await withAiRetry(() => generateAssignmentSolution({
      questionText: input.questionText,
      instructions: input.instructions,
      subject: user.department ?? undefined,
      image,
    }), { label: "assignment.solve" });

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
        data: { status: "SUCCEEDED", model, finishedAt: new Date() },
      }),
    ]);

    await recordUsage(user.id, "ASSIGNMENT", docId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.document.update({ where: { id: docId }, data: { status: "FAILED" } }).catch(() => {});
    await prisma.generationJob
      .update({ where: { documentId: docId }, data: { status: "FAILED", error: message, finishedAt: new Date() } })
      .catch(() => {});
  }
}

/** Synchronous create+run (kept for non-interactive callers / scripts). */
export async function generateAndStoreAssignment(input: GenerateAssignmentInput): Promise<string> {
  const docId = await createAssignmentDoc(input);
  await runAssignmentGeneration(docId, input);
  return docId;
}

export async function getAssignment(userId: string, docId: string): Promise<{ title: string; data: AssignmentData } | null> {
  const doc = await prisma.document.findFirst({
    where: { id: docId, ownerId: userId, type: "ASSIGNMENT" },
    include: { content: true },
  });
  if (!doc?.content) return null;
  return { title: doc.title, data: doc.content.data as unknown as AssignmentData };
}

/**
 * Multi-turn feedback loop (#8.2): the student asks a follow-up ("which formula?", "redo step 3"),
 * the tutor answers and may revise the solution (re-rendering the DOCX). Concurrency-safe via a
 * status lock (READY→GENERATING) since it mutates the stored solution + export.
 */
export async function addAssignmentTurn(userId: string, docId: string, message: string): Promise<AssignmentData> {
  const text = message.trim();
  if (!text) throw new Error("Type a message first.");

  const lock = await prisma.document.updateMany({
    where: { id: docId, ownerId: userId, type: "ASSIGNMENT", status: "READY" },
    data: { status: "GENERATING" },
  });
  if (lock.count === 0) throw new Error("This assignment is busy — try again in a moment.");

  try {
    const loaded = await getAssignment(userId, docId);
    if (!loaded) throw new Error("Assignment not found.");
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const { conversation = [], ...solution } = loaded.data;

    const { result } = await withAiRetry(() => assignmentFollowUp({
      solution: solution as AssignmentSolution,
      conversation,
      message: text,
      subject: user?.department ?? undefined,
    }), { label: "assignment.followup" });

    const nextConversation: AssignmentTurn[] = [
      ...conversation,
      { speaker: "student", content: text },
      { speaker: "tutor", content: result.reply },
    ];
    const nextSolution = result.revisedSolution ?? (solution as AssignmentSolution);
    const nextData: AssignmentData = { ...nextSolution, conversation: nextConversation };

    // Re-render the DOCX only when the solution actually changed.
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

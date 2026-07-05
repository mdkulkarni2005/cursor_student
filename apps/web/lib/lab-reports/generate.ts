import { prisma } from "@studentos/db";
import { getObjectBuffer, putObject, keys } from "@studentos/storage";
import { renderLabReportDocx, type LabReportSolution } from "@studentos/documents";
import { generateLabReportSolution, labReportFollowUp, withAiRetry, type LabReportTurn } from "@studentos/ai";
import { assertWithinQuota, recordUsage } from "@/lib/entitlements";
import { getOrCreateCurrentWorkspace } from "@/lib/workspace";
import { setJobStage, addJobCostCents } from "@/lib/jobs";

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** Stored content: the report + the running tutoring conversation, mirrors AssignmentData. */
type LabReportData = LabReportSolution & { conversation?: LabReportTurn[] };

export type GenerateLabReportInput = {
  userId: string;
  title: string;
  readingsText?: string;
  instructions?: string;
  /** Storage key + mime of an uploaded photo of the raw readings/graph. */
  uploadKey?: string;
  uploadMime?: string;
};

/** Ordered, user-facing stages — shown live on the lab report page while generating. */
export const LAB_REPORT_STAGES = [
  { key: "draft", label: "Writing up your lab report" },
  { key: "format", label: "Formatting & finalizing" },
] as const;

/** FAST: create the doc (GENERATING) so the action can redirect immediately. */
export async function createLabReportDoc(input: GenerateLabReportInput): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!user) throw new Error("User not found.");
  await assertWithinQuota(user, "LAB_REPORT");
  const workspace = await getOrCreateCurrentWorkspace(user);
  const doc = await prisma.document.create({
    data: {
      ownerId: user.id,
      type: "LAB_REPORT",
      title: input.title,
      status: "GENERATING",
      workspaceId: workspace.id,
      job: { create: { status: "RUNNING", startedAt: new Date(), pending: { stage: "draft" } as object } },
    },
  });
  return doc.id;
}

/** SLOW: generate + render — runs in the background (Next `after`), never blocks the user. */
export async function runLabReportGeneration(docId: string, input: GenerateLabReportInput): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!user) return;
  try {
    await setJobStage(docId, "draft");
    let image: { data: Uint8Array; mediaType: string } | undefined;
    if (input.uploadKey && input.uploadMime?.startsWith("image/")) {
      const bytes = await getObjectBuffer(input.uploadKey);
      image = { data: new Uint8Array(bytes), mediaType: input.uploadMime };
    }

    const { solution, model, costCents } = await withAiRetry(() => generateLabReportSolution({
      readingsText: input.readingsText,
      instructions: input.instructions,
      subject: user.department ?? undefined,
      image,
    }), { label: "lab-report.solve" });

    await setJobStage(docId, "format");
    const { buffer } = await renderLabReportDocx(solution, { title: input.title });
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

    await recordUsage(user.id, "LAB_REPORT", docId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.document.update({ where: { id: docId }, data: { status: "FAILED" } }).catch(() => {});
    await prisma.generationJob
      .update({ where: { documentId: docId }, data: { status: "FAILED", error: message, finishedAt: new Date() } })
      .catch(() => {});
  }
}

export async function getLabReport(userId: string, docId: string): Promise<{ title: string; data: LabReportData } | null> {
  const doc = await prisma.document.findFirst({
    where: { id: docId, ownerId: userId, type: "LAB_REPORT" },
    include: { content: true },
  });
  if (!doc?.content) return null;
  return { title: doc.title, data: doc.content.data as unknown as LabReportData };
}

/**
 * Multi-turn feedback loop, mirrors addAssignmentTurn: concurrency-safe via a status lock
 * (READY→GENERATING) since it mutates the stored report + export.
 */
export async function addLabReportTurn(userId: string, docId: string, message: string): Promise<LabReportData> {
  const text = message.trim();
  if (!text) throw new Error("Type a message first.");

  const lock = await prisma.document.updateMany({
    where: { id: docId, ownerId: userId, type: "LAB_REPORT", status: "READY" },
    data: { status: "GENERATING" },
  });
  if (lock.count === 0) throw new Error("This report is busy — try again in a moment.");

  try {
    const loaded = await getLabReport(userId, docId);
    if (!loaded) throw new Error("Lab report not found.");
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const { conversation = [], ...solution } = loaded.data;

    const { result, costCents } = await withAiRetry(() => labReportFollowUp({
      solution: solution as LabReportSolution,
      conversation,
      message: text,
      subject: user?.department ?? undefined,
    }), { label: "lab-report.followup" });
    await addJobCostCents(docId, costCents);

    const nextConversation: LabReportTurn[] = [
      ...conversation,
      { speaker: "student", content: text },
      { speaker: "tutor", content: result.reply },
    ];
    const nextSolution = result.revisedSolution ?? (solution as LabReportSolution);
    const nextData: LabReportData = { ...nextSolution, conversation: nextConversation };

    if (result.revisedSolution) {
      const { buffer } = await renderLabReportDocx(nextSolution, { title: loaded.title });
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

import { prisma } from "@studentos/db";

/**
 * Record a live progress stage on a document's generation job (merged into job.pending.stage),
 * so the report/ppt/resume pages can poll and show "Drafting → Formatting → done" while the work
 * runs in the background. Best-effort: never throws into the generation path.
 */
export async function setJobStage(docId: string, stage: string): Promise<void> {
  const job = await prisma.generationJob.findUnique({
    where: { documentId: docId },
    select: { pending: true },
  });
  const pending = (job?.pending ?? {}) as Record<string, unknown>;
  await prisma.generationJob
    .update({ where: { documentId: docId }, data: { pending: { ...pending, stage } as unknown as object } })
    .catch(() => {});
}

/** Read the current stage key the poller should highlight (defaults to the first stage). */
export function stageOf(pending: unknown): string {
  return (pending as { stage?: string } | null)?.stage ?? "draft";
}

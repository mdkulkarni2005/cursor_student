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

/**
 * Add to a document's GenerationJob.costCents (never overwrite — a document can accrue cost across
 * multiple AI calls: draft generation, figure suggestions, per-figure image generation, edits).
 * Best-effort: never throws into the generation path, and no-ops for zero/negative deltas.
 */
export async function addJobCostCents(docId: string, deltaCents: number): Promise<void> {
  if (!deltaCents || deltaCents <= 0) return;
  await prisma.generationJob
    .update({
      where: { documentId: docId },
      data: { costCents: { increment: deltaCents } },
    })
    .catch(() => {});
}

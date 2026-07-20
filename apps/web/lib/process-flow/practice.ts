import { prisma } from "@studentos/db";
import type { ProcessNode, ProcessEdge } from "@/lib/process-flow/types";

export type ProcessCanvas = { nodes: ProcessNode[]; edges: ProcessEdge[] };

/** Autosave the in-progress flowsheet — one row per user, overwritten (no history, no AI cost). */
export async function saveProcessFlowDraft(userId: string, canvas: ProcessCanvas): Promise<void> {
  await prisma.processFlowDraft.upsert({
    where: { userId },
    create: { userId, canvas: canvas as unknown as object },
    update: { canvas: canvas as unknown as object },
  });
}

export async function getProcessFlowDraft(userId: string): Promise<ProcessCanvas | null> {
  const draft = await prisma.processFlowDraft.findUnique({ where: { userId } });
  return draft ? (draft.canvas as unknown as ProcessCanvas) : null;
}

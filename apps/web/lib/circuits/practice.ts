import { prisma } from "@studentos/db";
import type { CircuitNode, CircuitEdge } from "@/lib/circuits/types";

export type CircuitCanvas = { nodes: CircuitNode[]; edges: CircuitEdge[] };

/** Autosave the in-progress canvas — one row per user, overwritten (no history, no AI cost). */
export async function saveCircuitDraft(userId: string, canvas: CircuitCanvas): Promise<void> {
  await prisma.circuitDraft.upsert({
    where: { userId },
    create: { userId, canvas: canvas as unknown as object },
    update: { canvas: canvas as unknown as object },
  });
}

export async function getCircuitDraft(userId: string): Promise<CircuitCanvas | null> {
  const draft = await prisma.circuitDraft.findUnique({ where: { userId } });
  return draft ? (draft.canvas as unknown as CircuitCanvas) : null;
}

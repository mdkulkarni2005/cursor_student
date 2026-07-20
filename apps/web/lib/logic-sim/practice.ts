import { prisma } from "@studentos/db";
import type { LogicNode, LogicEdge } from "@/lib/logic-sim/types";

export type LogicCanvas = { nodes: LogicNode[]; edges: LogicEdge[] };

/** Autosave the in-progress bench — one row per user, overwritten (no history, no AI cost). */
export async function saveLogicSimDraft(userId: string, canvas: LogicCanvas): Promise<void> {
  await prisma.logicSimDraft.upsert({
    where: { userId },
    create: { userId, canvas: canvas as unknown as object },
    update: { canvas: canvas as unknown as object },
  });
}

export async function getLogicSimDraft(userId: string): Promise<LogicCanvas | null> {
  const draft = await prisma.logicSimDraft.findUnique({ where: { userId } });
  return draft ? (draft.canvas as unknown as LogicCanvas) : null;
}

import { prisma } from "@studentos/db";
import type { AssistantMessage } from "@studentos/ai";

const MAX_STORED = 40; // keep the rolling thread bounded

/** The persisted chat for a user (empty array if none yet). */
export async function getThread(userId: string): Promise<AssistantMessage[]> {
  const t = await prisma.assistantThread.findUnique({ where: { userId } });
  return ((t?.messages as AssistantMessage[] | undefined) ?? []).slice(-MAX_STORED);
}

/** Append a user→assistant exchange to the rolling thread. */
export async function appendTurn(userId: string, userMessage: AssistantMessage, assistantText: string): Promise<void> {
  const existing = await getThread(userId);
  const next = [...existing, userMessage, { role: "assistant" as const, content: assistantText }].slice(-MAX_STORED);
  await prisma.assistantThread.upsert({
    where: { userId },
    create: { userId, messages: next as unknown as object },
    update: { messages: next as unknown as object },
  });
}

/** Clear the thread (new conversation). */
export async function clearThread(userId: string): Promise<void> {
  await prisma.assistantThread.upsert({
    where: { userId },
    create: { userId, messages: [] },
    update: { messages: [] },
  });
}

"use server";

import { FeedbackType, prisma } from "@studentos/db";
import { requireOnboardedUser } from "@/lib/user";

export type CreateFeedbackResult = { ok: true } | { ok: false; error: string };

const TYPE_VALUES = new Set(Object.values(FeedbackType));

export async function createFeedback(type: string, message: string, page: string): Promise<CreateFeedbackResult> {
  const user = await requireOnboardedUser();

  if (!TYPE_VALUES.has(type as FeedbackType)) return { ok: false, error: "Invalid feedback type." };
  const cleanMessage = message.trim();
  if (!cleanMessage) return { ok: false, error: "Please describe your feedback." };

  await prisma.feedback.create({
    data: {
      requesterType: "STUDENT",
      studentId: user.id,
      type: type as FeedbackType,
      message: cleanMessage,
      page: page.trim() || null,
    },
  });
  return { ok: true };
}

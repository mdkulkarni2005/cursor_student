"use server";

import { FeedbackType, prisma } from "@studentos/db";
import { requireRecruiter } from "@/lib/recruiter";

export type CreateFeedbackResult = { ok: true } | { ok: false; error: string };

const TYPE_VALUES = new Set(Object.values(FeedbackType));

export async function createFeedback(type: string, message: string, page: string): Promise<CreateFeedbackResult> {
  const guard = await requireRecruiter();
  if (!guard.ok) return { ok: false, error: "Not authorized." };

  if (!TYPE_VALUES.has(type as FeedbackType)) return { ok: false, error: "Invalid feedback type." };
  const cleanMessage = message.trim();
  if (!cleanMessage) return { ok: false, error: "Please describe your feedback." };

  await prisma.feedback.create({
    data: {
      requesterType: "RECRUITER",
      recruiterId: guard.recruiter.id,
      type: type as FeedbackType,
      message: cleanMessage,
      page: page.trim() || null,
    },
  });
  return { ok: true };
}

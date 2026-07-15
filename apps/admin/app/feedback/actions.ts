"use server";

import { revalidatePath } from "next/cache";
import { FeedbackStatus, prisma } from "@studentos/db";
import { requireAdmin } from "@/lib/admin";
import { logAdminAction } from "@/lib/audit";

const STATUS_VALUES = new Set(Object.values(FeedbackStatus));

export async function updateFeedback(id: string, status: string, adminNote: string): Promise<void> {
  const guard = await requireAdmin();
  if (!guard.ok) throw new Error("Not authorized");
  if (!STATUS_VALUES.has(status as FeedbackStatus)) throw new Error("Invalid status");

  const before = await prisma.feedback.findUnique({ where: { id }, select: { status: true, adminNote: true } });

  await prisma.feedback.update({
    where: { id },
    data: { status: status as FeedbackStatus, adminNote: adminNote.trim() || null },
  });

  await logAdminAction({
    action: "feedback.update",
    targetType: "feedback",
    targetId: id,
    before,
    after: { status, adminNote: adminNote.trim() || null },
  });

  revalidatePath("/feedback");
}

"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@studentos/db";
import { requireOnboardedUser } from "@/lib/user";

async function ownedSchedule(id: string, studentId: string) {
  const schedule = await prisma.interviewSchedule.findUnique({ where: { id } });
  if (!schedule || schedule.studentId !== studentId) throw new Error("Not found");
  return schedule;
}

/** Student accepts a recruiter-proposed interview slot as-is. */
export async function acceptSchedule(id: string): Promise<void> {
  const user = await requireOnboardedUser();
  await ownedSchedule(id, user.id);
  await prisma.interviewSchedule.update({ where: { id }, data: { status: "ACCEPTED" } });
  revalidatePath("/messages");
}

/** Student declines outright. */
export async function declineSchedule(id: string): Promise<void> {
  const user = await requireOnboardedUser();
  await ownedSchedule(id, user.id);
  await prisma.interviewSchedule.update({ where: { id }, data: { status: "DECLINED" } });
  revalidatePath("/messages");
}

export type ProposeReschedulState = { error?: string; sent?: boolean };

/** Student proposes a different time — the recruiter reviews it from apps/recruiter's /interviews list. */
export async function proposeReschedule(id: string, _prev: ProposeReschedulState, formData: FormData): Promise<ProposeReschedulState> {
  const user = await requireOnboardedUser();
  const studentNote = String(formData.get("studentNote") ?? "").trim();
  if (!studentNote) return { error: "Let the recruiter know what time works instead." };

  await ownedSchedule(id, user.id);
  await prisma.interviewSchedule.update({ where: { id }, data: { status: "RESCHEDULE_REQUESTED", studentNote } });
  revalidatePath("/messages");
  return { sent: true };
}

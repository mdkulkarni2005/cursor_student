"use server";

import { revalidatePath } from "next/cache";
import { prisma, type User } from "@studentos/db";
import { requireOnboardedUser } from "@/lib/user";
import { sendEmail, interviewInviteEmail, interviewResponseEmail } from "@studentos/email";

async function ownedSchedule(id: string, studentId: string) {
  const schedule = await prisma.interviewSchedule.findUnique({ where: { id } });
  if (!schedule || schedule.studentId !== studentId) throw new Error("Not found");
  return schedule;
}

/**
 * Fire-and-forget — sendEmail never throws, but double-guard here: an email failure must never
 * surface to the student or block the action itself. This is the recruiter's ONLY way to find out
 * a student acted — there's no notification/badge system elsewhere in the app.
 */
async function notifyRecruiterOfResponse(
  scheduleId: string,
  studentName: string,
  action: "ACCEPTED" | "DECLINED" | "RESCHEDULE_REQUESTED",
  studentNote?: string | null,
): Promise<void> {
  const schedule = await prisma.interviewSchedule.findUnique({
    where: { id: scheduleId },
    include: { recruiter: { select: { name: true, email: true } } },
  });
  if (!schedule) return;
  const interviewLink = `${process.env.NEXT_PUBLIC_RECRUITER_APP_URL ?? "http://localhost:3200"}/interviews/${scheduleId}`;
  const { subject, html, text } = interviewResponseEmail({
    recruiterName: schedule.recruiter.name ?? "there",
    studentName,
    action,
    proposedAt: schedule.proposedAt,
    studentNote,
    interviewLink,
  });
  await sendEmail({ to: schedule.recruiter.email, subject, html, text });
}

/**
 * Fire-and-forget — sendEmail never throws, but double-guard here: an email failure must never
 * surface to the student or block the accept action itself.
 */
async function sendInterviewInviteEmail(scheduleId: string, user: User): Promise<void> {
  const schedule = await prisma.interviewSchedule.findUnique({
    where: { id: scheduleId },
    include: { recruiter: { select: { companyName: true } } },
  });
  if (!schedule) return;
  const joinLink = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/real-interview`;
  const { subject, html, text } = interviewInviteEmail({
    studentName: user.name ?? "there",
    recruiterCompany: schedule.recruiter.companyName,
    proposedAt: schedule.proposedAt,
    joinLink,
  });
  await sendEmail({ to: user.email, subject, html, text });
}

/** Student accepts a recruiter-proposed interview slot as-is. */
export async function acceptSchedule(id: string): Promise<void> {
  const user = await requireOnboardedUser();
  await ownedSchedule(id, user.id);
  await prisma.interviewSchedule.update({ where: { id }, data: { status: "ACCEPTED" } });
  revalidatePath("/messages");
  void sendInterviewInviteEmail(id, user).catch(() => {});
  void notifyRecruiterOfResponse(id, user.name ?? "A student", "ACCEPTED").catch(() => {});
}

/** Student declines outright. */
export async function declineSchedule(id: string): Promise<void> {
  const user = await requireOnboardedUser();
  await ownedSchedule(id, user.id);
  await prisma.interviewSchedule.update({ where: { id }, data: { status: "DECLINED" } });
  revalidatePath("/messages");
  void notifyRecruiterOfResponse(id, user.name ?? "A student", "DECLINED").catch(() => {});
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
  void notifyRecruiterOfResponse(id, user.name ?? "A student", "RESCHEDULE_REQUESTED", studentNote).catch(() => {});
  return { sent: true };
}

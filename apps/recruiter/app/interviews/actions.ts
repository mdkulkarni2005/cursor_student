"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@studentos/db";
import { requireRecruiter } from "@/lib/recruiter";

export type ScheduleState = { error?: string; scheduled?: boolean };

/** Recruiter proposes a real-interview slot for a student they can currently see. */
export async function scheduleInterview(studentId: string, _prev: ScheduleState, formData: FormData): Promise<ScheduleState> {
  const guard = await requireRecruiter();
  if (!guard.ok) return { error: "Not authorized." };

  const dateStr = String(formData.get("proposedAt") ?? "").trim();
  const meetingLink = String(formData.get("meetingLink") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!dateStr) return { error: "Please pick a date and time." };
  const proposedAt = new Date(dateStr);
  if (Number.isNaN(proposedAt.getTime())) return { error: "Invalid date/time." };
  if (proposedAt.getTime() < Date.now()) return { error: "Pick a time in the future." };
  if (meetingLink && !/^https?:\/\//i.test(meetingLink)) return { error: "Meeting link must be a full URL (https://…)." };

  const student = await prisma.user.findUnique({ where: { id: studentId }, select: { visibleToRecruiters: true } });
  if (!student?.visibleToRecruiters) return { error: "This student is no longer visible to recruiters." };

  await prisma.interviewSchedule.create({
    data: {
      recruiterId: guard.recruiter.id,
      studentId,
      proposedAt,
      meetingLink: meetingLink || null,
      note: note || null,
    },
  });

  revalidatePath(`/students/${studentId}`);
  revalidatePath("/interviews");
  return { scheduled: true };
}

export type OutcomeState = { error?: string; saved?: boolean };

/** Recruiter cancels a still-open (not yet accepted/declined) proposal. */
export async function cancelSchedule(id: string): Promise<void> {
  const guard = await requireRecruiter();
  if (!guard.ok) throw new Error("Not authorized");

  const schedule = await prisma.interviewSchedule.findUnique({ where: { id } });
  if (!schedule || schedule.recruiterId !== guard.recruiter.id) throw new Error("Not found");

  await prisma.interviewSchedule.update({ where: { id }, data: { status: "CANCELED" } });
  revalidatePath("/interviews");
  revalidatePath(`/students/${schedule.studentId}`);
}

/** Recruiter logs the result once the interview has happened. */
export async function logOutcome(id: string, _prev: OutcomeState, formData: FormData): Promise<OutcomeState> {
  const guard = await requireRecruiter();
  if (!guard.ok) return { error: "Not authorized." };

  const schedule = await prisma.interviewSchedule.findUnique({ where: { id } });
  if (!schedule || schedule.recruiterId !== guard.recruiter.id) return { error: "Not found." };

  const outcome = String(formData.get("outcome") ?? "");
  if (!["SELECTED", "REJECTED", "ON_HOLD"].includes(outcome)) return { error: "Pick an outcome." };
  const outcomeNote = String(formData.get("outcomeNote") ?? "").trim();

  await prisma.interviewSchedule.update({
    where: { id },
    data: { status: "COMPLETED", outcome: outcome as "SELECTED" | "REJECTED" | "ON_HOLD", outcomeNote: outcomeNote || null },
  });

  revalidatePath("/interviews");
  revalidatePath(`/students/${schedule.studentId}`);
  return { saved: true };
}

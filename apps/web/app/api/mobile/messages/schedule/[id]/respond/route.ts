import { NextResponse } from "next/server";
import { prisma } from "@studentos/db";
import { sendEmail, interviewInviteEmail, interviewResponseEmail } from "@studentos/email";
import { getOrCreateUser } from "@/lib/user";
import type { ScheduleRespondInput } from "@studentos/api-types";
import type { User } from "@studentos/db";

async function ownedSchedule(id: string, studentId: string) {
  const schedule = await prisma.interviewSchedule.findUnique({ where: { id } });
  if (!schedule || schedule.studentId !== studentId) return null;
  return schedule;
}

/**
 * Fire-and-forget — sendEmail never throws, but double-guard here: an email failure must never
 * surface to the student or block the action itself. Ported from lib/actions/interview-schedule.ts.
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

/** Student accepts/declines/reschedules a recruiter-proposed interview slot. Ported from lib/actions/interview-schedule.ts. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  let body: ScheduleRespondInput;
  try {
    body = (await req.json()) as ScheduleRespondInput;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const schedule = await ownedSchedule(id, user.id);
  if (!schedule) return NextResponse.json({ error: "Interview request not found." }, { status: 404 });

  // Mirrors the web UI's ScheduleResponse component, which only renders the accept/decline/
  // reschedule controls when status === "PROPOSED" — enforce that same guard server-side.
  if (schedule.status !== "PROPOSED") {
    return NextResponse.json({ error: "This interview request is no longer open to a response." }, { status: 400 });
  }

  if (body.action === "accept") {
    await prisma.interviewSchedule.update({ where: { id }, data: { status: "ACCEPTED" } });
    void sendInterviewInviteEmail(id, user).catch(() => {});
    void notifyRecruiterOfResponse(id, user.name ?? "A student", "ACCEPTED").catch(() => {});
  } else if (body.action === "decline") {
    await prisma.interviewSchedule.update({ where: { id }, data: { status: "DECLINED" } });
    void notifyRecruiterOfResponse(id, user.name ?? "A student", "DECLINED").catch(() => {});
  } else if (body.action === "reschedule") {
    const studentNote = String(body.studentNote ?? "").trim().slice(0, 1000);
    if (!studentNote) return NextResponse.json({ error: "Let the recruiter know what time works instead." }, { status: 400 });
    await prisma.interviewSchedule.update({ where: { id }, data: { status: "RESCHEDULE_REQUESTED", studentNote } });
    void notifyRecruiterOfResponse(id, user.name ?? "A student", "RESCHEDULE_REQUESTED", studentNote).catch(() => {});
  } else {
    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

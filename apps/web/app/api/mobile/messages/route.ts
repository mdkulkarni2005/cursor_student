import { NextResponse } from "next/server";
import { prisma } from "@studentos/db";
import { getOrCreateUser } from "@/lib/user";
import type { InterviewRequestSummary, MessagesResponse, RecruiterMessageSummary } from "@studentos/api-types";

/** Recruiter inbox: interview schedule requests + free-text messages, mirrors apps/web/app/messages/page.tsx. */
export async function GET() {
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const [messages, schedules] = await Promise.all([
    prisma.recruiterMessage.findMany({
      where: { studentId: user.id },
      orderBy: { createdAt: "desc" },
      include: { recruiter: { select: { name: true, companyName: true } } },
    }),
    prisma.interviewSchedule.findMany({
      where: { studentId: user.id },
      orderBy: { proposedAt: "desc" },
      include: { recruiter: { select: { name: true, companyName: true } } },
    }),
  ]);

  const interviews: InterviewRequestSummary[] = schedules.map((s) => ({
    id: s.id,
    status: s.status,
    proposedAt: s.proposedAt.toISOString(),
    note: s.note,
    meetingLink: s.meetingLink,
    recruiter: { name: s.recruiter.name, companyName: s.recruiter.companyName },
  }));

  const mapped: RecruiterMessageSummary[] = messages.map((m) => ({
    id: m.id,
    body: m.body,
    createdAt: m.createdAt.toISOString(),
    readAt: m.readAt ? m.readAt.toISOString() : null,
    recruiter: { name: m.recruiter.name, companyName: m.recruiter.companyName },
  }));

  const response: MessagesResponse = { interviews, messages: mapped };
  return NextResponse.json(response);
}

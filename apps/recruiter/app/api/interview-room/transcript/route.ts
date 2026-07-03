import { NextResponse } from "next/server";
import { prisma } from "@studentos/db";
import { requireRecruiter } from "@/lib/recruiter";

/** Recruiter-side transcript line — writes to the SAME InterviewTranscriptLine table apps/web
 *  writes to (shared @studentos/db); no cross-app calls needed. */
export async function POST(req: Request) {
  const guard = await requireRecruiter();
  if (!guard.ok) return NextResponse.json({ error: "Sign in as an approved recruiter." }, { status: 401 });

  let body: { scheduleId?: string; text?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const scheduleId = String(body.scheduleId ?? "");
  const text = String(body.text ?? "").trim();
  if (!scheduleId) return NextResponse.json({ error: "Missing scheduleId." }, { status: 400 });
  if (!text) return NextResponse.json({ error: "Missing text." }, { status: 400 });

  const schedule = await prisma.interviewSchedule.findUnique({ where: { id: scheduleId } });
  if (!schedule || schedule.recruiterId !== guard.recruiter.id) {
    return NextResponse.json({ error: "Interview not found." }, { status: 404 });
  }

  await prisma.interviewTranscriptLine.create({ data: { scheduleId, speaker: "recruiter", text } });
  return NextResponse.json({ recorded: true });
}

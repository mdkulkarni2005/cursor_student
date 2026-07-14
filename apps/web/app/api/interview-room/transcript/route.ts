import { NextResponse } from "next/server";
import { prisma } from "@studentos/db";
import { getOrCreateUser } from "@/lib/user";
import { rateLimit, friendlyError, RateLimitError } from "@/lib/reliability";
import { ownedAcceptedSchedule } from "@/lib/live-interview";

/**
 * Candidate-side transcript line (Phase E4). The recruiter side has its own equivalent route in
 * apps/recruiter, writing to the SAME InterviewTranscriptLine table (shared @studentos/db) — no
 * cross-app calls needed, each app authenticates its own user and writes directly.
 */
export async function POST(req: Request) {
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });

  try {
    await rateLimit(user.id, "interview-room-transcript", 60);
  } catch (e) {
    const retryAfter = e instanceof RateLimitError ? Math.ceil(e.retryAfterMs / 1000) : 30;
    return NextResponse.json({ error: friendlyError(e) }, { status: 429, headers: { "Retry-After": String(retryAfter) } });
  }

  let body: { scheduleId?: string; speaker?: string; text?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const scheduleId = String(body.scheduleId ?? "");
  const text = String(body.text ?? "").trim().slice(0, 4000);
  if (!scheduleId) return NextResponse.json({ error: "Missing scheduleId." }, { status: 400 });
  if (!text) return NextResponse.json({ error: "Missing text." }, { status: 400 });

  try {
    await ownedAcceptedSchedule(scheduleId, user.id);
    await prisma.interviewTranscriptLine.create({ data: { scheduleId, speaker: "candidate", text } });
    return NextResponse.json({ recorded: true });
  } catch (err) {
    return NextResponse.json({ error: friendlyError(err) }, { status: 404 });
  }
}

import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/user";
import { rateLimit, friendlyError, RateLimitError } from "@/lib/reliability";
import { ownedAcceptedSchedule, createOrGetRoom } from "@/lib/live-interview";

/**
 * Recruiter-led real interview (Phase E1) — creates/gets the LiveKit room for an accepted
 * InterviewSchedule. Separate namespace from /api/interview/* (the AI mock interview) by design.
 */
export async function POST(req: Request) {
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });

  try {
    rateLimit(user.id, "interview-room-create", 10);
  } catch (e) {
    const retryAfter = e instanceof RateLimitError ? Math.ceil(e.retryAfterMs / 1000) : 30;
    return NextResponse.json({ error: friendlyError(e) }, { status: 429, headers: { "Retry-After": String(retryAfter) } });
  }

  let body: { scheduleId?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const scheduleId = String(body.scheduleId ?? "");
  if (!scheduleId) return NextResponse.json({ error: "Missing scheduleId." }, { status: 400 });

  try {
    await ownedAcceptedSchedule(scheduleId, user.id);
    const room = await createOrGetRoom(scheduleId);
    if (room.status === "UNAVAILABLE") {
      return NextResponse.json({ unavailable: true, message: "Live interview room isn't available right now — try again shortly." });
    }
    return NextResponse.json({ roomName: room.livekitRoom, status: room.status });
  } catch (err) {
    return NextResponse.json({ error: friendlyError(err) }, { status: 404 });
  }
}

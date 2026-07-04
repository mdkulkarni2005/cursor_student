import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/user";
import { rateLimit, friendlyError, RateLimitError } from "@/lib/reliability";
import { ownedAcceptedSchedule, getReadyStatus } from "@/lib/live-interview";

/**
 * Read-only poll target for the candidate sitting in "awaiting-admission" — a safety net
 * alongside the LiveKit "admitted" data message pushed by the recruiter, in case that single
 * packet is dropped or arrives before the listener is attached. Separate from /ready (which
 * mutates candidateReadyAt and is capped much lower) so a ~2-3s poll cadence doesn't trip a limit
 * meant for a one-time write.
 */
export async function POST(req: Request) {
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });

  try {
    rateLimit(user.id, "interview-room-status", 60);
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
    const { admitted } = await getReadyStatus(scheduleId);
    return NextResponse.json({ admitted });
  } catch (err) {
    return NextResponse.json({ error: friendlyError(err) }, { status: 404 });
  }
}

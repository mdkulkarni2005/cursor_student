import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/user";
import { rateLimit, friendlyError, RateLimitError } from "@/lib/reliability";
import { ownedAcceptedSchedule, markCandidateReady } from "@/lib/live-interview";

/**
 * Candidate signals it has passed local pre-join checks and is sitting in the LiveKit lobby
 * (connected, no tracks published) awaiting the recruiter's admit. Returns whether the recruiter
 * has already admitted them, so a reconnecting candidate can skip straight to publishing tracks.
 */
export async function POST(req: Request) {
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });

  try {
    rateLimit(user.id, "interview-room-ready", 10);
  } catch (e) {
    const retryAfter = e instanceof RateLimitError ? Math.ceil(e.retryAfterMs / 1000) : 30;
    return NextResponse.json({ error: friendlyError(e) }, { status: 429, headers: { "Retry-After": String(retryAfter) } });
  }

  let body: { scheduleId?: string; fullscreen?: boolean; monitorCount?: number | null };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const scheduleId = String(body.scheduleId ?? "");
  if (!scheduleId) return NextResponse.json({ error: "Missing scheduleId." }, { status: 400 });

  try {
    await ownedAcceptedSchedule(scheduleId, user.id);
    const { admitted } = await markCandidateReady(scheduleId, {
      fullscreen: Boolean(body.fullscreen),
      monitorCount: body.monitorCount ?? null,
    });
    return NextResponse.json({ admitted });
  } catch (err) {
    return NextResponse.json({ error: friendlyError(err) }, { status: 404 });
  }
}

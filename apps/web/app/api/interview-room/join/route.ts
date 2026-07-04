import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/user";
import { rateLimit, friendlyError, RateLimitError } from "@/lib/reliability";
import { ownedAcceptedSchedule, joinRoom, hasJoinableRealInterview } from "@/lib/live-interview";

export async function POST(req: Request) {
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });

  try {
    rateLimit(user.id, "interview-room-join", 10);
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
    // Re-check the join window, not just ACCEPTED — a stale accepted-but-expired schedule
    // shouldn't mint a token.
    if (!(await hasJoinableRealInterview(user.id))) {
      return NextResponse.json({ error: "This interview isn't in its join window right now." }, { status: 403 });
    }
    const result = await joinRoom(scheduleId, user.id, "candidate", user.name ?? undefined);
    if (result.unavailable) return NextResponse.json({ unavailable: true });
    return NextResponse.json({ token: result.token, wsUrl: result.wsUrl });
  } catch (err) {
    return NextResponse.json({ error: friendlyError(err) }, { status: 404 });
  }
}

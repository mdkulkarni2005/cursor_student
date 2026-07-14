import { NextResponse } from "next/server";
import { type InterviewFlagKind } from "@studentos/db";
import { getOrCreateUser } from "@/lib/user";
import { rateLimit, friendlyError, RateLimitError } from "@/lib/reliability";
import { ownedAcceptedSchedule, recordFlag } from "@/lib/live-interview";

const VALID_KINDS = new Set<InterviewFlagKind>([
  "FULLSCREEN_EXIT",
  "TAB_HIDDEN",
  "CAMERA_OFF",
  "MIC_OFF",
  "MULTI_MONITOR",
  "COPY_PASTE_ATTEMPT",
]);

/**
 * Proctoring signal from the candidate's browser (Phase E3). Client-side throttling
 * (use-proctoring-signals.ts) keeps this from being spammed, but the server never trusts that —
 * `kind` is validated here regardless.
 */
export async function POST(req: Request) {
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });

  try {
    await rateLimit(user.id, "interview-room-flag", 30);
  } catch (e) {
    const retryAfter = e instanceof RateLimitError ? Math.ceil(e.retryAfterMs / 1000) : 30;
    return NextResponse.json({ error: friendlyError(e) }, { status: 429, headers: { "Retry-After": String(retryAfter) } });
  }

  let body: { scheduleId?: string; kind?: string; detail?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const scheduleId = String(body.scheduleId ?? "");
  const kind = String(body.kind ?? "") as InterviewFlagKind;
  const detail = typeof body.detail === "string" ? body.detail.slice(0, 500) : undefined;
  if (!scheduleId) return NextResponse.json({ error: "Missing scheduleId." }, { status: 400 });
  if (!VALID_KINDS.has(kind)) return NextResponse.json({ error: "Invalid flag kind." }, { status: 400 });

  try {
    await ownedAcceptedSchedule(scheduleId, user.id);
    await recordFlag(scheduleId, kind, detail);
    return NextResponse.json({ recorded: true });
  } catch (err) {
    return NextResponse.json({ error: friendlyError(err) }, { status: 404 });
  }
}

import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/user";
import { rateLimit, friendlyError, RateLimitError } from "@/lib/reliability";
import { ownedAcceptedSchedule } from "@/lib/live-interview";
import { prisma } from "@studentos/db";

/** Candidate poll target — lets the UI show a "Run" affordance once the recruiter has launched
 *  the sandbox, without minting anything or touching the sandbox itself. */
export async function POST(req: Request) {
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });

  try {
    rateLimit(user.id, "interview-room-sandbox-status", 60);
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
  } catch (err) {
    return NextResponse.json({ error: friendlyError(err) }, { status: 404 });
  }

  const sandbox = await prisma.interviewSandbox.findUnique({ where: { scheduleId } });
  return NextResponse.json({ active: sandbox?.status === "RUNNING" });
}

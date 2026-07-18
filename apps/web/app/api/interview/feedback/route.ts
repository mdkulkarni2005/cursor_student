import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/user";
import { finalizeFromTranscript, type VapiTurn } from "@/lib/interview/generate";
import { rateLimit, friendlyError, RateLimitError } from "@/lib/reliability";
import { assertWithinCostBudget } from "@/lib/entitlements";

/**
 * Finalizes the LIVE VAPI interview: the browser sends the transcript it captured during the call,
 * we evaluate it (Sonnet) and mark the interview complete. Client-driven (no VAPI webhook), so it
 * works on localhost — VAPI never needs to reach us for the core interview.
 */
export async function POST(req: Request) {
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });

  try {
    await rateLimit(user.id, "interview-feedback", 10);
    await assertWithinCostBudget(user);
  } catch (e) {
    const retryAfter = e instanceof RateLimitError ? Math.ceil(e.retryAfterMs / 1000) : 30;
    return NextResponse.json({ error: friendlyError(e) }, { status: 429, headers: { "Retry-After": String(retryAfter) } });
  }

  let body: { docId?: string; transcript?: VapiTurn[] };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const docId = String(body.docId ?? "");
  const turns = Array.isArray(body.transcript) ? body.transcript : [];
  if (!docId) return NextResponse.json({ error: "Missing interview." }, { status: 400 });

  try {
    const state = await finalizeFromTranscript(user.id, docId, turns);
    return NextResponse.json({ phase: state.phase, evaluation: state.evaluation ?? null });
  } catch (err) {
    return NextResponse.json({ error: friendlyError(err) }, { status: 502 });
  }
}

import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/user";
import { endInterviewNow } from "@/lib/interview/generate";
import { rateLimit, friendlyError, RateLimitError } from "@/lib/reliability";
import { assertWithinCostBudget } from "@/lib/entitlements";

/**
 * Ends the LIVE interview immediately (the red "End" button) and evaluates what was answered so
 * far. Returns the evaluation as JSON so the call can show the report without a reload that would
 * otherwise drop straight back into an "active" session.
 */
export async function POST(req: Request) {
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });

  try {
    await rateLimit(user.id, "interview-end", 10);
    await assertWithinCostBudget(user);
  } catch (e) {
    const retryAfter = e instanceof RateLimitError ? Math.ceil(e.retryAfterMs / 1000) : 30;
    return NextResponse.json({ error: friendlyError(e) }, { status: 429, headers: { "Retry-After": String(retryAfter) } });
  }

  let body: { docId?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const docId = String(body.docId ?? "");
  if (!docId) return NextResponse.json({ error: "Missing interview." }, { status: 400 });

  try {
    const state = await endInterviewNow(user.id, docId);
    return NextResponse.json({ phase: state.phase, evaluation: state.evaluation ?? null });
  } catch (err) {
    return NextResponse.json({ error: friendlyError(err) }, { status: 502 });
  }
}

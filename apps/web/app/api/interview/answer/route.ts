import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/user";
import { submitAnswer } from "@/lib/interview/generate";
import { rateLimit, friendlyError, RateLimitError } from "@/lib/reliability";
import { assertWithinCostBudget } from "@/lib/entitlements";

/**
 * JSON answer endpoint for the LIVE voice interview (Stage 2). Same `submitAnswer` the typed flow
 * uses — but returns the next state as JSON so the continuous VAPI call advances WITHOUT a page
 * reload (a reload would tear down the call). The typed/server-action flow stays as the fallback.
 */
export async function POST(req: Request) {
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });

  try {
    await rateLimit(user.id, "interview-answer", 80);
    await assertWithinCostBudget(user);
  } catch (e) {
    const retryAfter = e instanceof RateLimitError ? Math.ceil(e.retryAfterMs / 1000) : 30;
    return NextResponse.json({ error: friendlyError(e) }, { status: 429, headers: { "Retry-After": String(retryAfter) } });
  }

  let body: { docId?: string; answer?: string; language?: string; runOutput?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const docId = String(body.docId ?? "");
  const answer = String(body.answer ?? "");
  const language = body.language ? String(body.language) : undefined;
  const runOutput = body.runOutput ? String(body.runOutput) : undefined;
  if (!docId || !answer.trim()) return NextResponse.json({ error: "Empty answer." }, { status: 400 });

  try {
    const state = await submitAnswer(user.id, docId, answer, { language, runOutput });
    // Return just what the client needs to advance + speak the next question.
    const lastTurn = state.transcript[state.transcript.length - 1];
    return NextResponse.json({
      phase: state.phase,
      nextQuestion: state.phase === "active" ? lastTurn?.content ?? null : null,
      kind: state.phase === "active" ? lastTurn?.kind ?? "question" : null,
      runnable: state.phase === "active" ? lastTurn?.runnable ?? false : false,
      answered: state.transcript.filter((t) => t.speaker === "candidate").length,
      total: state.questionPlan.length,
      evaluation: state.phase === "complete" ? state.evaluation ?? null : null,
    });
  } catch (err) {
    return NextResponse.json({ error: friendlyError(err) }, { status: 502 });
  }
}

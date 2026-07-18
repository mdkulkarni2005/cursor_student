import { NextResponse } from "next/server";
import { interviewHint, type InterviewRound } from "@studentos/ai";
import { getOrCreateUser } from "@/lib/user";
import { getInterview } from "@/lib/interview/generate";
import { rateLimit, friendlyError, RateLimitError } from "@/lib/reliability";
import { assertWithinCostBudget } from "@/lib/entitlements";

export async function POST(req: Request) {
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  try {
    await rateLimit(user.id, "interview-hint", 10);
    await assertWithinCostBudget(user);
  } catch (e) {
    const retryAfter = e instanceof RateLimitError ? Math.ceil(e.retryAfterMs / 1000) : 30;
    return NextResponse.json({ error: friendlyError(e) }, { status: 429, headers: { "Retry-After": String(retryAfter) } });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const docId = String((body as { docId?: unknown })?.docId ?? "");
  if (!docId) return NextResponse.json({ error: "Missing interview." }, { status: 400 });

  const loaded = await getInterview(user.id, docId);
  if (!loaded) return NextResponse.json({ error: "Interview not found." }, { status: 404 });

  const { state } = loaded;
  const last = state.transcript[state.transcript.length - 1];
  if (state.phase !== "active" || last?.speaker !== "interviewer") {
    return NextResponse.json({ error: "No active question to hint on." }, { status: 409 });
  }

  try {
    const { hint } = await interviewHint({
      question: last.content,
      round: (last.round ?? "technical") as InterviewRound,
      brief: state.brief,
      department: state.department,
    });
    return NextResponse.json({ hint });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Couldn't fetch a hint." }, { status: 502 });
  }
}

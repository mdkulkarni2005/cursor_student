import { NextResponse } from "next/server";
import { prisma } from "@studentos/db";
import { reviewInterviewCode, withAiRetry } from "@studentos/ai";
import { getOrCreateUser } from "@/lib/user";
import { rateLimit, friendlyError, RateLimitError } from "@/lib/reliability";
import { assertWithinCostBudget } from "@/lib/entitlements";

/**
 * STATIC review of a candidate's code during a live interview — checks syntax + approach WITHOUT
 * executing anything (per product decision: surprise coding round, AI reviews syntax, never runs).
 * Returns a verdict + a one-line spoken feedback the live voice interviewer relays, then advances.
 */
export async function POST(req: Request) {
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Sign in to submit code." }, { status: 401 });

  try {
    await rateLimit(user.id, "interview-review", 30);
    await assertWithinCostBudget(user);
  } catch (e) {
    const retryAfter = e instanceof RateLimitError ? Math.ceil(e.retryAfterMs / 1000) : 30;
    return NextResponse.json({ error: friendlyError(e) }, { status: 429, headers: { "Retry-After": String(retryAfter) } });
  }

  let body: { docId?: string; language?: string; code?: string; question?: string; role?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const docId = String(body.docId ?? "");
  const language = String(body.language ?? "code");
  const code = String(body.code ?? "");
  const question = String(body.question ?? "the coding task").slice(0, 2000);
  const role = body.role ? String(body.role).slice(0, 200) : undefined;

  if (code.trim().length < 1) return NextResponse.json({ error: "Write some code first." }, { status: 400 });
  if (code.length > 50_000) return NextResponse.json({ error: "That's a lot of code — trim it down." }, { status: 400 });

  // Owner-guard: the submission must belong to one of this user's interviews.
  const owned = await prisma.document.findFirst({ where: { id: docId, ownerId: user.id, type: "INTERVIEW" }, select: { id: true } });
  if (!owned) return NextResponse.json({ error: "Interview not found." }, { status: 404 });

  try {
    const { review } = await withAiRetry(
      () => reviewInterviewCode({ question, language, code, role }),
      { label: "interview.review" },
    );
    return NextResponse.json({ review });
  } catch {
    // Never let a review failure break the live interview — degrade to a neutral acknowledgement.
    return NextResponse.json({
      review: {
        syntaxValid: true,
        onTrack: true,
        verdict: "minor_issues",
        issues: [],
        spokenFeedback: "Thanks for submitting — let's keep going.",
      },
    });
  }
}

import { NextResponse } from "next/server";
import { DSA_BY_SLUG } from "@/lib/dsa/catalog";
import { gradeSubmission, toLanguageId } from "@/lib/dsa/grade";
import { getOrCreateUser } from "@/lib/user";
import { rateLimit, friendlyError, RateLimitError } from "@/lib/reliability";

/**
 * Run a DSA submission against the SAMPLE (visible) tests only — never the hidden ones, never a
 * `DsaAttempt` write, never an AI review. This is the cheap "does it look right" loop; Submit
 * (submitAttemptAction) is the real grade that counts toward solved/streak.
 */
export async function POST(req: Request) {
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Sign in to run code." }, { status: 401 });

  try {
    rateLimit(user.id, "dsa-run", 30);
  } catch (e) {
    const retryAfter = e instanceof RateLimitError ? Math.ceil(e.retryAfterMs / 1000) : 30;
    return NextResponse.json({ error: friendlyError(e) }, { status: 429, headers: { "Retry-After": String(retryAfter) } });
  }

  let body: { slug?: string; language?: string; code?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const slug = String(body.slug ?? "");
  const languageLabel = String(body.language ?? "");
  const code = String(body.code ?? "");

  if (!DSA_BY_SLUG[slug]) return NextResponse.json({ error: "Unknown problem." }, { status: 404 });
  if (code.trim().length < 1) return NextResponse.json({ error: "Write some code first." }, { status: 400 });
  if (code.length > 50_000) return NextResponse.json({ error: "That's a lot of code — trim it down." }, { status: 400 });

  const languageId = toLanguageId(languageLabel);
  if (!languageId) return NextResponse.json({ error: "Unsupported language." }, { status: 400 });

  const grade = await gradeSubmission({ slug, language: languageId, code, only: "sample" });

  if (grade.verdict === "unverified") {
    return NextResponse.json({ unavailable: true, message: grade.message ?? "Running code isn't available right now." });
  }

  return NextResponse.json({ grade });
}

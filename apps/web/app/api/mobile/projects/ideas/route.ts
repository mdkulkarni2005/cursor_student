import { NextResponse } from "next/server";
import { generateProjectIdeas, withAiRetry, PROJECT_DIFFICULTIES, type ProjectDifficulty } from "@studentos/ai";
import { getOrCreateUser } from "@/lib/user";
import { rateLimit, friendlyError } from "@/lib/reliability";
import { assertWithinCostBudget } from "@/lib/entitlements";

/** No clarify-loop on mobile v1 — straight to suggestions (same generator the web clarify path lands on). */
export async function POST(req: Request) {
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!user.onboardedAt) return NextResponse.json({ error: "Complete onboarding first.", needsOnboarding: true }, { status: 409 });

  try {
    await rateLimit(user.id, "project-ideas");
    await assertWithinCostBudget(user);
  } catch (e) {
    return NextResponse.json({ error: friendlyError(e) }, { status: 429 });
  }

  let body: { interests?: string; difficulty?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const interests = body.interests?.trim() || undefined;
  const difficulty = (PROJECT_DIFFICULTIES as readonly string[]).includes(String(body.difficulty))
    ? (body.difficulty as ProjectDifficulty)
    : undefined;

  try {
    const { content } = await withAiRetry(
      () => generateProjectIdeas({ department: user.department ?? "Engineering", interests, difficulty }),
      { label: "project.ideas" },
    );
    return NextResponse.json({ ideas: content.ideas });
  } catch (err) {
    return NextResponse.json({ error: friendlyError(err) }, { status: 400 });
  }
}

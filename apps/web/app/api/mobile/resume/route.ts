import { NextResponse } from "next/server";
import { after } from "next/server";
import { createResumeDoc, runResumeGeneration } from "@/lib/resume/generate";
import { getOrCreateUser } from "@/lib/user";
import { rateLimit, friendlyError } from "@/lib/reliability";
import { assertWithinCostBudget } from "@/lib/entitlements";

export async function POST(req: Request) {
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!user.onboardedAt) return NextResponse.json({ error: "Complete onboarding first.", needsOnboarding: true }, { status: 409 });

  try {
    await rateLimit(user.id, "resume");
    await assertWithinCostBudget(user.id);
  } catch (e) {
    return NextResponse.json({ error: friendlyError(e) }, { status: 429 });
  }

  let body: { targetRole?: string; rawNotes?: string; contact?: Record<string, string> };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const input = {
    userId: user.id,
    targetRole: body.targetRole?.trim() || undefined,
    rawNotes: body.rawNotes?.trim() || undefined,
    contact: body.contact ?? {},
  };

  let docId: string;
  try {
    docId = await createResumeDoc(input);
  } catch (err) {
    return NextResponse.json({ error: friendlyError(err) }, { status: 400 });
  }

  after(() => runResumeGeneration(docId, input));
  return NextResponse.json({ docId }, { status: 201 });
}

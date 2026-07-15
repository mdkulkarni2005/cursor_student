import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/user";
import { generateProjectPlan } from "@/lib/projects/generate";
import { rateLimit, friendlyError } from "@/lib/reliability";
import { assertWithinCostBudget } from "@/lib/entitlements";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: docId } = await params;
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  try {
    await rateLimit(user.id, "project-plan");
    await assertWithinCostBudget(user.id);
  } catch (e) {
    return NextResponse.json({ error: friendlyError(e) }, { status: 429 });
  }

  const plan = await generateProjectPlan(user.id, docId);
  return NextResponse.json({ plan });
}

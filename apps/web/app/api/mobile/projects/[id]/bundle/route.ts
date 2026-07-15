import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/user";
import { generateProjectBundle } from "@/lib/projects/generate";
import { rateLimit, friendlyError } from "@/lib/reliability";
import { assertWithinCostBudget } from "@/lib/entitlements";

/** Generate the report + PPT + viva bundle for a finalized project. Synchronous (same as web). */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: docId } = await params;
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  try {
    await rateLimit(user.id, "project-bundle", 5);
    await assertWithinCostBudget(user.id);
  } catch (e) {
    return NextResponse.json({ error: friendlyError(e) }, { status: 429 });
  }

  const bundle = await generateProjectBundle(user.id, docId);
  return NextResponse.json({ bundle });
}

import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/user";
import { rateLimit, friendlyError, RateLimitError } from "@/lib/reliability";
import { saveLogicSimDraft, type LogicCanvas } from "@/lib/logic-sim/practice";

/** Silent background autosave of the freeform logic bench — no AI, no quota, no revalidation. */
export async function POST(req: Request) {
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Sign in to save." }, { status: 401 });

  try {
    await rateLimit(user.id, "logic-sim-draft", 60);
  } catch (e) {
    const retryAfter = e instanceof RateLimitError ? Math.ceil(e.retryAfterMs / 1000) : 30;
    return NextResponse.json({ error: friendlyError(e) }, { status: 429, headers: { "Retry-After": String(retryAfter) } });
  }

  let body: { canvas?: LogicCanvas };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!body.canvas || !Array.isArray(body.canvas.nodes) || !Array.isArray(body.canvas.edges)) {
    return NextResponse.json({ error: "Invalid canvas." }, { status: 400 });
  }

  await saveLogicSimDraft(user.id, body.canvas);
  return NextResponse.json({ ok: true });
}

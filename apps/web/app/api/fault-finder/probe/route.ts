import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/user";
import { rateLimit, friendlyError, RateLimitError } from "@/lib/reliability";
import { probeComponent } from "@/lib/fault-finder/practice";

/** A virtual multimeter probe — deterministic, no AI, cheap. Rate-limited only to prevent abuse,
 *  same as /api/dsa/run (no quota since nothing here costs AI money). */
export async function POST(req: Request) {
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Sign in to probe the circuit." }, { status: 401 });

  try {
    await rateLimit(user.id, "fault-finder-probe", 60);
  } catch (e) {
    const retryAfter = e instanceof RateLimitError ? Math.ceil(e.retryAfterMs / 1000) : 30;
    return NextResponse.json({ error: friendlyError(e) }, { status: 429, headers: { "Retry-After": String(retryAfter) } });
  }

  let body: { slug?: string; componentId?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const slug = String(body.slug ?? "");
  const componentId = String(body.componentId ?? "");
  const reading = probeComponent(slug, componentId);
  if (!reading) return NextResponse.json({ error: "Unknown scenario or component." }, { status: 404 });

  return NextResponse.json({ reading });
}

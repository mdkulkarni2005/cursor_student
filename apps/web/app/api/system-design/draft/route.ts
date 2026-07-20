import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/user";
import { rateLimit, friendlyError, RateLimitError } from "@/lib/reliability";
import { saveDesignDraft, type SystemDesignCanvas } from "@/lib/system-design/practice";
import { SYSTEM_DESIGN_BY_SLUG } from "@/lib/system-design/catalog";

/**
 * Silent background autosave of the in-progress canvas — no AI call, no quota, no revalidation.
 * Fired on a debounce from the client so a reload never loses un-submitted work.
 */
export async function POST(req: Request) {
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Sign in to save." }, { status: 401 });

  try {
    await rateLimit(user.id, "system-design-draft", 60);
  } catch (e) {
    const retryAfter = e instanceof RateLimitError ? Math.ceil(e.retryAfterMs / 1000) : 30;
    return NextResponse.json({ error: friendlyError(e) }, { status: 429, headers: { "Retry-After": String(retryAfter) } });
  }

  let body: { slug?: string; canvas?: SystemDesignCanvas };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const slug = String(body.slug ?? "");
  if (!SYSTEM_DESIGN_BY_SLUG[slug]) return NextResponse.json({ error: "Unknown scenario." }, { status: 404 });
  if (!body.canvas || !Array.isArray(body.canvas.nodes) || !Array.isArray(body.canvas.edges)) {
    return NextResponse.json({ error: "Invalid canvas." }, { status: 400 });
  }

  await saveDesignDraft(user.id, slug, body.canvas);
  return NextResponse.json({ ok: true });
}

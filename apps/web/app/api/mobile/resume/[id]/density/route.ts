import { NextResponse } from "next/server";
import { setResumeDensity } from "@/lib/resume/generate";
import { getOrCreateUser } from "@/lib/user";

/** "Fit to one page" toggle — re-renders the same content with tighter spacing. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  let body: { density?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const density = body.density === "tight" ? "tight" : "normal";

  try {
    await setResumeDensity(user.id, id, density);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Couldn't update." }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

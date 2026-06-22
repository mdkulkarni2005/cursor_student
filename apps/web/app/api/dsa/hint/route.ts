import { NextResponse } from "next/server";
import { dsaHint } from "@studentos/ai";
import { getOrCreateUser } from "@/lib/user";
import { DSA_BY_SLUG } from "@/lib/dsa/catalog";

export async function POST(req: Request) {
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const slug = String((body as { slug?: unknown })?.slug ?? "");
  const code = (body as { code?: unknown })?.code ? String((body as { code?: unknown }).code) : undefined;
  const language = (body as { language?: unknown })?.language ? String((body as { language?: unknown }).language) : undefined;

  const problem = DSA_BY_SLUG[slug];
  if (!problem) return NextResponse.json({ error: "Unknown problem." }, { status: 404 });

  try {
    const { hint } = await dsaHint({ title: problem.title, prompt: problem.prompt, code, language });
    return NextResponse.json({ hint });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Couldn't fetch a hint." }, { status: 502 });
  }
}

import { NextResponse } from "next/server";
import { createFeedback } from "@/lib/actions/feedback";

export async function POST(req: Request) {
  let body: { type?: string; message?: string; page?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const result = await createFeedback(String(body.type ?? ""), String(body.message ?? ""), String(body.page ?? ""));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}

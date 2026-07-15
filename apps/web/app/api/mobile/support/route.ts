import { NextResponse } from "next/server";
import { createSupportTicket } from "@/lib/actions/support";

export async function POST(req: Request) {
  let body: { subject?: string; message?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const result = await createSupportTicket(String(body.subject ?? ""), String(body.message ?? ""));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}

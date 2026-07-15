import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/user";
import { addLabReportTurn } from "@/lib/lab-reports/generate";
import { rateLimit, friendlyError } from "@/lib/reliability";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: docId } = await params;
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  let body: { message?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const message = String(body.message ?? "").trim();
  if (!message) return NextResponse.json({ error: "Say something first." }, { status: 400 });

  try {
    await rateLimit(user.id, "lab-report-tutor", 30);
    await addLabReportTurn(user.id, docId, message);
  } catch (e) {
    return NextResponse.json({ error: friendlyError(e) }, { status: 429 });
  }
  return NextResponse.json({ ok: true });
}

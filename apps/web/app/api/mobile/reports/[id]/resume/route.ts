import { NextResponse } from "next/server";
import { after } from "next/server";
import { getOrCreateUser } from "@/lib/user";
import { markReportGenerating, resumeReportGeneration } from "@/lib/reports/generate";

/** Answer the mid-generation clarifying questions for a report paused at NEEDS_INPUT. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: docId } = await params;
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  let body: { answers?: Record<string, string> };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const answers = body.answers && typeof body.answers === "object" ? body.answers : {};

  await markReportGenerating(docId, user.id);
  after(() => resumeReportGeneration(user.id, docId, answers));
  return NextResponse.json({ ok: true });
}

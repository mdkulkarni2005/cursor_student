import { NextResponse } from "next/server";
import { requireRecruiter } from "@/lib/recruiter";
import { stopSandboxForRecruiter } from "@/lib/live-interview";

export async function POST(req: Request) {
  const guard = await requireRecruiter();
  if (!guard.ok) return NextResponse.json({ error: "Sign in as an approved recruiter." }, { status: 401 });

  let body: { scheduleId?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const scheduleId = String(body.scheduleId ?? "");
  if (!scheduleId) return NextResponse.json({ error: "Missing scheduleId." }, { status: 400 });

  try {
    const result = await stopSandboxForRecruiter(scheduleId, guard.recruiter.id);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Interview not found." }, { status: 404 });
  }
}

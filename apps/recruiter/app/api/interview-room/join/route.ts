import { NextResponse } from "next/server";
import { requireRecruiter } from "@/lib/recruiter";
import { joinRoomAsRecruiter } from "@/lib/live-interview";

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

  const result = await joinRoomAsRecruiter(scheduleId, guard.recruiter.id);
  if ("notFound" in result) return NextResponse.json({ error: "Interview not found." }, { status: 404 });
  if ("waiting" in result) return NextResponse.json({ waiting: true });
  return NextResponse.json({ token: result.token, wsUrl: result.wsUrl });
}

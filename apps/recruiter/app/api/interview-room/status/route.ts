import { NextResponse } from "next/server";
import { requireRecruiter } from "@/lib/recruiter";
import { getLobbyStatusForRecruiter } from "@/lib/live-interview";

/**
 * Read-only poll target for the candidate-lobby-monitor — cheap "has the candidate opened the
 * page / finished checks / been admitted yet" check, without minting a LiveKit token on every tick
 * the way joinRoomAsRecruiter would.
 */
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
    const status = await getLobbyStatusForRecruiter(scheduleId, guard.recruiter.id);
    return NextResponse.json(status);
  } catch {
    return NextResponse.json({ error: "Interview not found." }, { status: 404 });
  }
}

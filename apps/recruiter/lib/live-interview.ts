import { prisma } from "@studentos/db";
import { mintToken, finalizeInterview } from "@studentos/live-interview";

/**
 * The recruiter never CREATES a room — only joins one the candidate already started
 * (apps/web's createOrGetRoom). If no InterviewRoom row exists yet, the candidate hasn't opened
 * the interview page yet.
 */
export async function joinRoomAsRecruiter(scheduleId: string, recruiterId: string) {
  const schedule = await prisma.interviewSchedule.findUnique({ where: { id: scheduleId } });
  if (!schedule || schedule.recruiterId !== recruiterId) return { notFound: true as const };

  const room = await prisma.interviewRoom.findUnique({ where: { scheduleId } });
  if (!room || room.status === "UNAVAILABLE") return { waiting: true as const };
  // Once the interview has been explicitly ended, never re-mint a token — rejoin is only for
  // accidental disconnects while the interview is still open (see finalizeInterview).
  if (room.status === "ENDED") return { ended: true as const };

  const tok = await mintToken({ roomName: room.livekitRoom, identity: recruiterId, role: "recruiter" });
  if (tok.unavailable) return { waiting: true as const };
  return { unavailable: false as const, token: tok.token!, wsUrl: tok.wsUrl! };
}

/**
 * The recruiter's explicit "End interview" — the only hard-terminator in this flow. Expires the
 * LiveKit room, marks the schedule COMPLETED, and generates the AI hire/no-hire judgment from the
 * transcript + the shared editor's final code snapshot.
 */
export async function endInterviewAsRecruiter(scheduleId: string, recruiterId: string, finalCode?: string): Promise<void> {
  const schedule = await prisma.interviewSchedule.findUnique({ where: { id: scheduleId } });
  if (!schedule || schedule.recruiterId !== recruiterId) throw new Error("Not found");
  await finalizeInterview(scheduleId, finalCode);
}

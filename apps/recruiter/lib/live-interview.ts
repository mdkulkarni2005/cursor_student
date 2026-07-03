import { prisma } from "@studentos/db";
import { mintToken } from "@studentos/live-interview";

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

  const tok = await mintToken({ roomName: room.livekitRoom, identity: recruiterId, role: "recruiter" });
  if (tok.unavailable) return { waiting: true as const };
  return { unavailable: false as const, token: tok.token!, wsUrl: tok.wsUrl! };
}

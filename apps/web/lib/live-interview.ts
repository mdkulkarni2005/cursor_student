import { prisma, type InterviewFlagKind } from "@studentos/db";
import { ensureRoom, mintToken, finalizeInterview, type ParticipantRole } from "@studentos/live-interview";
import { hasJoinableRealInterview } from "@/lib/real-interview";

/** Same shape as ownedSchedule() in lib/actions/interview-schedule.ts — manual join, no Prisma relation. */
export async function ownedAcceptedSchedule(scheduleId: string, studentId: string) {
  const schedule = await prisma.interviewSchedule.findUnique({ where: { id: scheduleId } });
  if (!schedule || schedule.studentId !== studentId) throw new Error("Not found");
  if (schedule.status !== "ACCEPTED") throw new Error("Interview not accepted.");
  return schedule;
}

/** Idempotent room create-or-get. Fails closed to UNAVAILABLE — never a fake success row. */
export async function createOrGetRoom(scheduleId: string) {
  const existing = await prisma.interviewRoom.findUnique({ where: { scheduleId } });
  if (existing && existing.status !== "UNAVAILABLE") return existing;

  const result = await ensureRoom(scheduleId);
  if (result.unavailable) {
    return prisma.interviewRoom.upsert({
      where: { scheduleId },
      create: { scheduleId, livekitRoom: `interview-${scheduleId}`, status: "UNAVAILABLE" },
      update: { status: "UNAVAILABLE" },
    });
  }
  return prisma.interviewRoom.upsert({
    where: { scheduleId },
    create: { scheduleId, livekitRoom: result.roomName!, status: "PENDING" },
    update: { status: "PENDING" },
  });
}

export async function joinRoom(scheduleId: string, identity: string, role: ParticipantRole, name?: string) {
  const room = await prisma.interviewRoom.findUnique({ where: { scheduleId } });
  if (!room || room.status === "UNAVAILABLE") return { unavailable: true as const };
  // Once either side has explicitly ended the interview, the room is gone for good — never
  // re-mint a token or flip status back to ACTIVE. Rejoin is only for accidental disconnects.
  if (room.status === "ENDED") return { ended: true as const };
  const tok = await mintToken({ roomName: room.livekitRoom, identity, role, name });
  if (tok.unavailable) return { unavailable: true as const };
  if (room.status === "PENDING") {
    await prisma.interviewRoom.update({ where: { scheduleId }, data: { status: "ACTIVE" } });
  }
  return { unavailable: false as const, token: tok.token!, wsUrl: tok.wsUrl! };
}

/** Proctoring signal write. MULTI_MONITOR's "once per session" guarantee is client-side only —
 *  see use-proctoring-signals.ts's throttle; nothing here prevents a duplicate row. */
export async function recordFlag(scheduleId: string, kind: InterviewFlagKind, detail?: string) {
  return prisma.interviewFlag.create({ data: { scheduleId, kind, detail } });
}

export type PreJoinChecks = { fullscreen: boolean; monitorCount: number | null };

/** Candidate finished local pre-join checks and entered the LiveKit lobby (no tracks published
 *  yet). Sets candidateReadyAt + the checks summary once; returns whether the recruiter has
 *  already admitted them, so a reconnecting candidate can skip straight to publishing tracks. */
export async function markCandidateReady(scheduleId: string, checks?: PreJoinChecks) {
  const room = await prisma.interviewRoom.findUnique({ where: { scheduleId } });
  if (!room || room.status === "UNAVAILABLE" || room.status === "ENDED") {
    return { admitted: false };
  }
  if (!room.candidateReadyAt) {
    await prisma.interviewRoom.update({
      where: { scheduleId },
      data: { candidateReadyAt: new Date(), candidateChecks: checks ?? undefined },
    });
  }
  return { admitted: room.admittedAt !== null };
}

/** Read-only poll target — a safety net alongside the LiveKit "admitted" data message, since a
 *  single dropped/late data packet shouldn't strand the candidate in the lobby forever. */
export async function getReadyStatus(scheduleId: string) {
  const room = await prisma.interviewRoom.findUnique({
    where: { scheduleId },
    select: { admittedAt: true },
  });
  return { admitted: room?.admittedAt !== null && room?.admittedAt !== undefined };
}

export async function endInterviewRoom(scheduleId: string, finalCode?: string) {
  await finalizeInterview(scheduleId, finalCode);
}

/** Re-check the join window (not just ACCEPTED) — a stale accepted-but-expired schedule shouldn't mint a token. */
export { hasJoinableRealInterview };

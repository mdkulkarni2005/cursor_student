import { prisma, type InterviewFlagKind } from "@studentos/db";
import { ensureRoom, mintToken, endRoom, type ParticipantRole } from "@studentos/live-interview";
import { judgeRealInterview } from "@studentos/ai";
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

export async function joinRoom(scheduleId: string, identity: string, role: ParticipantRole) {
  const room = await prisma.interviewRoom.findUnique({ where: { scheduleId } });
  if (!room || room.status === "UNAVAILABLE") return { unavailable: true as const };
  const tok = await mintToken({ roomName: room.livekitRoom, identity, role });
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

export async function endInterviewRoom(scheduleId: string) {
  const room = await prisma.interviewRoom.findUnique({ where: { scheduleId } });
  if (!room) return;
  await endRoom(room.livekitRoom);
  await prisma.interviewRoom.update({ where: { scheduleId }, data: { status: "ENDED", endedAt: new Date() } });

  // Best-effort AI judgment — never lets a failure here block the end action itself.
  try {
    await generateJudgment(scheduleId);
  } catch {
    // Swallowed intentionally.
  }
}

async function generateJudgment(scheduleId: string): Promise<void> {
  const [schedule, lines] = await Promise.all([
    prisma.interviewSchedule.findUnique({ where: { id: scheduleId }, include: { student: { select: { name: true } } } }),
    prisma.interviewTranscriptLine.findMany({ where: { scheduleId }, orderBy: { occurredAt: "asc" } }),
  ]);
  if (!schedule) return;

  const { judgment, model } = await judgeRealInterview({
    transcriptLines: lines.map((l) => ({ speaker: l.speaker, text: l.text })),
    candidateName: schedule.student.name ?? undefined,
    recruiterNote: schedule.note ?? undefined,
  });

  await prisma.interviewJudgment.upsert({
    where: { scheduleId },
    create: {
      scheduleId,
      fitVerdict: judgment.fitVerdict,
      summary: judgment.summary,
      strengths: judgment.strengths,
      concerns: judgment.concerns,
      recommendation: judgment.recommendation,
      model,
    },
    update: {
      fitVerdict: judgment.fitVerdict,
      summary: judgment.summary,
      strengths: judgment.strengths,
      concerns: judgment.concerns,
      recommendation: judgment.recommendation,
      model,
    },
  });
}

/** Re-check the join window (not just ACCEPTED) — a stale accepted-but-expired schedule shouldn't mint a token. */
export { hasJoinableRealInterview };

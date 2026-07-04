import { prisma } from "@studentos/db";
import { judgeRealInterview } from "@studentos/ai";
import { stopSandbox } from "@studentos/sandbox-execution";
import { endRoom } from "./livekit";

/**
 * Shared finalize core for BOTH apps/web (candidate) and apps/recruiter — either side's explicit
 * "End interview" action calls this after its own auth/ownership check. Deletes the LiveKit room
 * (so no rejoin can revive it — see joinRoom/joinRoomAsRecruiter's ENDED guard), tears down the
 * coding sandbox if one was launched, marks the schedule COMPLETED, and generates the AI judgment
 * best-effort (neither the sandbox teardown nor the judgment may block the end action itself).
 */
export async function finalizeInterview(scheduleId: string, finalCode?: string): Promise<void> {
  const room = await prisma.interviewRoom.findUnique({ where: { scheduleId } });
  if (room && room.status !== "ENDED") {
    await endRoom(room.livekitRoom);
    await prisma.interviewRoom.update({
      where: { scheduleId },
      data: { status: "ENDED", endedAt: new Date(), finalCode: finalCode ?? room.finalCode },
    });
  }

  await prisma.interviewSchedule.update({ where: { id: scheduleId }, data: { status: "COMPLETED" } });

  // Best-effort sandbox teardown — never lets a failure here block the end action itself.
  try {
    const sandbox = await prisma.interviewSandbox.findUnique({ where: { scheduleId } });
    if (sandbox && sandbox.status === "RUNNING") {
      await stopSandbox(sandbox.sandboxId);
      await prisma.interviewSandbox.update({ where: { scheduleId }, data: { status: "STOPPED", endedAt: new Date() } });
    }
  } catch {
    // Swallowed intentionally.
  }

  // Best-effort AI judgment — never lets a failure here block the end action itself.
  try {
    await generateJudgment(scheduleId, finalCode);
  } catch {
    // Swallowed intentionally.
  }
}

async function generateJudgment(scheduleId: string, finalCode?: string): Promise<void> {
  const [schedule, lines, room] = await Promise.all([
    prisma.interviewSchedule.findUnique({ where: { id: scheduleId }, include: { student: { select: { name: true } } } }),
    prisma.interviewTranscriptLine.findMany({ where: { scheduleId }, orderBy: { occurredAt: "asc" } }),
    prisma.interviewRoom.findUnique({ where: { scheduleId } }),
  ]);
  if (!schedule) return;

  const { judgment, model } = await judgeRealInterview({
    transcriptLines: lines.map((l) => ({ speaker: l.speaker, text: l.text })),
    candidateName: schedule.student.name ?? undefined,
    recruiterNote: schedule.note ?? undefined,
    finalCode: finalCode ?? room?.finalCode ?? undefined,
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

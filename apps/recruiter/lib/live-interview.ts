import { prisma } from "@studentos/db";
import { mintToken, finalizeInterview } from "@studentos/live-interview";
import { createSandbox, stopSandbox } from "@studentos/sandbox-execution";
import { joinWindowState } from "./interview-schedule";

/**
 * The recruiter never CREATES a room — only joins one the candidate already started
 * (apps/web's createOrGetRoom). If no InterviewRoom row exists yet, the candidate hasn't opened
 * the interview page yet.
 */
export async function joinRoomAsRecruiter(scheduleId: string, recruiterId: string, name?: string) {
  const schedule = await prisma.interviewSchedule.findUnique({ where: { id: scheduleId } });
  if (!schedule || schedule.recruiterId !== recruiterId) return { notFound: true as const };
  // Outside the join window, refuse to mint a token even if a stale InterviewRoom row exists —
  // this is what stops a recruiter from connecting into an old/expired schedule's room while the
  // candidate has moved on to a different (rescheduled) one. Distinguish too-early from expired —
  // they read very differently to the recruiter.
  const window = joinWindowState(schedule.status, schedule.proposedAt);
  if (window === "too-early") return { tooEarly: true as const };
  if (window !== "joinable") return { expired: true as const };

  const room = await prisma.interviewRoom.findUnique({ where: { scheduleId } });
  if (!room || room.status === "UNAVAILABLE") return { waiting: true as const };
  // Once the interview has been explicitly ended, never re-mint a token — rejoin is only for
  // accidental disconnects while the interview is still open (see finalizeInterview).
  if (room.status === "ENDED") return { ended: true as const };

  const tok = await mintToken({ roomName: room.livekitRoom, identity: recruiterId, role: "recruiter", name });
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

/**
 * The recruiter admits a candidate who's finished pre-join checks and is sitting in the LiveKit
 * lobby. Sets admittedAt once — idempotent, since the recruiter's UI may retry or the candidate may
 * reconnect and re-check via markCandidateReady.
 */
export async function admitCandidate(scheduleId: string, recruiterId: string) {
  const schedule = await prisma.interviewSchedule.findUnique({ where: { id: scheduleId } });
  if (!schedule || schedule.recruiterId !== recruiterId) throw new Error("Not found");
  const window = joinWindowState(schedule.status, schedule.proposedAt);
  if (window === "too-early") throw new Error("This interview isn't joinable yet — the window opens 15 minutes before the scheduled time.");
  if (window !== "joinable") throw new Error("This interview's join window has passed.");

  const room = await prisma.interviewRoom.findUnique({ where: { scheduleId } });
  if (!room || room.status === "UNAVAILABLE" || room.status === "ENDED") throw new Error("Interview room not available.");

  if (!room.admittedAt) {
    await prisma.interviewRoom.update({ where: { scheduleId }, data: { admittedAt: new Date() } });
  }
  return { admitted: true as const };
}

/**
 * Read-only lobby status for the recruiter's candidate-lobby-monitor. Distinct from
 * joinRoomAsRecruiter — that mints a LiveKit token every call (wasteful and unnecessary while just
 * polling for "has the candidate opened the page yet"); this only reads InterviewRoom.
 */
export async function getLobbyStatusForRecruiter(scheduleId: string, recruiterId: string) {
  const schedule = await prisma.interviewSchedule.findUnique({ where: { id: scheduleId } });
  if (!schedule || schedule.recruiterId !== recruiterId) throw new Error("Not found");
  const window = joinWindowState(schedule.status, schedule.proposedAt);
  if (window === "too-early") return { exists: false as const, tooEarly: true as const };
  if (window !== "joinable") return { exists: false as const, expired: true as const };

  const room = await prisma.interviewRoom.findUnique({ where: { scheduleId } });
  if (!room || room.status === "UNAVAILABLE") return { exists: false as const };
  return {
    exists: true as const,
    ended: room.status === "ENDED",
    candidateReadyAt: room.candidateReadyAt,
    admittedAt: room.admittedAt,
    checks: room.candidateChecks as { fullscreen: boolean; monitorCount: number | null } | null,
  };
}

/** Recruiter's "Launch Code" — creates (or resumes) the shared Vercel Sandbox for this interview's
 *  coding round. Idempotent: re-launching an already-RUNNING sandbox just returns it. */
export async function createSandboxForRecruiter(scheduleId: string, recruiterId: string) {
  const schedule = await prisma.interviewSchedule.findUnique({ where: { id: scheduleId } });
  if (!schedule || schedule.recruiterId !== recruiterId) throw new Error("Not found");

  const existing = await prisma.interviewSandbox.findUnique({ where: { scheduleId } });
  if (existing && existing.status === "RUNNING") return { unavailable: false as const, sandboxId: existing.sandboxId };

  const result = await createSandbox(scheduleId);
  if (result.unavailable) {
    await prisma.interviewSandbox.upsert({
      where: { scheduleId },
      create: { scheduleId, sandboxId: `unavailable-${scheduleId}`, status: "UNAVAILABLE" },
      update: { status: "UNAVAILABLE" },
    });
    return { unavailable: true as const, message: result.message };
  }

  await prisma.interviewSandbox.upsert({
    where: { scheduleId },
    create: { scheduleId, sandboxId: result.sandboxId, status: "RUNNING" },
    update: { sandboxId: result.sandboxId, status: "RUNNING", endedAt: null },
  });
  return { unavailable: false as const, sandboxId: result.sandboxId };
}

/** Recruiter's explicit sandbox teardown — separate from ending the whole interview (see
 *  finalizeInterview, which also tears this down best-effort when the call itself ends). */
export async function stopSandboxForRecruiter(scheduleId: string, recruiterId: string) {
  const schedule = await prisma.interviewSchedule.findUnique({ where: { id: scheduleId } });
  if (!schedule || schedule.recruiterId !== recruiterId) throw new Error("Not found");

  const sandbox = await prisma.interviewSandbox.findUnique({ where: { scheduleId } });
  if (!sandbox || sandbox.status !== "RUNNING") return { stopped: true as const };

  await stopSandbox(sandbox.sandboxId);
  await prisma.interviewSandbox.update({ where: { scheduleId }, data: { status: "STOPPED", endedAt: new Date() } });
  return { stopped: true as const };
}

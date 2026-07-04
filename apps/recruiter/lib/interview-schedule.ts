import { prisma } from "@studentos/db";

// Same window as apps/web/lib/real-interview.ts's JOIN_WINDOW_OPEN_MS/JOIN_WINDOW_CLOSE_MS — kept
// in sync so the recruiter and candidate never disagree on whether a schedule is still joinable.
const JOIN_WINDOW_OPEN_MS = 15 * 60_000;
const JOIN_WINDOW_CLOSE_MS = 7 * 60 * 60_000;

export function isJoinable(status: string, proposedAt: Date): boolean {
  if (status !== "ACCEPTED") return false;
  const now = Date.now();
  const t = proposedAt.getTime();
  return now >= t - JOIN_WINDOW_OPEN_MS && now <= t + JOIN_WINDOW_CLOSE_MS;
}

/** Distinguishes *why* a schedule isn't joinable right now — "too early" vs "window passed" read
 *  very differently to a recruiter, so don't collapse them into one generic "Window passed". */
export function joinWindowState(status: string, proposedAt: Date): "joinable" | "too-early" | "expired" | "not-accepted" {
  if (status !== "ACCEPTED") return "not-accepted";
  const now = Date.now();
  const t = proposedAt.getTime();
  if (now < t - JOIN_WINDOW_OPEN_MS) return "too-early";
  if (now > t + JOIN_WINDOW_CLOSE_MS) return "expired";
  return "joinable";
}

export type ScheduleListItem = {
  id: string;
  studentId: string;
  studentName: string;
  status: string;
  proposedAt: Date;
  meetingLink: string | null;
  note: string | null;
  studentNote: string | null;
  outcome: string | null;
  outcomeNote: string | null;
  joinableNow: boolean;
  joinWindow: ReturnType<typeof joinWindowState>;
};

/** All schedules this recruiter has proposed, newest slot first. */
export async function listRecruiterSchedules(recruiterId: string): Promise<ScheduleListItem[]> {
  const rows = await prisma.interviewSchedule.findMany({
    where: { recruiterId },
    orderBy: { proposedAt: "desc" },
    include: { student: { select: { id: true, name: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    studentId: r.student.id,
    studentName: r.student.name ?? "Student",
    status: r.status,
    proposedAt: r.proposedAt,
    meetingLink: r.meetingLink,
    note: r.note,
    studentNote: r.studentNote,
    outcome: r.outcome,
    outcomeNote: r.outcomeNote,
    joinableNow: isJoinable(r.status, r.proposedAt),
    joinWindow: joinWindowState(r.status, r.proposedAt),
  }));
}

/** Schedules for one student, for the recruiter's own view of that student's profile. */
export async function listSchedulesForStudent(recruiterId: string, studentId: string) {
  return prisma.interviewSchedule.findMany({
    where: { recruiterId, studentId },
    orderBy: { proposedAt: "desc" },
  });
}

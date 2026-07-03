import { prisma } from "@studentos/db";

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
  }));
}

/** Schedules for one student, for the recruiter's own view of that student's profile. */
export async function listSchedulesForStudent(recruiterId: string, studentId: string) {
  return prisma.interviewSchedule.findMany({
    where: { recruiterId, studentId },
    orderBy: { proposedAt: "desc" },
  });
}

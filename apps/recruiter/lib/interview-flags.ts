import { prisma } from "@studentos/db";

export type FlagListItem = {
  id: string;
  kind: string;
  detail: string | null;
  occurredAt: Date;
};

/**
 * Flags for a schedule the recruiter owns. Manual join by scheduleId (InterviewFlag has no
 * Prisma relation to InterviewSchedule — see packages/db/prisma/schema.prisma), so ownership is
 * checked against InterviewSchedule.recruiterId first.
 */
export async function listFlagsForSchedule(scheduleId: string, recruiterId: string): Promise<FlagListItem[] | null> {
  const schedule = await prisma.interviewSchedule.findUnique({ where: { id: scheduleId } });
  if (!schedule || schedule.recruiterId !== recruiterId) return null;

  const flags = await prisma.interviewFlag.findMany({
    where: { scheduleId },
    orderBy: { occurredAt: "desc" },
  });
  return flags.map((f) => ({ id: f.id, kind: f.kind, detail: f.detail, occurredAt: f.occurredAt }));
}

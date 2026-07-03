import { prisma } from "@studentos/db";

const JOIN_WINDOW_OPEN_MS = 15 * 60_000; // opens 15 min before proposedAt
const JOIN_WINDOW_CLOSE_MS = 120 * 60_000; // closes 120 min after proposedAt (tunable)

/**
 * Does this student have an ACCEPTED real-interview schedule inside the join window right now?
 * `proposedAt` doubles as the interview time — InterviewSchedule has no separate `scheduledAt`.
 *
 * This is condition ① of the "Real Interview" section gate only (docs/BUILD_ORDER.md Phase E0).
 * Condition ② (Phase G desktop-app check) is not implemented yet — see hasDesktopAppStub below.
 */
export async function hasJoinableRealInterview(studentId: string): Promise<boolean> {
  const now = Date.now();
  const row = await prisma.interviewSchedule.findFirst({
    where: {
      studentId,
      status: "ACCEPTED",
      proposedAt: {
        gte: new Date(now - JOIN_WINDOW_CLOSE_MS),
        lte: new Date(now + JOIN_WINDOW_OPEN_MS),
      },
    },
    select: { id: true },
  });
  return !!row;
}

/**
 * Stub for Phase G's desktop-app check (condition ②). Hard-coded true until the Electron app
 * exists — replace with a real client-reported/verified check when Phase G lands.
 */
export function hasDesktopAppStub(): boolean {
  return true;
}

/** Same window as hasJoinableRealInterview, but returns the actual rows for the join page. */
export async function joinableRealInterviews(studentId: string) {
  const now = Date.now();
  return prisma.interviewSchedule.findMany({
    where: {
      studentId,
      status: "ACCEPTED",
      proposedAt: {
        gte: new Date(now - JOIN_WINDOW_CLOSE_MS),
        lte: new Date(now + JOIN_WINDOW_OPEN_MS),
      },
    },
    orderBy: { proposedAt: "asc" },
    include: { recruiter: { select: { companyName: true } } },
  });
}

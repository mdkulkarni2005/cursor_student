import { prisma, type Prisma } from "@studentos/db";
import type { CandidateProfileSummary } from "@studentos/ai";

export type StudentListItem = {
  id: string;
  name: string;
  department: string | null;
  semester: string | null;
  careerGoal: string | null;
  institution: string | null;
  dsaSolved: number;
};

/**
 * Every student visible to recruiters (`visibleToRecruiters`), optionally narrowed by the
 * recruiter's own branch/department filter (chosen in the UI, not tied to their onboarding
 * industry). No department filter = show every visible student.
 */
export async function listVisibleStudents(params: { department?: string | null; query?: string }): Promise<StudentListItem[]> {
  const where: Prisma.UserWhereInput = {
    visibleToRecruiters: true,
    ...(params.department ? { department: params.department } : {}),
    ...(params.query ? { name: { contains: params.query, mode: "insensitive" } } : {}),
  };

  const users = await prisma.user.findMany({
    where,
    orderBy: { visibleToRecruitersAt: "desc" },
    take: 100,
    include: {
      institution: { select: { name: true } },
      _count: { select: { dsaAttempts: true } },
    },
  });

  const solvedCounts = await prisma.dsaAttempt.groupBy({
    by: ["userId"],
    where: { userId: { in: users.map((u) => u.id) }, solved: true },
    _count: { _all: true },
  });
  const solvedByUser = new Map(solvedCounts.map((s) => [s.userId, s._count._all]));

  return users.map((u) => ({
    id: u.id,
    name: u.name ?? "Student",
    department: u.department,
    semester: u.semester,
    careerGoal: u.careerGoal,
    institution: u.institution?.name ?? null,
    dsaSolved: solvedByUser.get(u.id) ?? 0,
  }));
}

/** Distinct department/branch values among visible students, for the recruiter's filter dropdown. */
export async function listVisibleDepartments(): Promise<string[]> {
  const rows = await prisma.user.findMany({
    where: { visibleToRecruiters: true, department: { not: null } },
    select: { department: true },
    distinct: ["department"],
  });
  return rows.map((r) => r.department!).sort((a, b) => a.localeCompare(b));
}

export type StudentDetail = StudentListItem & {
  skills: string[];
  links: { github?: string; linkedin?: string; portfolio?: string };
  projects: { id: string; title: string }[];
  resume: { id: string } | null;
  interviewStats: { count: number; avgScore: number | null };
};

/** Full recruiter-facing profile for one student — requires `visibleToRecruiters`. */
export async function getStudentDetail(id: string): Promise<StudentDetail | null> {
  const user = await prisma.user.findUnique({
    where: { id },
    include: { institution: { select: { name: true } } },
  });
  if (!user || !user.visibleToRecruiters) return null;

  const [solvedCount, projectDocs, resumeDoc, interviewDocs] = await Promise.all([
    prisma.dsaAttempt.count({ where: { userId: id, solved: true } }),
    prisma.document.findMany({ where: { ownerId: id, type: "PROJECT" }, orderBy: { updatedAt: "desc" }, take: 6, select: { id: true, title: true } }),
    prisma.document.findFirst({ where: { ownerId: id, type: "RESUME", status: "READY" }, orderBy: { updatedAt: "desc" }, select: { id: true } }),
    prisma.document.findMany({
      where: { ownerId: id, type: "INTERVIEW", status: "READY" },
      select: { content: { select: { data: true } } },
    }),
  ]);

  // Interview evaluation JSON shape is packages/ai/src/interview.ts InterviewEvaluationSchema —
  // { overall: number, ... }. Read defensively since it's freeform Json, not a typed column.
  const scores = interviewDocs
    .map((d) => (d.content?.data as { overall?: unknown } | null)?.overall)
    .filter((v): v is number => typeof v === "number");
  const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

  let skills: string[] = [];
  let links: StudentDetail["links"] = {};
  if (resumeDoc) {
    const content = await prisma.documentContent.findUnique({ where: { documentId: resumeDoc.id }, select: { data: true } });
    const resume = content?.data as { skills?: { items?: string[] }[]; contact?: { github?: string; linkedin?: string; portfolio?: string } } | undefined;
    skills = resume?.skills?.flatMap((g) => g.items ?? []).slice(0, 16) ?? [];
    links = { github: resume?.contact?.github, linkedin: resume?.contact?.linkedin, portfolio: resume?.contact?.portfolio };
  }

  return {
    id: user.id,
    name: user.name ?? "Student",
    department: user.department,
    semester: user.semester,
    careerGoal: user.careerGoal,
    institution: user.institution?.name ?? null,
    dsaSolved: solvedCount,
    skills,
    links,
    projects: projectDocs.map((p) => ({ id: p.id, title: p.title })),
    resume: resumeDoc ? { id: resumeDoc.id } : null,
    interviewStats: { count: interviewDocs.length, avgScore },
  };
}

/**
 * Compact per-candidate summaries fed to the job-match AI (packages/ai/src/job-match.ts) — one
 * batched aggregation over the whole candidate pool rather than N calls to getStudentDetail, since
 * this runs for every "Find candidates" click. Prior real-interview summaries are scoped to THIS
 * recruiter's own past interviews with the candidate (InterviewJudgment has no recruiterId of its
 * own — joined manually via InterviewSchedule), so one recruiter's notes never leak to another.
 */
export async function getCandidateProfileSummaries(
  studentIds: string[],
  recruiterId: string,
): Promise<CandidateProfileSummary[]> {
  if (studentIds.length === 0) return [];

  const [users, solvedCounts, resumeDocs, projectDocs, interviewDocs, ownSchedules] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: studentIds } },
      select: { id: true, name: true, department: true, careerGoal: true },
    }),
    prisma.dsaAttempt.groupBy({
      by: ["userId"],
      where: { userId: { in: studentIds }, solved: true },
      _count: { _all: true },
    }),
    prisma.document.findMany({
      where: { ownerId: { in: studentIds }, type: "RESUME", status: "READY" },
      orderBy: { updatedAt: "desc" },
      select: { id: true, ownerId: true, content: { select: { data: true } } },
    }),
    prisma.document.findMany({
      where: { ownerId: { in: studentIds }, type: "PROJECT" },
      select: { ownerId: true, title: true },
    }),
    prisma.document.findMany({
      where: { ownerId: { in: studentIds }, type: "INTERVIEW", status: "READY" },
      select: { ownerId: true, content: { select: { data: true } } },
    }),
    prisma.interviewSchedule.findMany({
      where: { recruiterId, studentId: { in: studentIds } },
      select: { id: true, studentId: true },
    }),
  ]);

  const solvedByUser = new Map(solvedCounts.map((s) => [s.userId, s._count._all]));

  const resumeByUser = new Map<string, { skills: string[]; summary: string | null }>();
  for (const doc of resumeDocs) {
    if (resumeByUser.has(doc.ownerId)) continue; // first (most recent) resume per user only
    const resume = doc.content?.data as { skills?: { items?: string[] }[]; summary?: string } | undefined;
    resumeByUser.set(doc.ownerId, {
      skills: resume?.skills?.flatMap((g) => g.items ?? []).slice(0, 16) ?? [],
      summary: resume?.summary ?? null,
    });
  }

  const projectsByUser = new Map<string, string[]>();
  for (const doc of projectDocs) {
    const list = projectsByUser.get(doc.ownerId) ?? [];
    list.push(doc.title);
    projectsByUser.set(doc.ownerId, list);
  }

  const scoresByUser = new Map<string, number[]>();
  for (const doc of interviewDocs) {
    const overall = (doc.content?.data as { overall?: unknown } | null)?.overall;
    if (typeof overall === "number") {
      const list = scoresByUser.get(doc.ownerId) ?? [];
      list.push(overall);
      scoresByUser.set(doc.ownerId, list);
    }
  }

  const scheduleIdsByUser = new Map<string, string[]>();
  for (const s of ownSchedules) {
    const list = scheduleIdsByUser.get(s.studentId) ?? [];
    list.push(s.id);
    scheduleIdsByUser.set(s.studentId, list);
  }
  const allScheduleIds = ownSchedules.map((s) => s.id);
  const judgments = allScheduleIds.length
    ? await prisma.interviewJudgment.findMany({
        where: { scheduleId: { in: allScheduleIds } },
        select: { scheduleId: true, summary: true },
      })
    : [];
  const judgmentByScheduleId = new Map(judgments.map((j) => [j.scheduleId, j.summary]));

  return users.map((u) => {
    const scores = scoresByUser.get(u.id) ?? [];
    const scheduleIds = scheduleIdsByUser.get(u.id) ?? [];
    const priorSummaries = scheduleIds.map((id) => judgmentByScheduleId.get(id)).filter((s): s is string => !!s);
    return {
      studentId: u.id,
      name: u.name ?? "Student",
      department: u.department,
      careerGoal: u.careerGoal,
      dsaSolved: solvedByUser.get(u.id) ?? 0,
      skills: resumeByUser.get(u.id)?.skills ?? [],
      projectTitles: projectsByUser.get(u.id) ?? [],
      resumeSummary: resumeByUser.get(u.id)?.summary ?? null,
      mockInterviewAvgScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
      priorRealInterviewSummaries: priorSummaries,
    };
  });
}

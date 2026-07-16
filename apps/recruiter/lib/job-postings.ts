import { prisma } from "@studentos/db";
import { matchCandidatesToJob } from "@studentos/ai";
import { listVisibleStudents, getCandidateProfileSummaries } from "./student-profile";

export async function listJobPostings(recruiterId: string) {
  return prisma.jobPosting.findMany({ where: { recruiterId }, orderBy: { createdAt: "desc" } });
}

export async function getJobPosting(id: string, recruiterId: string) {
  const posting = await prisma.jobPosting.findUnique({ where: { id } });
  if (!posting || posting.recruiterId !== recruiterId) return null;
  return posting;
}

export type MatchedCandidate = {
  studentId: string;
  name: string;
  department: string | null;
  matchPercent: number;
  rationale: string;
};

/** Matches for a posting, sorted best-fit first. Empty until "Find candidates" has been run once. */
export async function listMatches(jobPostingId: string): Promise<MatchedCandidate[]> {
  const matches = await prisma.jobMatch.findMany({
    where: { jobPostingId },
    orderBy: { matchPercent: "desc" },
  });
  if (matches.length === 0) return [];

  const students = await prisma.user.findMany({
    where: { id: { in: matches.map((m) => m.studentId) } },
    select: { id: true, name: true, department: true },
  });
  const studentById = new Map(students.map((s) => [s.id, s]));

  return matches
    .map((m) => {
      const student = studentById.get(m.studentId);
      if (!student) return null;
      return {
        studentId: m.studentId,
        name: student.name ?? "Student",
        department: student.department,
        matchPercent: m.matchPercent,
        rationale: m.rationale,
      };
    })
    .filter((m): m is MatchedCandidate => m !== null);
}

/**
 * Marks the posting RUNNING — call this synchronously from the server action BEFORE scheduling
 * `runFindCandidates` via `after()`, so the button/page reflects "in progress" immediately rather
 * than only after the (potentially multi-batch, multi-AI-call) scoring work finishes. Guards
 * against a duplicate run: returns false (no-op) if already RUNNING.
 */
export async function startFindCandidates(jobPostingId: string, recruiterId: string): Promise<boolean> {
  const posting = await getJobPosting(jobPostingId, recruiterId);
  if (!posting) throw new Error("Job posting not found.");
  if (posting.matchStatus === "RUNNING") return false;

  await prisma.jobPosting.update({
    where: { id: jobPostingId },
    data: { matchStatus: "RUNNING", matchError: null, matchStartedAt: new Date(), matchFinishedAt: null },
  });
  return true;
}

/**
 * Scores every currently-visible student against this posting and upserts JobMatch rows. Meant to
 * run OUTSIDE the request lifecycle (see `after()` in apps/recruiter/app/jobs/actions.ts) so a
 * large candidate pool's multiple sequential AI-batch calls can't hit a serverless request
 * timeout. Never throws past this function — failures are recorded on the posting itself so the
 * UI can show them, matching the GenerationJob SUCCEEDED/FAILED convention used elsewhere.
 */
export async function runFindCandidates(jobPostingId: string, recruiterId: string): Promise<void> {
  try {
    const posting = await getJobPosting(jobPostingId, recruiterId);
    if (!posting) return;

    // Matches against the first page only (same 100-candidate cap as before pagination was added
    // to the students list) — widening this to the full visible pool is a separate change.
    const pool = await listVisibleStudents({});
    const summaries = await getCandidateProfileSummaries(pool.items.map((s) => s.id), recruiterId);

    const { matches, model } = await matchCandidatesToJob(posting.title, posting.description, summaries);

    await Promise.all(
      matches.map((m) =>
        prisma.jobMatch.upsert({
          where: { jobPostingId_studentId: { jobPostingId, studentId: m.studentId } },
          create: { jobPostingId, studentId: m.studentId, matchPercent: m.matchPercent, rationale: m.rationale, model },
          update: { matchPercent: m.matchPercent, rationale: m.rationale, model, computedAt: new Date() },
        }),
      ),
    );

    await prisma.jobPosting.update({
      where: { id: jobPostingId },
      data: { matchStatus: "SUCCEEDED", matchFinishedAt: new Date() },
    });
  } catch (err) {
    await prisma.jobPosting
      .update({
        where: { id: jobPostingId },
        data: {
          matchStatus: "FAILED",
          matchError: err instanceof Error ? err.message : String(err),
          matchFinishedAt: new Date(),
        },
      })
      .catch(() => {});
  }
}

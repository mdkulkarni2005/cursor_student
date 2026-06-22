import { prisma } from "@studentos/db";
import { reviewDsaSolution, type DsaReview } from "@studentos/ai";
import { DSA_BY_SLUG } from "@/lib/dsa/catalog";
import { computeStreak, type StreakInfo } from "@/lib/dsa/streak";
import { gradeSubmission, toLanguageId, type GradeResult } from "@/lib/dsa/grade";

export type GradeAttemptInput = {
  userId: string;
  slug: string;
  code: string;
  /** UI label, e.g. "Python". */
  language: string;
};

/** What we store in the attempt's `review` JSON: the run verdict + an optional AI review. */
export type AttemptReview = { grade: GradeResult; aiReview?: DsaReview };

/**
 * Grade a submission by RUNNING it against the problem's test cases, persist the attempt
 * (append-only), and — only when it didn't fully pass — fetch an AI review to help. `solved` is
 * set strictly from the real verdict (never self-marked); an unverified run is never solved.
 */
export async function gradeAttempt(input: GradeAttemptInput): Promise<{ attemptId: string; review: AttemptReview }> {
  const problem = DSA_BY_SLUG[input.slug];
  if (!problem) throw new Error("Unknown problem.");
  const code = input.code.trim();
  if (code.length < 10) throw new Error("Write a bit more code before submitting.");

  const languageId = toLanguageId(input.language);
  const grade = languageId
    ? await gradeSubmission({ slug: input.slug, language: languageId, code })
    : ({ verdict: "unverified", passed: 0, total: 0, outcomes: [], message: "Pick a supported language." } as GradeResult);

  // Cost rule: only spend AI tokens when the student needs help (didn't pass). Never block on it.
  let aiReview: DsaReview | undefined;
  if (grade.verdict !== "passed") {
    try {
      aiReview = (await reviewDsaSolution({ title: problem.title, prompt: problem.prompt, code, language: input.language })).review;
    } catch {
      aiReview = undefined;
    }
  }

  const review: AttemptReview = { grade, aiReview };
  const attempt = await prisma.dsaAttempt.create({
    data: {
      userId: input.userId,
      problemSlug: input.slug,
      language: input.language,
      code,
      solved: grade.verdict === "passed",
      review: review as unknown as object,
    },
  });
  return { attemptId: attempt.id, review };
}

export type DsaProgress = {
  streak: StreakInfo;
  solvedSlugs: string[];
  attemptedSlugs: string[];
  totalAttempts: number;
  solvedCount: number;
};

/** Aggregate a user's DSA progress (streak derived from timestamps; solved = real test pass). */
export async function getDsaProgress(userId: string): Promise<DsaProgress> {
  const attempts = await prisma.dsaAttempt.findMany({
    where: { userId },
    select: { problemSlug: true, solved: true, createdAt: true },
  });

  const streak = computeStreak(attempts.map((a) => a.createdAt));
  const solvedSlugs = [...new Set(attempts.filter((a) => a.solved).map((a) => a.problemSlug))];
  const attemptedSlugs = [...new Set(attempts.map((a) => a.problemSlug))];

  return {
    streak,
    solvedSlugs,
    attemptedSlugs,
    totalAttempts: attempts.length,
    solvedCount: solvedSlugs.length,
  };
}

/** The latest attempt for a specific problem (to prefill the editor + show last review). */
export async function getLatestAttempt(userId: string, slug: string) {
  return prisma.dsaAttempt.findFirst({
    where: { userId, problemSlug: slug },
    orderBy: { createdAt: "desc" },
  });
}

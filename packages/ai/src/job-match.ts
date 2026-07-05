/**
 * AI-driven candidate-to-job-posting match scoring (Phase: job matching). Recruiter-only —
 * students never see this. Scores the whole candidate pool for one posting in a single call
 * (chunked only if the pool is large) rather than one call per student, mirroring the
 * stub/PRIMARY/FALLBACK shape used across this package (see real-interview-judgment.ts).
 */
import { generateObject } from "ai";
import { z } from "zod";

const PRIMARY_MODEL = "anthropic/claude-sonnet-4.6";
const FALLBACK_MODEL = "google/gemini-3.5-flash";

// Candidates are chunked into batches of this size per generateObject call — keeps prompt size
// bounded regardless of how large the visible-student pool grows.
const BATCH_SIZE = 40;

export type CandidateProfileSummary = {
  studentId: string;
  name: string;
  department?: string | null;
  careerGoal?: string | null;
  dsaSolved: number;
  skills: string[];
  projectTitles: string[];
  resumeSummary?: string | null;
  mockInterviewAvgScore?: number | null;
  priorRealInterviewSummaries?: string[];
};

const MatchResultSchema = z.object({
  studentId: z.string(),
  matchPercent: z.number().int().min(0).max(100),
  rationale: z.string().min(1),
});

export const JobMatchBatchSchema = z.object({
  matches: z.array(MatchResultSchema),
});

export type JobMatchResult = z.infer<typeof MatchResultSchema>;

const MATCH_SYSTEM = [
  "You are helping a recruiter rank candidates against ONE job posting. Score every candidate",
  "given to you — do not skip any. Base the match percentage on the whole picture: DSA/coding",
  "activity, projects, resume content, mock-interview performance, and prior real-interview",
  "judgments, weighed against what the job description actually asks for. A candidate can score",
  "very differently across two different postings — that's expected, judge each posting fresh.",
  "Be honest and differentiate — don't cluster everyone in the same range. This is never shown to",
  "the candidate, only to the recruiter, so be direct in the rationale.",
].join("\n");

function candidateText(c: CandidateProfileSummary): string {
  const lines = [
    `studentId: ${c.studentId}`,
    `name: ${c.name}`,
    c.department ? `department: ${c.department}` : "",
    c.careerGoal ? `career goal: ${c.careerGoal}` : "",
    `DSA problems solved: ${c.dsaSolved}`,
    c.skills.length ? `skills: ${c.skills.join(", ")}` : "",
    c.projectTitles.length ? `projects: ${c.projectTitles.join(", ")}` : "",
    c.resumeSummary ? `resume summary: ${c.resumeSummary}` : "",
    typeof c.mockInterviewAvgScore === "number" ? `mock interview avg score (0-100): ${c.mockInterviewAvgScore}` : "",
    c.priorRealInterviewSummaries?.length
      ? `prior real-interview summaries: ${c.priorRealInterviewSummaries.join(" | ")}`
      : "",
  ].filter(Boolean);
  return lines.join("\n");
}

function stubMatches(jobTitle: string, candidates: CandidateProfileSummary[]): JobMatchResult[] {
  return candidates.map((c) => {
    const base = Math.min(60, c.dsaSolved * 3 + c.skills.length * 2);
    const matchPercent = Math.max(5, Math.min(95, base || 20));
    return {
      studentId: c.studentId,
      matchPercent,
      rationale: `Local preview match against "${jobTitle}" — not a real assessment.`,
    };
  });
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function matchCandidatesToJob(
  jobTitle: string,
  jobDescription: string,
  candidates: CandidateProfileSummary[],
): Promise<{ matches: JobMatchResult[]; model: string }> {
  if (candidates.length === 0) return { matches: [], model: "n/a" };

  if (process.env.AI_DRIVER === "stub") {
    return { matches: stubMatches(jobTitle, candidates), model: "stub" };
  }

  const batches = chunk(candidates, BATCH_SIZE);
  const allMatches: JobMatchResult[] = [];
  let usedModel = "";
  let lastError: unknown;

  for (const batch of batches) {
    const prompt = [
      `Job title: ${jobTitle}`,
      `Job description:\n${jobDescription}`,
      `Candidates (score every one of these ${batch.length}):\n${batch.map(candidateText).join("\n\n")}`,
    ].join("\n\n");

    let batchDone = false;
    for (const model of [PRIMARY_MODEL, FALLBACK_MODEL]) {
      try {
        const { object } = await generateObject({ model, schema: JobMatchBatchSchema, system: MATCH_SYSTEM, prompt });
        allMatches.push(...object.matches);
        usedModel = model;
        batchDone = true;
        break;
      } catch (err) {
        lastError = err;
      }
    }
    if (!batchDone) {
      throw new Error(`Job match scoring failed: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
    }
  }

  return { matches: allMatches, model: usedModel };
}

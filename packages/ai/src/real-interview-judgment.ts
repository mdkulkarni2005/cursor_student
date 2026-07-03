/**
 * AI-assisted, recruiter-facing judgment for a REAL recruiter-led interview (Phase E5) — distinct
 * from `interview.ts`'s `evaluateInterview`, which serves the unrelated self-serve AI mock
 * interview. The recruiter makes the hiring call; this only summarizes and flags things worth
 * their attention, mirroring `evaluateInterview`'s stub/PRIMARY/FALLBACK shape.
 */
import { generateObject } from "ai";
import { z } from "zod";

const PRIMARY_MODEL = "anthropic/claude-sonnet-4.6";
const FALLBACK_MODEL = "google/gemini-3.5-flash";

export const RealInterviewJudgmentSchema = z.object({
  fitVerdict: z.enum(["strong_fit", "fit", "weak_fit", "not_fit"]),
  summary: z.string().min(1),
  strengths: z.array(z.string()).default([]),
  concerns: z.array(z.string()).default([]),
  recommendation: z.string().min(1),
});
export type RealInterviewJudgment = z.infer<typeof RealInterviewJudgmentSchema>;

export type TranscriptLine = { speaker: string; text: string };

export type JudgeRealInterviewRequest = {
  transcriptLines: TranscriptLine[];
  candidateName?: string;
  recruiterNote?: string;
};

const JUDGMENT_SYSTEM = [
  "You are assisting a recruiter after a real, human-conducted interview by summarizing the",
  "transcript. You are NOT the decision-maker — the recruiter makes the final call. Your job is to",
  "give them an honest, specific summary of what was said, not a score to defer to.",
  "Base everything ONLY on the transcript provided. If the transcript is thin or ambiguous, say so",
  "plainly rather than inventing confidence you don't have.",
].join("\n");

function transcriptText(lines: TranscriptLine[]): string {
  if (lines.length === 0) return "(no transcript captured)";
  return lines.map((l) => `${l.speaker}: ${l.text}`).join("\n");
}

function stubJudgment(req: JudgeRealInterviewRequest): RealInterviewJudgment {
  const candidateLines = req.transcriptLines.filter((l) => l.speaker === "candidate");
  const totalLen = candidateLines.reduce((s, l) => s + l.text.length, 0);
  const fitVerdict: RealInterviewJudgment["fitVerdict"] =
    candidateLines.length === 0 ? "weak_fit" : totalLen > 400 ? "fit" : "weak_fit";
  return {
    fitVerdict,
    summary:
      candidateLines.length === 0
        ? "No candidate speech was captured for this session. (Local preview judgment.)"
        : `The candidate spoke across ${candidateLines.length} turns. (Local preview judgment — not a real assessment.)`,
    strengths: candidateLines.length > 0 ? ["Participated actively in the conversation"] : [],
    concerns: candidateLines.length === 0 ? ["No transcript captured — verify the call actually ran"] : [],
    recommendation: "This is a stub judgment for local testing — review the actual call yourself before deciding.",
  };
}

export async function judgeRealInterview(req: JudgeRealInterviewRequest): Promise<{ judgment: RealInterviewJudgment; model: string }> {
  if (process.env.AI_DRIVER === "stub") {
    return { judgment: RealInterviewJudgmentSchema.parse(stubJudgment(req)), model: "stub" };
  }

  const prompt = [
    req.candidateName ? `Candidate: ${req.candidateName}` : "",
    req.recruiterNote ? `Recruiter's note when scheduling: ${req.recruiterNote}` : "",
    `Transcript:\n${transcriptText(req.transcriptLines)}`,
  ].filter(Boolean).join("\n\n");

  let lastError: unknown;
  for (const model of [PRIMARY_MODEL, FALLBACK_MODEL]) {
    try {
      const { object } = await generateObject({ model, schema: RealInterviewJudgmentSchema, system: JUDGMENT_SYSTEM, prompt });
      return { judgment: object, model };
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(`Real-interview judgment failed: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

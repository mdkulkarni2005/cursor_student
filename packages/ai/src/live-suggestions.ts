/**
 * On-screen-only interview question suggestions for the recruiter during a live real interview
 * (Phase: live suggestions). Never enforced — purely advisory. Polled periodically from the
 * transcript captured so far (InterviewTranscriptLine); see suggestions/route.ts in apps/recruiter.
 *
 * The one hard UX constraint: don't reshuffle the panel every poll. The prompt asks the model to
 * KEEP any suggestion whose topic the transcript shows hasn't come up yet, in its same slot, and
 * only replace the ones that have clearly been asked/answered already.
 */
import { generateObject } from "ai";
import { z } from "zod";
import type { TranscriptLine } from "./real-interview-judgment";

const PRIMARY_MODEL = "anthropic/claude-sonnet-4.6";
const FALLBACK_MODEL = "google/gemini-3.5-flash";

const SUGGESTION_COUNT = 4;

export type LiveSuggestionsRequest = {
  transcriptLines: TranscriptLine[];
  /** JD text if this interview is linked to a JobPosting; otherwise the recruiter's own note. */
  positionContext?: string;
  /** The recruiter's current on-screen list — preserved in place where still unasked. */
  currentSuggestions: string[];
};

const SuggestionsSchema = z.object({
  suggestions: z.array(z.string().min(1)).length(SUGGESTION_COUNT),
});

const SUGGESTIONS_SYSTEM = [
  `You maintain a live list of exactly ${SUGGESTION_COUNT} candidate interview questions shown on`,
  "the recruiter's screen during a real, human-conducted interview. This is a suggestion panel",
  "only — the recruiter is never required to ask any of these.",
  "You will be given the current list and the transcript so far. For each current suggestion:",
  "if the transcript shows the recruiter has NOT asked it (or an equivalent) yet, KEEP IT in the",
  "SAME POSITION, worded exactly as before. If the transcript shows it (or a close equivalent) has",
  "already been asked/answered, replace ONLY that slot with a new, relevant question informed by",
  "the position context and what's been discussed so far. Do not reorder or reword questions that",
  "haven't been asked yet — the recruiter is watching this list and reshuffling it is disruptive.",
].join("\n");

function transcriptText(lines: TranscriptLine[]): string {
  if (lines.length === 0) return "(no transcript yet)";
  return lines.map((l) => `${l.speaker}: ${l.text}`).join("\n");
}

function stubSuggestions(req: LiveSuggestionsRequest): string[] {
  const fallback = [
    "Walk me through a project you're proud of.",
    "How do you approach debugging a tricky issue?",
    "Tell me about a time you disagreed with a teammate.",
    "What are you looking to grow in your next role?",
  ];
  if (req.currentSuggestions.length === SUGGESTION_COUNT) return req.currentSuggestions;
  return fallback;
}

export async function generateLiveSuggestions(req: LiveSuggestionsRequest): Promise<{ suggestions: string[]; model: string }> {
  if (process.env.AI_DRIVER === "stub") {
    return { suggestions: stubSuggestions(req), model: "stub" };
  }

  const prompt = [
    req.positionContext ? `Position context:\n${req.positionContext}` : "",
    `Current on-screen suggestions:\n${req.currentSuggestions.map((s, i) => `${i + 1}. ${s}`).join("\n") || "(none yet)"}`,
    `Transcript so far:\n${transcriptText(req.transcriptLines)}`,
  ].filter(Boolean).join("\n\n");

  let lastError: unknown;
  for (const model of [PRIMARY_MODEL, FALLBACK_MODEL]) {
    try {
      const { object } = await generateObject({ model, schema: SuggestionsSchema, system: SUGGESTIONS_SYSTEM, prompt });
      return { suggestions: object.suggestions, model };
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(`Live suggestions failed: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

import { generateObject, generateText } from "ai";
import { z } from "zod";

const PRIMARY_MODEL = "anthropic/claude-sonnet-4.6";
const FALLBACK_MODEL = "google/gemini-3.5-flash";

/**
 * DSA solution REVIEW — complexity exposure + code suggestions (the plan's ask).
 * This is NOT a correctness gate (we don't execute code; AI verdicts on correctness are
 * unreliable). It gives the student feedback to learn from; "solved" is self-marked.
 */
export const DsaReviewSchema = z.object({
  timeComplexity: z.string().min(1),
  spaceComplexity: z.string().min(1),
  feedback: z.string().min(1),
  suggestions: z.array(z.string()).default([]),
});
export type DsaReview = z.infer<typeof DsaReviewSchema>;

export type DsaReviewRequest = {
  title: string;
  prompt: string;
  code: string;
  language?: string;
};

function stubReview(req: DsaReviewRequest): DsaReview {
  const lines = req.code.split("\n").filter((l) => l.trim()).length;
  const nested = /for[\s\S]*for|while[\s\S]*while/.test(req.code);
  return {
    timeComplexity: nested ? "Looks like O(n²) — there's a nested loop." : "Roughly O(n) for a single pass.",
    spaceComplexity: /\b(map|set|dict|\{\}|\[\])/i.test(req.code) ? "O(n) — you're using an auxiliary structure." : "O(1) auxiliary.",
    feedback: `Your solution to "${req.title}" is ${lines} lines. ${nested ? "Consider whether a hash map or two-pointer pass removes the nested loop." : "Structure looks reasonable — check your edge cases (empty input, single element)."} (Local preview review.)`,
    suggestions: [
      "Name variables for intent, not single letters, where it aids readability.",
      nested ? "Try trading time for space with a hash map for an O(n) pass." : "Add a couple of edge-case checks at the top.",
      "State your time/space complexity in a comment — interviewers love it.",
    ],
  };
}

export async function reviewDsaSolution(req: DsaReviewRequest): Promise<{ review: DsaReview; model: string }> {
  if (process.env.AI_DRIVER === "stub") {
    return { review: DsaReviewSchema.parse(stubReview(req)), model: "stub" };
  }

  const system = [
    "You are a DSA mentor reviewing a student's solution. Give constructive, specific feedback.",
    "Estimate time and space complexity from the code. Point out bugs or edge cases you notice, and suggest concrete improvements.",
    "Do NOT claim you executed the code. Frame correctness as observations ('this may miss the empty-array case'), not a verified verdict.",
    "Be encouraging and concise.",
  ].join("\n");
  const prompt = [
    `Problem: ${req.title}`,
    `Statement: ${req.prompt}`,
    req.language ? `Language: ${req.language}` : "",
    `Student's code:\n${req.code.slice(0, 6000)}`,
  ]
    .filter(Boolean)
    .join("\n");

  let lastError: unknown;
  for (const model of [PRIMARY_MODEL, FALLBACK_MODEL]) {
    try {
      const { object } = await generateObject({ model, schema: DsaReviewSchema, system, prompt });
      return { review: object, model };
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(`DSA review failed: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

// ----------------------- Hint nudge -----------------------

export type DsaHintRequest = { title: string; prompt: string; code?: string; language?: string };

function stubDsaHint(req: DsaHintRequest): string {
  return `Restate "${req.title}" in your own words and write down the input and expected output. Start with the brute-force approach, then ask: is there a data structure (hash map, set, two pointers, sorting) that removes the repeated work? Code the simple version first — you can optimize after it passes.`;
}

/** A coaching nudge for a stuck student — points at the approach, never the full solution. */
export async function dsaHint(req: DsaHintRequest): Promise<{ hint: string; model: string }> {
  if (process.env.AI_DRIVER === "stub") return { hint: stubDsaHint(req), model: "stub" };

  const system = [
    "You are a DSA mentor. The student is stuck on a problem and asked for a hint.",
    "Give a SHORT (2–3 sentences) nudge that helps them find the right approach or data structure.",
    "ABSOLUTELY do NOT write the solution code or reveal the full algorithm step by step — only point them in the right direction so they still solve it themselves.",
    "If they've shared code, gently flag the one thing most likely holding them back. Output only the hint text.",
  ].join("\n");
  const prompt = [
    `Problem: ${req.title}`,
    `Statement: ${req.prompt}`,
    req.language ? `Language: ${req.language}` : "",
    req.code?.trim() ? `Their current code:\n${req.code.slice(0, 3000)}` : "They haven't written code yet.",
  ]
    .filter(Boolean)
    .join("\n");

  let lastError: unknown;
  for (const model of [PRIMARY_MODEL, FALLBACK_MODEL]) {
    try {
      const { text } = await generateText({ model, system, prompt });
      return { hint: text, model };
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(`DSA hint failed: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

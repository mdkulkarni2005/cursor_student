import { generateObject } from "ai";
import { z } from "zod";

/**
 * Clarifying-questions loop. Before generating anything, decide whether there's
 * enough context. If not, ask the user instead of guessing. Each question is
 * single-select, multi-select, or free text (with a custom option always allowed).
 */
export const ClarifyQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  type: z.enum(["single", "multi", "text"]),
  options: z.array(z.string()).default([]),
});
export const ClarifyAssessmentSchema = z.object({
  ready: z.boolean(),
  questions: z.array(ClarifyQuestionSchema).max(4).default([]),
});
export type ClarifyQuestion = z.infer<typeof ClarifyQuestionSchema>;
export type ClarifyAssessment = z.infer<typeof ClarifyAssessmentSchema>;

export type ClarifyRequest = {
  /** "report" | "presentation" | "assignment" | … */
  task: string;
  topic?: string;
  context?: string;
  department?: string;
};

function stubAssess(req: ClarifyRequest): ClarifyAssessment {
  const thin = !req.topic || req.topic.trim().length < 12 || !req.context;
  if (!thin) return { ready: true, questions: [] };
  return {
    ready: false,
    questions: [
      {
        id: "focus",
        question: `What should this ${req.task} focus on?`,
        type: "text",
        options: [],
      },
      {
        id: "depth",
        question: "How detailed should it be?",
        type: "single",
        options: ["Brief overview", "Standard", "In-depth"],
      },
      {
        id: "audience",
        question: "Who is it for?",
        type: "single",
        options: ["College submission", "Seminar / panel", "Self-study"],
      },
    ],
  };
}

export async function assessContext(req: ClarifyRequest): Promise<ClarifyAssessment> {
  if (process.env.AI_DRIVER === "stub") return stubAssess(req);

  const system =
    "You decide whether there is enough context to produce a high-quality output for the student. If context is sufficient, set ready=true with no questions. If not, set ready=false and ask up to 4 short clarifying questions — each single-select, multi-select, or free text, with helpful options where appropriate. Never ask more than necessary.";
  const prompt = [
    `Task: generate a ${req.task}.`,
    req.topic ? `Topic so far: "${req.topic}"` : "No topic provided.",
    req.department ? `Department: ${req.department}` : "",
    req.context ? `Context/guidelines provided: ${req.context}` : "No extra context provided.",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const { object } = await generateObject({
      model: "anthropic/claude-sonnet-4.6",
      schema: ClarifyAssessmentSchema,
      system,
      prompt,
    });
    return object;
  } catch {
    // If assessment fails, don't block generation.
    return { ready: true, questions: [] };
  }
}

export type DraftGapRequest = {
  task: string;
  topic?: string;
  context?: string;
  draft?: string;
  department?: string;
};

/**
 * Mid-generation gap check: after a draft exists, decide whether something specific
 * is missing that only the student can answer. Powers the NEEDS_INPUT checkpoint —
 * questions can appear *after* a partial draft, not just before generation.
 */
export async function assessDraftGaps(req: DraftGapRequest): Promise<ClarifyAssessment> {
  if (process.env.AI_DRIVER === "stub") {
    const thin = !req.context || req.context.trim().length < 5;
    if (!thin) return { ready: true, questions: [] };
    return {
      ready: false,
      questions: [
        {
          id: "specifics",
          question: "To finish this properly, what specific method, data, or result should it include?",
          type: "text",
          options: [],
        },
      ],
    };
  }

  const system =
    "You review a draft and decide whether it is missing specific information that ONLY the student can provide (their actual method, data, results, constraints). If it's complete enough, set ready=true. Otherwise ask up to 2 specific questions.";
  const prompt = [
    `Task: ${req.task} on "${req.topic ?? ""}".`,
    req.department ? `Department: ${req.department}` : "",
    "Draft so far:",
    (req.draft ?? "").slice(0, 4000),
    "",
    "Is anything specific missing that only the student can answer?",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const { object } = await generateObject({
      model: "anthropic/claude-sonnet-4.6",
      schema: ClarifyAssessmentSchema,
      system,
      prompt,
    });
    return object;
  } catch {
    return { ready: true, questions: [] };
  }
}

/** Fold the user's answers back into a context string for the generator. */
export function answersToContext(
  questions: ClarifyQuestion[],
  answers: Record<string, string>,
): string {
  return questions
    .map((q) => {
      const a = answers[q.id]?.trim();
      return a ? `${q.question} → ${a}` : "";
    })
    .filter(Boolean)
    .join("\n");
}

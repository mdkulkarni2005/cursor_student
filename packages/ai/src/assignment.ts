import { generateObject, type ModelMessage } from "ai";
import { z } from "zod";
import { AssignmentSolutionSchema, type AssignmentSolution } from "@studentos/documents";
import { cachedSystem, logCacheUsage } from "./cache";

const PRIMARY_MODEL = "anthropic/claude-sonnet-4.6";
const FALLBACK_MODEL = "google/gemini-3.5-flash";

export type AssignmentTurn = { speaker: "student" | "tutor"; content: string };

export type AssignmentRequest = {
  questionText?: string;
  instructions?: string;
  subject?: string;
  /** Optional photo/screenshot of the question for vision models. */
  image?: { data: Uint8Array; mediaType: string };
};

function stubSolution(req: AssignmentRequest): AssignmentSolution {
  const q = req.questionText?.slice(0, 160) || "the uploaded question";
  return {
    questionSummary: `Solve: ${q}`,
    approach:
      "Break the problem into clear steps, apply the relevant concept, and compute the result. (Locally stubbed — the real model reads the actual question, including photos.)",
    steps: [
      { heading: "Step 1 — Understand", detail: "Identify what is given and what is being asked." },
      { heading: "Step 2 — Method", detail: "Choose the appropriate formula or approach for this topic." },
      { heading: "Step 3 — Work it out", detail: "Apply the method step by step to reach the result." },
    ],
    finalAnswer: "The final answer follows from the steps above. (Stubbed answer for local development.)",
  };
}

export type GenerateAssignmentResult = { solution: AssignmentSolution; model: string };

export async function generateAssignmentSolution(
  req: AssignmentRequest,
): Promise<GenerateAssignmentResult> {
  if (process.env.AI_DRIVER === "stub") {
    return { solution: AssignmentSolutionSchema.parse(stubSolution(req)), model: "stub" };
  }

  const system =
    "You are an academic assignment solver for engineering students. Read the question (which may be a photo), then produce a correct, clear, step-by-step worked solution showing formulas and calculations. If it's a coding question, include working code. Write it as genuine student work.";

  const textPrompt = [
    req.subject ? `Subject: ${req.subject}` : "",
    req.questionText ? `Question: ${req.questionText}` : "The question is in the attached image.",
    req.instructions ? `Additional instructions: ${req.instructions}` : "",
    "Provide a one-line question summary, a brief approach, worked steps, and the final answer. Include code only if relevant.",
  ]
    .filter(Boolean)
    .join("\n");

  const messages: ModelMessage[] = [
    {
      role: "user",
      content: req.image
        ? [
            { type: "text", text: textPrompt },
            { type: "image", image: req.image.data, mediaType: req.image.mediaType },
          ]
        : [{ type: "text", text: textPrompt }],
    },
  ];

  let lastError: unknown;
  for (const model of [PRIMARY_MODEL, FALLBACK_MODEL]) {
    try {
      const { object } = await generateObject({ model, schema: AssignmentSolutionSchema, system, messages });
      return { solution: object, model };
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(
    `Assignment solving failed on both models: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
  );
}

// ---------------- Multi-turn feedback loop (#8.2) ----------------

const AssignmentFollowUpSchema = z.object({
  /** The tutor's conversational reply to the student. */
  reply: z.string().min(1),
  /** A full revised solution — ONLY when the student's message warrants changing it. */
  revisedSolution: AssignmentSolutionSchema.nullish(),
});
export type AssignmentFollowUp = { reply: string; revisedSolution?: AssignmentSolution | null };

export type AssignmentFollowUpRequest = {
  solution: AssignmentSolution;
  conversation: AssignmentTurn[];
  message: string;
  subject?: string;
};

function stubFollowUp(req: AssignmentFollowUpRequest): AssignmentFollowUp {
  const m = req.message.toLowerCase();
  const wantsChange = /(formula|redo|wrong|change|instead|use |mistake|incorrect|step \d)/.test(m);
  if (wantsChange) {
    return {
      reply: `Good point — I've reworked the solution to address "${req.message.slice(0, 80)}". Check the updated steps. (Local preview.)`,
      revisedSolution: {
        ...req.solution,
        approach: `${req.solution.approach} (Revised per your feedback: ${req.message.slice(0, 80)}.)`,
        steps: [...req.solution.steps, { heading: `Step ${req.solution.steps.length + 1} — Revision`, detail: `Adjusted based on your note: ${req.message.slice(0, 120)}.` }],
      },
    };
  }
  return {
    reply: `About "${req.message.slice(0, 80)}": yes — here's the reasoning. Walk through the relevant step again and confirm the formula matches your given quantities. Ask me to redo any step if it still looks off. (Local preview.)`,
  };
}

/** Multi-turn tutoring: answer a student's follow-up and revise the solution when warranted. */
export async function assignmentFollowUp(req: AssignmentFollowUpRequest): Promise<{ result: AssignmentFollowUp; model: string }> {
  if (process.env.AI_DRIVER === "stub") {
    return { result: stubFollowUp(req), model: "stub" };
  }

  // Stable prefix (cached): tutor instructions + the current solution — re-sent every follow-up.
  // It only changes when the solution is revised, so most turns are cache reads.
  const cachedPrefix = [
    "You are a patient tutor helping a student with their assignment solution. The student may ask which formula to use, question a step, or report a mistake.",
    "Answer their message clearly and helpfully. If their feedback means the worked solution should change, return a FULL revised solution in revisedSolution; otherwise omit it (just reply).",
    "Never change the solution unnecessarily. Keep the same structure (summary, approach, steps, final answer, optional code).",
    req.subject ? `Subject: ${req.subject}` : "",
    `Current solution:\n${JSON.stringify(req.solution)}`,
  ].filter(Boolean).join("\n\n");
  // Changing tail (uncached): the conversation so far + the student's new message.
  const prompt = [
    req.conversation.length ? `Conversation so far:\n${req.conversation.map((t) => `${t.speaker}: ${t.content}`).join("\n")}` : "",
    `Student's new message: ${req.message}`,
  ].filter(Boolean).join("\n\n");
  const messages: ModelMessage[] = [cachedSystem(cachedPrefix), { role: "user", content: prompt }];

  let lastError: unknown;
  for (const model of [PRIMARY_MODEL, FALLBACK_MODEL]) {
    try {
      const { object, providerMetadata } = await generateObject({ model, schema: AssignmentFollowUpSchema, messages });
      logCacheUsage("assignment.followup", providerMetadata);
      return { result: object, model };
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(`Assignment follow-up failed: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

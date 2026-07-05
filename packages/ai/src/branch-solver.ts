import { generateObject, type ModelMessage } from "ai";
import { z } from "zod";
import { AssignmentSolutionSchema, type AssignmentSolution } from "@studentos/documents";
import { cachedSystem, logCacheUsage } from "./cache";
import { costCentsFromUsage } from "./pricing";

const PRIMARY_MODEL = "anthropic/claude-sonnet-4.6";
const FALLBACK_MODEL = "google/gemini-3.5-flash";

/**
 * Generic numerical/design solver for non-CS branches (Mechanical, Civil, Electrical, ECE,
 * Chemical). Every feature shares the exact same output shape as the Assignment Solver
 * (question / approach / steps / final answer) — only the system prompt differs per feature, so
 * this reuses AssignmentSolutionSchema + renderAssignmentDocx rather than a parallel schema.
 * Each new branch phase (Phases 3-6) just adds one entry to SOLVER_PROMPTS below.
 */
export const SOLVER_PROMPTS: Record<string, string> = {
  "mech-solver":
    "You are a mechanical engineering numerical solver. Read the question (which may be a photo), identify the topic (strength of materials, thermodynamics, fluid mechanics, machine design, gears, etc.), then produce a correct, unit-checked, step-by-step worked solution with formulas, substituted values, and units carried through every step.",
  "structural-checker":
    "You are a civil engineering structural design checker. Read the question (which may be a photo) — beam, column, slab, or footing design/check — then produce a correct, unit-checked, step-by-step worked solution.",
  "ee-solver":
    "You are an electrical engineering numerical solver. Read the question (which may be a photo) — motor/transformer sizing, protection coordination, power system analysis, circuit theory, single-line diagram interpretation, etc. — then produce a correct, unit-checked, step-by-step worked solution with formulas, substituted values, and units (V, A, W, Ω, Hz) carried through every step.",
  "ece-solver":
    "You are an electronics & communication engineering numerical solver. Read the question (which may be a photo) — op-amp circuits, active/passive filter design, signal processing (sampling, modulation, Fourier/Laplace analysis), digital logic, basic VLSI/semiconductor numericals — then produce a correct, unit-checked, step-by-step worked solution with formulas, substituted values, and units carried through every step.",
  "chem-solver":
    "You are a chemical engineering numerical solver. Read the question (which may be a photo) — mass balance, energy balance, reaction stoichiometry, fluid flow, heat/mass transfer, reactor design, distillation, etc. — then produce a correct, unit-checked, step-by-step worked solution with formulas, substituted values, and units carried through every step (kg/hr, kmol, kJ, etc.). State any basis of calculation assumed (e.g. per 100 kg feed) explicitly.",
};

/**
 * Syllabus-keyed reference bank: the standards/formula families each solver should ground its
 * answers in and cite by name, kept separate from the free-form prompt prose above so citation
 * behavior is consistent and centrally editable — this is what makes a branch solver's output
 * feel as grounded/trustworthy as DSA's real execution grading, instead of each prompt hand-rolling
 * its own citation instruction.
 */
export const BRANCH_REFERENCE_STANDARDS: Record<string, string[]> = {
  "mech-solver": ["Shigley's Mechanical Engineering Design (machine design)", "ASME/IS standard formulas for strength of materials", "standard thermodynamics/fluid mechanics textbook formulas (e.g. Rajput, Cengel)"],
  "structural-checker": ["IS 456:2000 (plain & reinforced concrete)", "IS 800:2007 (steel structures)", "IS 875 (design loads)"],
  "ee-solver": ["IS/IEC standards for transformers & motors", "per-unit system for power system analysis", "standard circuit theory formulas (e.g. Sadiku, Nagrath)"],
  "ece-solver": ["standard op-amp/filter design equations (e.g. Sedra-Smith)", "signal processing theorems (Nyquist, Fourier, Laplace)", "standard digital logic design (Morris Mano)"],
  "chem-solver": ["mass & energy balance fundamentals (e.g. Himmelblau)", "standard unit operations formulas (e.g. McCabe-Smith)", "reaction engineering fundamentals (e.g. Levenspiel)"],
};

function referenceInstruction(feature: string): string {
  const refs = BRANCH_REFERENCE_STANDARDS[feature];
  if (!refs?.length) return "Name the standard formula/reference used for each step.";
  return `Ground every step in one of these references and cite it by name (with a clause/table number when applicable): ${refs.join("; ")}.`;
}

const GENERIC_ENGINEERING_PROMPT =
  "You are an engineering numerical solver. Read the question (which may be a photo), then produce a correct, unit-checked, step-by-step worked solution showing formulas and calculations.";

export type BranchSolverRequest = {
  /** Feature slug — see BRANCH_FEATURES in apps/web/lib/capabilities.ts. */
  feature: string;
  questionText?: string;
  instructions?: string;
  subject?: string;
  /** Optional photo of the question for vision models. */
  image?: { data: Uint8Array; mediaType: string };
};

function stubSolution(req: BranchSolverRequest): AssignmentSolution {
  const q = req.questionText?.slice(0, 160) || "the uploaded question";
  return {
    questionSummary: `Solve (${req.feature}): ${q}`,
    approach:
      "Break the problem into clear steps, apply the relevant formula with units, and compute the result. (Locally stubbed — the real model reads the actual question, including photos.)",
    steps: [
      { heading: "Step 1 — Understand", detail: "Identify what is given and what is being asked, with units." },
      { heading: "Step 2 — Method", detail: "Choose the appropriate formula/standard for this topic." },
      { heading: "Step 3 — Work it out", detail: "Substitute values and compute, carrying units through." },
    ],
    finalAnswer: "The final answer follows from the steps above, with correct units. (Stubbed answer for local development.)",
  };
}

export type GenerateBranchSolverResult = { solution: AssignmentSolution; model: string; costCents: number };

export async function generateBranchSolverSolution(
  req: BranchSolverRequest,
): Promise<GenerateBranchSolverResult> {
  if (process.env.AI_DRIVER === "stub") {
    return { solution: AssignmentSolutionSchema.parse(stubSolution(req)), model: "stub", costCents: 0 };
  }

  const system = `${SOLVER_PROMPTS[req.feature] ?? GENERIC_ENGINEERING_PROMPT} ${referenceInstruction(req.feature)}`;

  const textPrompt = [
    req.subject ? `Subject: ${req.subject}` : "",
    req.questionText ? `Question: ${req.questionText}` : "The question is in the attached image.",
    req.instructions ? `Additional instructions: ${req.instructions}` : "",
    "Provide a one-line question summary, a brief approach, worked steps (with units), and the final answer (with units).",
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
      const { object, usage } = await generateObject({ model, schema: AssignmentSolutionSchema, system, messages });
      return { solution: object, model, costCents: costCentsFromUsage(model, usage) };
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(
    `Branch solver (${req.feature}) failed on both models: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
  );
}

// ---------------- Multi-turn feedback loop (mirrors assignment follow-up) ----------------

export type BranchSolverTurn = { speaker: "student" | "tutor"; content: string };

const BranchSolverFollowUpSchema = z.object({
  reply: z.string().min(1),
  revisedSolution: AssignmentSolutionSchema.nullish(),
});
export type BranchSolverFollowUp = { reply: string; revisedSolution?: AssignmentSolution | null };

export type BranchSolverFollowUpRequest = {
  feature: string;
  solution: AssignmentSolution;
  conversation: BranchSolverTurn[];
  message: string;
  subject?: string;
};

function stubFollowUp(req: BranchSolverFollowUpRequest): BranchSolverFollowUp {
  const m = req.message.toLowerCase();
  const wantsChange = /(formula|redo|wrong|change|instead|use |mistake|incorrect|step \d|unit)/.test(m);
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
    reply: `About "${req.message.slice(0, 80)}": here's the reasoning — check the relevant step and confirm the formula/units match your given quantities. Ask me to redo any step if it still looks off. (Local preview.)`,
  };
}

/** Multi-turn tutoring: answer a student's follow-up and revise the solution when warranted. */
export async function branchSolverFollowUp(
  req: BranchSolverFollowUpRequest,
): Promise<{ result: BranchSolverFollowUp; model: string; costCents: number }> {
  if (process.env.AI_DRIVER === "stub") {
    return { result: stubFollowUp(req), model: "stub", costCents: 0 };
  }

  const cachedPrefix = [
    "You are a patient engineering tutor helping a student with their numerical/design solution. The student may ask which formula to use, question a step, or report a mistake.",
    "Answer their message clearly and helpfully. If their feedback means the worked solution should change, return a FULL revised solution in revisedSolution; otherwise omit it (just reply).",
    "Never change the solution unnecessarily. Keep the same structure (summary, approach, steps, final answer).",
    req.subject ? `Subject: ${req.subject}` : "",
    `Current solution:\n${JSON.stringify(req.solution)}`,
  ].filter(Boolean).join("\n\n");
  const prompt = [
    req.conversation.length ? `Conversation so far:\n${req.conversation.map((t) => `${t.speaker}: ${t.content}`).join("\n")}` : "",
    `Student's new message: ${req.message}`,
  ].filter(Boolean).join("\n\n");
  const messages: ModelMessage[] = [cachedSystem(cachedPrefix), { role: "user", content: prompt }];

  let lastError: unknown;
  for (const model of [PRIMARY_MODEL, FALLBACK_MODEL]) {
    try {
      const { object, providerMetadata, usage } = await generateObject({ model, schema: BranchSolverFollowUpSchema, messages });
      logCacheUsage("branch-solver.followup", providerMetadata);
      return { result: object, model, costCents: costCentsFromUsage(model, usage) };
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(`Branch solver follow-up failed: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

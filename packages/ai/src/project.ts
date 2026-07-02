import { generateObject, generateText } from "ai";
import { z } from "zod";

const PRIMARY_MODEL = "anthropic/claude-sonnet-4.6";
const FALLBACK_MODEL = "google/gemini-3.5-flash";

/** Difficulty tiers (the user's college terms). */
export const PROJECT_DIFFICULTIES = ["mini", "major", "tpcs", "3rd-year"] as const;
export const ProjectDifficultySchema = z.enum(PROJECT_DIFFICULTIES);
export type ProjectDifficulty = z.infer<typeof ProjectDifficultySchema>;

export const ProjectIdeaSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  difficulty: ProjectDifficultySchema,
  skills: z.array(z.string().min(1)).min(1),
  /** True when the project needs a physical model / hardware (the "model needed?" signal). */
  hardwareNeeded: z.boolean(),
  hardwareNote: z.string().optional(),
  whyGood: z.string().min(1),
});
export const ProjectIdeasSchema = z.object({ ideas: z.array(ProjectIdeaSchema).min(3).max(6) });

export type ProjectIdea = z.infer<typeof ProjectIdeaSchema>;
export type ProjectIdeasContent = z.infer<typeof ProjectIdeasSchema>;

export type ProjectIdeasRequest = {
  department: string;
  interests?: string;
  difficulty?: ProjectDifficulty;
  /** Folded-in context (e.g. clarify answers about hardware availability, team size). */
  guidelines?: string;
};

function stubIdeas(req: ProjectIdeasRequest): ProjectIdeasContent {
  const dept = req.department;
  const diff: ProjectDifficulty = req.difficulty ?? "mini";
  const topic = req.interests?.trim() || "automation";
  return {
    ideas: [
      {
        title: `Smart ${topic} monitor for ${dept}`,
        summary: `A sensor-driven system that monitors ${topic} and reports insights to a dashboard.`,
        difficulty: diff,
        skills: ["IoT", "Embedded C", "Dashboard"],
        hardwareNeeded: true,
        hardwareNote: "Needs sensors + a microcontroller (e.g. ESP32).",
        whyGood: "Demonstrable hardware + software integration; good viva talking points.",
      },
      {
        title: `${topic} analytics web app`,
        summary: `A web application that analyzes ${topic} data and visualizes trends for users.`,
        difficulty: diff,
        skills: ["Web", "Data Analysis", "Database"],
        hardwareNeeded: false,
        whyGood: "Pure software; easy to demo and deploy, strong on full-stack skills.",
      },
      {
        title: `${topic} optimization study`,
        summary: `An analytical/simulation project optimizing a ${topic} process relevant to ${dept}.`,
        difficulty: diff,
        skills: ["Simulation", "Analysis", "Report writing"],
        hardwareNeeded: false,
        whyGood: "Low cost, theory-heavy; strong for report and literature depth.",
      },
    ],
  };
}

export async function generateProjectIdeas(
  req: ProjectIdeasRequest,
): Promise<{ content: ProjectIdeasContent; model: string }> {
  if (process.env.AI_DRIVER === "stub") {
    return { content: ProjectIdeasSchema.parse(stubIdeas(req)), model: "stub" };
  }

  const system =
    "You are a final-year project advisor for Indian engineering students. Suggest practical, original, demonstrable project ideas matched to the student's department and difficulty level. For each idea give a clear title, a 1–2 sentence summary, the difficulty tier, the key skills, whether a physical model/hardware is needed (and a short note), and why it's a good choice. Avoid generic clichés; favour ideas that are feasible with student resources and give strong viva/report material.";
  const prompt = [
    `Department: ${req.department}.`,
    req.difficulty ? `Difficulty tier: ${req.difficulty}.` : "",
    req.interests ? `Student interests / area: ${req.interests}.` : "",
    req.guidelines ? `Extra context: ${req.guidelines}` : "",
    "Suggest 4–6 distinct ideas.",
  ]
    .filter(Boolean)
    .join("\n");

  let lastError: unknown;
  for (const model of [PRIMARY_MODEL, FALLBACK_MODEL]) {
    try {
      const { object } = await generateObject({ model, schema: ProjectIdeasSchema, system, prompt });
      return { content: object, model };
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(
    `Project idea generation failed on both models: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
  );
}

// ----------------------- Build plan (post-finalize breakdown) -----------------------

/** A single rendered diagram — Mermaid syntax, rendered client-side. */
export const ProjectDiagramSchema = z.object({
  label: z.string().min(1),
  mermaid: z.string().min(1),
});
export const ProjectPhaseSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  tasks: z.array(z.string().min(1)).min(1),
});
export const ProjectComponentSchema = z.object({
  name: z.string().min(1),
  purpose: z.string().min(1),
  tech: z.string().min(1),
});
/** A research pointer: a topic + why it matters + a search phrase — never a fabricated URL. */
export const ProjectResearchSchema = z.object({
  topic: z.string().min(1),
  why: z.string().min(1),
  searchQuery: z.string().min(1),
});
/** A brief for a "normal" (non-diagram) illustrative image — a photo/concept-art style visual, not a technical diagram. */
export const ProjectImageBriefSchema = z.object({
  label: z.string().min(1),
  prompt: z.string().min(1),
});
export const ProjectBreakdownSchema = z.object({
  problemStatement: z.string().min(1),
  solution: z.string().min(1),
  diagrams: z.array(ProjectDiagramSchema).min(2).max(4),
  /** 1-2 normal illustrative images (not diagrams) — e.g. the problem context and the finished solution. */
  imageBriefs: z.array(ProjectImageBriefSchema).min(1).max(2),
  phases: z.array(ProjectPhaseSchema).min(2).max(6),
  components: z.array(ProjectComponentSchema).min(2),
  research: z.array(ProjectResearchSchema).min(2).max(6),
  differentiators: z.array(z.string().min(1)).min(2).max(5),
});
export type ProjectDiagram = z.infer<typeof ProjectDiagramSchema>;
export type ProjectPhase = z.infer<typeof ProjectPhaseSchema>;
export type ProjectComponent = z.infer<typeof ProjectComponentSchema>;
export type ProjectResearch = z.infer<typeof ProjectResearchSchema>;
export type ProjectImageBrief = z.infer<typeof ProjectImageBriefSchema>;
export type ProjectBreakdown = z.infer<typeof ProjectBreakdownSchema>;

export type ProjectBreakdownRequest = {
  idea: ProjectIdea;
  department: string;
  guidelines?: string;
};

function stubBreakdown(req: ProjectBreakdownRequest): ProjectBreakdown {
  const { idea } = req;
  return {
    problemStatement: `Students and professionals in ${req.department} lack an easy way to handle ${idea.title.toLowerCase()} — the process today is manual, slow, or error-prone.`,
    solution: `${idea.title} solves this with a ${idea.hardwareNeeded ? "hardware-backed" : "software"} system that automates the core workflow and surfaces the results clearly to the user.`,
    imageBriefs: [
      { label: "The problem today", prompt: `A clean, realistic photo-style illustration showing the everyday problem that "${idea.title}" solves, in a ${req.department} context. No text in the image.` },
      { label: "The solution in action", prompt: `A clean, realistic photo-style illustration showing "${idea.title}" being used successfully, in a ${req.department} context. No text in the image.` },
    ],
    diagrams: [
      {
        label: "System architecture",
        mermaid: `flowchart TD\n  U[User] --> FE[Frontend]\n  FE --> BE[Backend / API]\n  BE --> DB[(Database)]\n  ${idea.hardwareNeeded ? "BE --> HW[Sensors / Hardware]" : "BE --> EXT[External Service]"}`,
      },
      {
        label: "Data flow",
        mermaid: `sequenceDiagram\n  participant U as User\n  participant A as App\n  participant S as Server\n  U->>A: Interacts\n  A->>S: Request\n  S-->>A: Response\n  A-->>U: Updates UI`,
      },
    ],
    phases: [
      { name: "Setup & research", description: "Confirm scope and gather references.", tasks: ["Define exact requirements", "List required tools/libraries", "Sketch the architecture"] },
      { name: "Core build", description: "Implement the main functionality.", tasks: ["Build the core module", "Wire up storage/data layer", "Basic UI/CLI to exercise it"] },
      { name: "Polish & demo", description: "Prepare for evaluation.", tasks: ["Handle edge cases", "Write the report/slides", "Rehearse the viva walkthrough"] },
    ],
    components: idea.skills.slice(0, 4).map((s) => ({ name: s, purpose: `Handles the ${s.toLowerCase()} concerns of the project.`, tech: s })),
    research: [
      { topic: `${idea.title} prior art`, why: "See how similar projects are structured before you start.", searchQuery: `${idea.title} project github` },
      { topic: "Core technique", why: "Understand the main algorithm/technique this project relies on.", searchQuery: `${idea.skills[0] ?? "core technique"} tutorial` },
    ],
    differentiators: [`A working, demoable ${idea.title.toLowerCase()} tailored to ${req.department}.`, "Clear, well-documented code and a real (not simulated) demo."],
  };
}

/**
 * Full build-out for a FINALIZED idea: diagrams, phased plan, components, research pointers,
 * and what makes it stand out from a generic version. Called on-demand from the project page
 * (not at idea-generation time — this is heavier and only needed once a student commits).
 */
export async function generateProjectBreakdown(
  req: ProjectBreakdownRequest,
): Promise<{ content: ProjectBreakdown; model: string }> {
  if (process.env.AI_DRIVER === "stub") {
    return { content: ProjectBreakdownSchema.parse(stubBreakdown(req)), model: "stub" };
  }

  const { idea } = req;
  const system = [
    "You are a final-year project mentor for Indian engineering students, producing a complete build-out for a project the student has already chosen.",
    "Write a clear PROBLEM STATEMENT (2-4 sentences): what real problem this addresses and for whom.",
    "Write the SOLUTION (2-4 sentences): how this specific project solves that problem, at a level a non-technical evaluator would follow.",
    "Produce 2-4 DISTINCT Mermaid diagrams (valid Mermaid syntax): always include a system/architecture diagram (flowchart), and pick 1-3 more appropriate to the project from: data-flow (sequenceDiagram), database (erDiagram), or class/module design (classDiagram). Do not repeat the same diagram type twice.",
    "Also brief 1-2 NORMAL illustrative images (NOT diagrams) — realistic/concept-art style visuals (e.g. the problem in context, or the solution being used) that a text-to-image model will render. Give each a short label and a self-contained image-generation prompt (describe the scene; explicitly say 'no text in the image').",
    "Produce a phased implementation plan (setup through demo-ready) with concrete, actionable tasks per phase.",
    "List the required components/modules with their purpose and the specific tech/library for each.",
    "List research material as TOPICS with a short reason and a search phrase the student can type into a search engine — never invent a URL, book title, or paper citation you are not certain exists.",
    "State 2-5 concrete differentiators: what would make THIS student's build stand out from a generic version of the same idea.",
  ].join("\n");
  const prompt = [
    `Project: ${idea.title}`,
    idea.summary,
    `Department: ${req.department}.`,
    `Difficulty: ${idea.difficulty}.`,
    `Key skills/tech: ${idea.skills.join(", ")}.`,
    idea.hardwareNeeded ? `Hardware: ${idea.hardwareNote ?? "a physical model is involved"}.` : "Software-only project.",
    req.guidelines ? `Extra context: ${req.guidelines}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  let lastError: unknown;
  for (const model of [PRIMARY_MODEL, FALLBACK_MODEL]) {
    try {
      const { object } = await generateObject({ model, schema: ProjectBreakdownSchema, system, prompt });
      return { content: object, model };
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(
    `Project build-plan generation failed on both models: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
  );
}

// ----------------------- Project code help (gated to coding-enabled students) -----------------------

export type ProjectCodeReviewRequest = {
  title: string;
  summary: string;
  language: string;
  code: string;
  question?: string;
};

function stubProjectCodeReview(req: ProjectCodeReviewRequest): string {
  return [
    `Here's a look at your ${req.language} code for "${req.title}":`,
    "",
    req.question ? `On your question — "${req.question}": check the surrounding logic step by step; a print/log at each stage usually finds it fast.` : "Structure looks reasonable overall.",
    "",
    "```" + req.language.toLowerCase(),
    req.code.split("\n").slice(0, 20).join("\n"),
    "```",
    "",
    "(Local preview review — connect the AI Gateway for a full analysis.)",
  ].join("\n");
}

/**
 * Free-form code help for a project's code, scoped to coding-enabled students (gated in the UI
 * via codingEnabledFor). Returns prose + fenced code so the student gets an explanation AND,
 * where useful, a corrected/improved snippet back — not a correctness gate (no execution).
 */
export async function reviewProjectCode(
  req: ProjectCodeReviewRequest,
): Promise<{ reply: string; model: string }> {
  if (process.env.AI_DRIVER === "stub") {
    return { reply: stubProjectCodeReview(req), model: "stub" };
  }

  const system = [
    "You are a coding mentor helping a student with code from their own project (not a graded exercise).",
    "Give specific, practical feedback: bugs, edge cases, structure, and improvements.",
    "Do NOT claim you executed the code — frame correctness as observations, not a verified verdict.",
    "When you suggest a fix or improvement, include the corrected/relevant code back as a fenced code block so the student can use it directly.",
    "Be concise and encouraging.",
  ].join("\n");
  const prompt = [
    `Project: ${req.title} — ${req.summary}`,
    `Language: ${req.language}`,
    req.question?.trim() ? `Student's question: ${req.question}` : "The student wants general feedback on this code.",
    `Code:\n${req.code.slice(0, 6000)}`,
  ]
    .filter(Boolean)
    .join("\n");

  let lastError: unknown;
  for (const model of [PRIMARY_MODEL, FALLBACK_MODEL]) {
    try {
      const { text } = await generateText({ model, system, prompt });
      return { reply: text, model };
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(
    `Project code review failed on both models: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
  );
}

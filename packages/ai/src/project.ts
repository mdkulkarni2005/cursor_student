import { generateObject } from "ai";
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

import { generateObject } from "ai";
import { z } from "zod";

const PRIMARY_MODEL = "anthropic/claude-sonnet-4.6";
const FALLBACK_MODEL = "google/gemini-3.5-flash";

export const VivaQuestionSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
  difficulty: z.enum(["easy", "medium", "hard"]),
});
export const VivaSetSchema = z.object({ questions: z.array(VivaQuestionSchema).min(4) });

export type VivaQuestion = z.infer<typeof VivaQuestionSchema>;
export type VivaSetContent = z.infer<typeof VivaSetSchema>;

export type VivaRequest = {
  title: string;
  /** report | ppt | assignment */
  sourceType: string;
  context: string;
  department?: string;
};

function stubViva(req: VivaRequest): VivaSetContent {
  return {
    questions: [
      { question: `What is the main objective of "${req.title}"?`, answer: "It aims to address the stated problem and demonstrate the key outcome. (Stubbed model answer.)", difficulty: "easy" },
      { question: "Explain the core concept involved here.", answer: "The core concept centers on the main principle covered in the work. (Stubbed.)", difficulty: "medium" },
      { question: "What are the key assumptions or limitations?", answer: "The main assumptions and limitations relate to scope and method. (Stubbed.)", difficulty: "medium" },
      { question: "Why did you choose this approach over alternatives?", answer: "This approach balances accuracy and feasibility versus the alternatives. (Stubbed.)", difficulty: "hard" },
      { question: "How would you extend or improve this work?", answer: "It could be extended with broader data or a refined method. (Stubbed.)", difficulty: "hard" },
    ],
  };
}

export async function generateVivaQuestions(
  req: VivaRequest,
): Promise<{ content: VivaSetContent; model: string }> {
  if (process.env.AI_DRIVER === "stub") {
    return { content: VivaSetSchema.parse(stubViva(req)), model: "stub" };
  }

  const system =
    "You are a viva/panel examiner for engineering students. From the given work, generate the questions a panel is most likely to ask, each with a concise, correct model answer and a difficulty of easy, medium, or hard.";
  const prompt = [
    `Source: a ${req.sourceType} titled "${req.title}"${req.department ? ` for ${req.department}` : ""}.`,
    "Content context:",
    req.context.slice(0, 4000),
    "",
    "Generate 6–8 likely viva questions, each with a clear model answer and difficulty.",
  ].join("\n");

  let lastError: unknown;
  for (const model of [PRIMARY_MODEL, FALLBACK_MODEL]) {
    try {
      const { object } = await generateObject({ model, schema: VivaSetSchema, system, prompt });
      return { content: object, model };
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(
    `Viva generation failed on both models: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
  );
}

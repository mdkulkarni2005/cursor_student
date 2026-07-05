import { generateObject, type ModelMessage } from "ai";
import { VivaSetSchema, type VivaSetContent } from "./viva";

const PRIMARY_MODEL = "anthropic/claude-sonnet-4.6";
const FALLBACK_MODEL = "google/gemini-3.5-flash";

/**
 * Drawing/CAD viva prep for Mechanical students — a photo of a drawing/sketch in, likely panel
 * questions + GD&T/tolerancing explanations out. Reuses VivaQuestionSchema/VivaSetSchema (same
 * shape as the existing document-based viva prep) but is vision-driven, not derived from a
 * document's text content, so it needs its own generator.
 */
export type DrawingVivaRequest = {
  instructions?: string;
  subject?: string;
  image: { data: Uint8Array; mediaType: string };
};

function stubDrawingViva(): VivaSetContent {
  return {
    questions: [
      { question: "What projection method is used in this drawing?", answer: "Identify first-angle vs third-angle projection from the symbol/view arrangement. (Stubbed.)", difficulty: "easy" },
      { question: "Explain the tolerancing shown on the critical dimension.", answer: "State the nominal size and tolerance band, and what fit class it implies. (Stubbed.)", difficulty: "medium" },
      { question: "What GD&T symbols appear here, and what do they control?", answer: "Identify the feature control frame(s) and the geometric characteristic being controlled. (Stubbed.)", difficulty: "medium" },
      { question: "Why was this section/view chosen?", answer: "It reveals internal features or a critical cross-section not visible in the standard views. (Stubbed.)", difficulty: "hard" },
      { question: "What manufacturing process suits this part, given the drawing?", answer: "Base this on material, tolerances, and geometry shown. (Stubbed.)", difficulty: "hard" },
    ],
  };
}

export async function generateDrawingViva(
  req: DrawingVivaRequest,
): Promise<{ content: VivaSetContent; model: string }> {
  if (process.env.AI_DRIVER === "stub") {
    return { content: VivaSetSchema.parse(stubDrawingViva()), model: "stub" };
  }

  const system =
    "You are a mechanical engineering drawing viva examiner. Look at the uploaded engineering drawing/sketch and generate the questions a viva panel is most likely to ask about it — projections, dimensioning, tolerancing, GD&T symbols, sections, manufacturing feasibility — each with a concise, correct model answer and a difficulty of easy, medium, or hard.";

  const textPrompt = [
    req.subject ? `Subject: ${req.subject}` : "",
    req.instructions ? `Additional instructions: ${req.instructions}` : "",
    "Generate 6–8 likely viva questions about the attached drawing, each with a clear model answer and difficulty.",
  ].filter(Boolean).join("\n");

  const messages: ModelMessage[] = [
    {
      role: "user",
      content: [
        { type: "text", text: textPrompt },
        { type: "image", image: req.image.data, mediaType: req.image.mediaType },
      ],
    },
  ];

  let lastError: unknown;
  for (const model of [PRIMARY_MODEL, FALLBACK_MODEL]) {
    try {
      const { object } = await generateObject({ model, schema: VivaSetSchema, system, messages });
      return { content: object, model };
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(
    `Drawing viva generation failed on both models: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
  );
}

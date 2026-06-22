import { generateObject } from "ai";
import { z } from "zod";
import { PptContentSchema, PptSlideSchema, type PptContent } from "@studentos/documents";

const PRIMARY_MODEL = "anthropic/claude-sonnet-4.6";
const FALLBACK_MODEL = "google/gemini-3.5-flash";

export type PptRequest = {
  title: string;
  /** Student/college line for the title slide (from the profile, not the model). */
  subtitle: string;
  department: string;
  slideCount?: number;
  guidelines?: string;
};

// The model produces only the slides; title/subtitle are injected.
const PptBodySchema = z.object({
  slides: z.array(PptSlideSchema).min(3),
});

function stubPptBody(req: PptRequest): z.infer<typeof PptBodySchema> {
  const t = req.title;
  return {
    slides: [
      { heading: "Introduction", bullets: [`Overview of ${t}`, `Relevance to ${req.department}`, "Objectives of this presentation"], notes: "Introduce the topic and why it matters." },
      { heading: "Background", bullets: ["Key concepts and definitions", "Prior work in the area", "Current challenges"] },
      { heading: "Approach", bullets: ["Methodology adopted", "Design considerations", "Implementation steps"] },
      { heading: "Results & Discussion", bullets: ["Key findings", "Analysis of outcomes", "Practical implications"] },
      { heading: "Conclusion", bullets: [`Summary of ${t}`, "Future scope", "Questions & answers"], notes: "Wrap up and invite questions." },
    ],
  };
}

export type GeneratePptResult = { content: PptContent; model: string };

export async function generatePptContent(req: PptRequest): Promise<GeneratePptResult> {
  if (process.env.AI_DRIVER === "stub") {
    const object = PptBodySchema.parse(stubPptBody(req));
    const content = PptContentSchema.parse({ title: req.title, subtitle: req.subtitle, slides: object.slides });
    return { content, model: "stub" };
  }

  const system = [
    "You are an academic presentation assistant for engineering students. Produce clear slide headings with 3–6 concise bullet points each, plus short speaker notes. Keep bullets crisp, not full paragraphs.",
    "Do NOT fabricate specifics that weren't given — no invented company names, people, founders/CEO/CTO, dates, or statistics. When a specific isn't provided, stay general. Write accurate, on-topic content.",
  ].join(" ");
  const prompt = [
    `Create a ${req.slideCount ?? 8}-slide presentation titled "${req.title}" for ${req.department}.`,
    req.guidelines ? `Guidelines: ${req.guidelines}` : "",
    "Return an ordered list of slides; each has a heading, 3–6 short bullets, and optional speaker notes.",
  ]
    .filter(Boolean)
    .join("\n");

  let lastError: unknown;
  for (const model of [PRIMARY_MODEL, FALLBACK_MODEL]) {
    try {
      const { object } = await generateObject({ model, schema: PptBodySchema, system, prompt });
      const content = PptContentSchema.parse({ title: req.title, subtitle: req.subtitle, slides: object.slides });
      return { content, model };
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(
    `PPT generation failed on both models: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
  );
}

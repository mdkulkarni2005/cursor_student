import { generateObject } from "ai";
import { z } from "zod";

const PRIMARY_MODEL = "anthropic/claude-sonnet-4.6";
const FALLBACK_MODEL = "google/gemini-3.5-flash";

export type TemplateContentRequest = {
  topic: string;
  /** "report" | "presentation" */
  docKind: string;
  /** The exact section headings detected in the user's uploaded template. */
  headings: string[];
  department?: string;
  guidelines?: string;
};

const SectionsSchema = z.object({
  sections: z.array(z.object({ heading: z.string(), content: z.string().min(1) })).min(1),
});

function stub(req: TemplateContentRequest): Record<string, string> {
  const out: Record<string, string> = {};
  for (const h of req.headings) {
    out[h] = /reference/i.test(h)
      ? "1. Author A., 'A relevant source', Journal of Engineering, 2023.\n2. Author B., 'Another relevant source', Proceedings, 2022."
      : `This is the ${h} section for "${req.topic}"${req.department ? ` in ${req.department}` : ""}. (Locally stubbed content — the real model writes this section from the topic.)`;
  }
  return out;
}

/**
 * Generate content keyed to the headings found in the user's own template.
 * Returns a heading→content map the template-fill engine injects (the model
 * never produces the file).
 */
export async function generateTemplateContent(
  req: TemplateContentRequest,
): Promise<{ contentByHeading: Record<string, string>; model: string }> {
  if (process.env.AI_DRIVER === "stub") {
    return { contentByHeading: stub(req), model: "stub" };
  }

  const system = [
    "You write academic content section by section. For each requested heading you produce well-structured, original content appropriate to that section. Do not add or rename sections — produce content for exactly the headings given.",
    "",
    "SUBSTANCE: write accurate, specific, well-informed content using genuine domain knowledge about the topic — real concepts, methods, standards, and terminology a knowledgeable person would include. The reader should learn something real.",
    "",
    "GUARDRAILS (this is a professional document a college will accept):",
    "- Do NOT fabricate specific facts about the student's company, people, org structure, dates, headcounts, or metrics. Only state such specifics if they are given to you in the topic/guidelines. Never invent an org chart, a founder/CEO/CTO hierarchy, named employees, or made-up statistics. When a specific isn't provided, write generally (e.g. 'the organization's engineering team') instead of inventing one.",
    "- Do NOT write slide-by-slide or presentation content ('Slide 1 — …', 'Slide 2 — …'). This is a written report, never a deck outline.",
    "- Do NOT draw ASCII-art diagrams or box-drawing figures (┌─┐, ├──, |__). They render badly. Describe architecture, flows, and structure in prose, or as a Markdown table.",
    "- Use code SPARINGLY: only a short, directly-relevant snippet when it genuinely aids understanding, inside a fenced ``` block. No large code dumps, no filler code.",
    "- Do NOT use horizontal rules ('---', '***') as separators.",
    "- If a heading contains its own guidance prompts/sub-points (e.g. 'importance of internship in your field', 'brief overview of your organization'), address each of them — but do not copy the prompt text verbatim as a heading.",
    "",
    "FORMATTING: write each section's content in lightweight Markdown so it renders as a properly formatted document, not a wall of plain text. Use:",
    "- **bold** for key terms, defined concepts, and emphasis (use it naturally — don't bold whole sentences).",
    "- *italic* for variable names, foreign/technical terms, titles, and subtle emphasis.",
    "- '## Sub-heading' (or '### ') to break a long section into labelled sub-parts where it helps readability.",
    "- '- ' for bulleted lists and '1. ' for numbered/ordered steps.",
    "- Markdown pipe tables ('| Col A | Col B |' then a '| --- | --- |' separator row) when presenting comparisons, specs, or tabular data.",
    "- '[center]…[/center]' on its own line for figure/table captions that should be centered (e.g. '[center]Fig. 1: System architecture[/center]').",
    "Separate paragraphs with a blank line. Do NOT output the section heading itself (the template already has it) and do NOT use '#' single top-level headings.",
  ].join("\n");
  const prompt = [
    `Topic: "${req.topic}" (${req.docKind})${req.department ? ` for ${req.department}` : ""}.`,
    req.guidelines ? `Guidelines: ${req.guidelines}.` : "",
    "Write well-formatted Markdown content for exactly these sections, in order:",
    req.headings.map((h, i) => `${i + 1}. ${h}`).join("\n"),
  ]
    .filter(Boolean)
    .join("\n");

  let lastError: unknown;
  for (const model of [PRIMARY_MODEL, FALLBACK_MODEL]) {
    try {
      const { object } = await generateObject({ model, schema: SectionsSchema, system, prompt });
      const map: Record<string, string> = {};
      for (const s of object.sections) map[s.heading] = s.content;
      return { contentByHeading: map, model };
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(
    `Template content generation failed on both models: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
  );
}

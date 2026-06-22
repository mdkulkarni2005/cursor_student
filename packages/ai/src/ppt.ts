import { generateObject } from "ai";
import { z } from "zod";
import {
  PptContentSchema,
  PptLayoutSchema,
  PptTableSchema,
  PptDiagramSchema,
  PptStatSchema,
  PptColumnsSchema,
  PptQuoteSchema,
  type PptContent,
} from "@studentos/documents";

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

// What the model emits per slide. Excludes `image` (an R2 key the app sets later) — a slide that
// should carry a generated picture just uses layout "image".
const AiSlideSchema = z.object({
  layout: PptLayoutSchema,
  heading: z.string().default(""),
  bullets: z.array(z.string()).max(8).default([]),
  columns: PptColumnsSchema.optional(),
  table: PptTableSchema.optional(),
  diagram: PptDiagramSchema.optional(),
  stats: z.array(PptStatSchema).min(2).max(4).optional(),
  quote: PptQuoteSchema.optional(),
  notes: z.string().optional(),
});
type AiSlide = z.infer<typeof AiSlideSchema>;
const PptBodySchema = z.object({ slides: z.array(AiSlideSchema).min(3) });

/** Drop a slide back to plain bullets when its layout's required block is missing/too thin, so a
 *  malformed model response never renders an empty slide. */
function sanitizeSlide(s: AiSlide): AiSlide {
  const ok =
    (s.layout === "table" && !!s.table) ||
    (s.layout === "diagram" && !!s.diagram) ||
    (s.layout === "stat" && (s.stats?.length ?? 0) >= 2) ||
    (s.layout === "two-column" && !!s.columns) ||
    (s.layout === "quote" && !!s.quote) ||
    s.layout === "section" ||
    s.layout === "image" ||
    s.layout === "bullets";
  if (!ok) return { ...s, layout: "bullets", bullets: s.bullets.length ? s.bullets : [s.heading || "Overview"] };
  // Layouts that show bullets must have at least one.
  if ((s.layout === "bullets" || s.layout === "image") && s.bullets.length === 0)
    return { ...s, bullets: [s.heading || "Overview"] };
  return s;
}

function stubPptBody(req: PptRequest): z.infer<typeof PptBodySchema> {
  const t = req.title;
  return {
    slides: [
      { layout: "section", heading: "Introduction", bullets: [`An overview of ${t}`] },
      { layout: "bullets", heading: "Background", bullets: ["Key concepts and definitions", "Prior work in the area", "Current challenges"], notes: "Set up the problem." },
      { layout: "two-column", heading: "Approach", bullets: [], columns: { leftTitle: "Goals", rightTitle: "Methods", left: ["Define scope", "Set objectives"], right: ["Design", "Implement", "Evaluate"] } },
      { layout: "diagram", heading: "Process", bullets: [], diagram: { kind: "process", nodes: ["Plan", "Build", "Test", "Ship"] } },
      { layout: "table", heading: "Technology Stack", bullets: [], table: { headers: ["Layer", "Choice"], rows: [["Language", "TypeScript"], ["Runtime", "Node.js"]] } },
      { layout: "stat", heading: "Outcomes", bullets: [], stats: [{ value: "6 mo", label: "Duration" }, { value: "10+", label: "Features shipped" }] },
      { layout: "image", heading: `Relevance to ${req.department}`, bullets: ["Connects theory to practice", "Industry-grade workflows"] },
      { layout: "quote", heading: "", bullets: [], quote: { text: `Hands-on work on ${t} bridged classroom theory and real engineering.`, attribution: req.subtitle.split(" · ")[0] ?? "Student" } },
    ],
  };
}

export type GeneratePptResult = { content: PptContent; model: string };

// ---- Template-aware content (fill an uploaded template's OWN sections) ----

export type PptTemplateSection = { heading: string; instruction: string };
export type PptTemplateRequest = {
  topic: string;
  subtitle: string;
  department: string;
  /** The template's section slides, in order — each with its own instruction (the per-slide spec). */
  sections: PptTemplateSection[];
  guidelines?: string;
};
export type GeneratePptTemplateResult = { contentByHeading: Record<string, string[]>; model: string };

const TemplateSlidesSchema = z.object({
  slides: z
    .array(z.object({ heading: z.string(), bullets: z.array(z.string().min(1)).min(2).max(6) }))
    .min(1),
});

function stripNum(h: string): string {
  return h.replace(/^\s*\d+[.)]\s*/, "").trim();
}

function stubTemplateContent(req: PptTemplateRequest): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const s of req.sections) {
    const name = stripNum(s.heading) || s.heading;
    out[s.heading] = [
      `${name}: key point for "${req.topic}"`,
      `Addresses: ${s.instruction.slice(0, 70)}`.trim(),
      `Relevant detail for ${req.department}`,
    ];
  }
  return out;
}

/**
 * Generate bullet content for EXACTLY the template's sections, in order — one block per heading,
 * steered by each section's own instruction. Never adds, drops, or renames a section (the template
 * owns the structure). Output keyed by the ORIGINAL heading so the fill engine maps it 1:1.
 */
export async function generatePptTemplateContent(
  req: PptTemplateRequest,
): Promise<GeneratePptTemplateResult> {
  if (req.sections.length === 0) return { contentByHeading: {}, model: "none" };
  if (process.env.AI_DRIVER === "stub") {
    return { contentByHeading: stubTemplateContent(req), model: "stub" };
  }

  const system = [
    "You fill a college presentation TEMPLATE. The template already defines the slide headings and the structure — you only write the bullet points that go under each given heading.",
    "Produce 3–6 crisp, presentation-style bullets per slide (short phrases, not paragraphs). Use the per-slide instruction as the spec for what that slide must cover.",
    "Do NOT add, remove, rename, reorder, or merge slides — return content for EXACTLY the headings given, in the same order.",
    "Do NOT fabricate specifics that weren't given — no invented company names, people, founders/CEO/CTO, dates, or statistics. When a specific isn't provided, stay general and accurate.",
  ].join(" ");
  const prompt = [
    `Presentation topic: "${req.topic}"${req.department ? ` (${req.department})` : ""}.`,
    req.guidelines ? `Guidelines: ${req.guidelines}` : "",
    "Write bullets for exactly these slides, in order. The instruction after each heading tells you what that slide must cover:",
    req.sections
      .map((s, i) => `${i + 1}. ${s.heading}\n   instruction: ${s.instruction}`)
      .join("\n"),
  ]
    .filter(Boolean)
    .join("\n");

  let lastError: unknown;
  for (const model of [PRIMARY_MODEL, FALLBACK_MODEL]) {
    try {
      const { object } = await generateObject({ model, schema: TemplateSlidesSchema, system, prompt });
      const map: Record<string, string[]> = {};
      // Map by position against the ORIGINAL headings (the model may lightly reword a heading).
      // Fall back to heading-text match if counts line up oddly.
      const byHeading = new Map(object.slides.map((s) => [stripNum(s.heading).toLowerCase(), s.bullets]));
      req.sections.forEach((sec, i) => {
        const positional = object.slides[i]?.bullets;
        const matched = byHeading.get(stripNum(sec.heading).toLowerCase());
        const bullets = positional ?? matched;
        if (bullets && bullets.length) map[sec.heading] = bullets;
      });
      return { contentByHeading: map, model };
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(
    `PPT template content generation failed on both models: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
  );
}

export async function generatePptContent(req: PptRequest): Promise<GeneratePptResult> {
  if (process.env.AI_DRIVER === "stub") {
    const object = PptBodySchema.parse(stubPptBody(req));
    const slides = object.slides.map(sanitizeSlide);
    const content = PptContentSchema.parse({ title: req.title, subtitle: req.subtitle, slides });
    return { content, model: "stub" };
  }

  const system = [
    "You design real, visually varied academic presentations for engineering students — NOT a wall of identical bullet slides. Every slide must earn its layout: choose the layout that best fits the content.",
    "",
    "LAYOUTS (set `layout` and fill the MATCHING field; leave the others empty):",
    "- `section`  — a divider that opens a new part. heading = part name; bullets[0] (optional) = one-line subtitle.",
    "- `bullets`  — heading + 3–6 crisp bullets. The default, but don't overuse it.",
    "- `two-column` — heading + columns{leftTitle,rightTitle,left[],right[]} for compare/contrast, before/after, pros/cons.",
    "- `table`    — heading + table{headers[],rows[][]} for specs, comparisons, or structured data (2–5 cols).",
    "- `diagram`  — heading + diagram{kind,nodes[]} for steps/flows ('process'), loops ('cycle'), or breakdowns ('hierarchy'). 2–6 short node labels.",
    "- `stat`     — heading + stats[{value,label}] (2–4) for key numbers/metrics. Only use values you were actually given.",
    "- `image`    — heading + 2–4 bullets; signals this slide should carry a relevant picture (the system generates it).",
    "- `quote`    — quote{text,attribution} for a closing thought or principle.",
    "",
    "RULES — VARIETY IS MANDATORY (a deck that is all bullets is a FAILURE):",
    "- A bullets-only deck is unacceptable. Use at least FOUR different layouts across the deck, and keep plain `bullets` to at most ~a third of the slides.",
    "- CRITICAL: richer layouts do NOT need numbers or invented facts — they organise REAL conceptual knowledge you already have. Use them aggressively:",
    "  • `table` for comparisons & classifications using CONCEPTS, not metrics — e.g. columns like Aspect/Description, Technique/Use-case, Type/Example, Feature/Benefit, Component/Role. This is almost always possible for an engineering topic.",
    "  • `diagram` for any process, workflow, pipeline, lifecycle, or architecture — node labels are concepts/steps (no data needed).",
    "  • `two-column` for compare/contrast, pros/cons, before/after, theory/practice.",
    "  • `stat` ONLY when you were actually given real numbers — otherwise never.",
    "- Required spine: open with a `section` divider; include AT LEAST ONE `table` and AT LEAST ONE `diagram` (engineering topics always support these conceptually); use `two-column` where it fits; a `quote` may close.",
    "- Keep text tight: bullets are short phrases, table cells are terse, node labels are 1–3 words.",
    "- Honesty bar (does NOT mean 'avoid tables'): do not invent company names, people, founders/CEO/CTO, dates, or statistics. When a specific isn't given, stay general — but you can STILL present general knowledge in tables/diagrams/columns. Generic ≠ bullets; structure it.",
    "- Add short speaker `notes` where useful.",
  ].join("\n");
  const prompt = [
    `Design a ${req.slideCount ?? 8}-slide presentation titled "${req.title}" for ${req.department}.`,
    req.guidelines ? `Guidelines: ${req.guidelines}` : "",
    "Return an ordered list of slides, each with a layout chosen to fit its content and the matching block filled in.",
  ]
    .filter(Boolean)
    .join("\n");

  let lastError: unknown;
  for (const model of [PRIMARY_MODEL, FALLBACK_MODEL]) {
    try {
      const { object } = await generateObject({ model, schema: PptBodySchema, system, prompt });
      const slides = object.slides.map(sanitizeSlide);
      const content = PptContentSchema.parse({ title: req.title, subtitle: req.subtitle, slides });
      return { content, model };
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(
    `PPT generation failed on both models: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
  );
}

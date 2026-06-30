import { generateObject } from "ai";
import { z } from "zod";
import {
  ReportContentSchema,
  ReportSectionSchema,
  type ReportContent,
} from "@studentos/documents";

// Latest models via Vercel AI Gateway (verified live from the gateway model list).
// Claude primary for quality; Gemini fallback for resilience.
const PRIMARY_MODEL = "anthropic/claude-sonnet-4.6";
const FALLBACK_MODEL = "google/gemini-3.5-flash";

/** Student/academic context — comes from the DB profile, NOT from the model. */
export type ReportStudent = ReportContent["student"];

export type ReportRequest = {
  /** User-provided topic; used verbatim as the report title. */
  title: string;
  /** seminar | mini-project | internship | lab | research */
  reportType: string;
  guidelines?: string;
  targetWords?: number;
  student: ReportStudent;
};

/**
 * The model produces ONLY the academic body. Student identity is injected from
 * the profile so the model can't invent or alter it. We validate the body, merge,
 * then validate the whole against the renderer's ReportContent contract.
 */
const ReportBodySchema = z.object({
  abstract: z.string().min(40),
  sections: z.array(ReportSectionSchema).min(3),
  references: z.array(z.string().min(8)).min(2),
});

function systemPrompt(): string {
  return [
    "You are an academic writing assistant for engineering students in India.",
    "You write complete, original, well-structured academic reports in a formal tone.",
    "Use clear section headings, substantial paragraphs, and realistic, plausible references.",
    "Do not include the cover page, student name, roll number, or college — those are added separately.",
    "Write content that reads as genuine student academic work, not as AI output.",
  ].join(" ");
}

function userPrompt(req: ReportRequest): string {
  const words = req.targetWords ?? 1500;
  return [
    `Write a ${req.reportType} report titled "${req.title}".`,
    `Department: ${req.student.department}. Semester: ${req.student.semester}.`,
    req.guidelines ? `Specific guidelines to follow: ${req.guidelines}` : "",
    `Target length: about ${words} words across the sections.`,
    "Produce: an abstract; an ordered list of sections (typically Introduction, Literature Review,",
    "Methodology, Results/Discussion, Conclusion — adapt to the report type); and a reference list.",
    "Each section needs a clear heading and one or more full paragraphs of content.",
  ]
    .filter(Boolean)
    .join("\n");
}

export type GenerateReportResult = {
  content: ReportContent;
  /** Which gateway model actually produced the content. */
  model: string;
};

/**
 * Generate structured report content. Tries Claude, falls back to Gemini on failure.
 * Returns content validated against the renderer's contract — ready for packages/documents.
 */
/** Deterministic offline content — lets the full pipeline run locally without AI credits. */
function stubReportBody(req: ReportRequest): z.infer<typeof ReportBodySchema> {
  const t = req.title;
  const dept = req.student.department;
  return {
    abstract: `This ${req.reportType} report on "${t}" presents a structured academic overview for ${dept}. (Locally stubbed content — generated without AI credits; the real model produces this section in production.)`,
    sections: [
      { heading: "1. Introduction", content: `This report introduces ${t} in the context of ${dept}, outlining its relevance, scope, and objectives for this ${req.reportType}.` },
      { heading: "2. Literature Review", content: `Several prior studies relate to ${t}. This section summarises the existing approaches and identifies the gap this report addresses.` },
      { heading: "3. Methodology", content: `The methodology adopted for ${t} is described here, including the approach, assumptions, and the steps followed during the study.` },
      { heading: "4. Results & Discussion", content: `The findings related to ${t} are presented and interpreted, with discussion of their significance and limitations.` },
      { heading: "5. Conclusion", content: `In conclusion, ${t} demonstrates meaningful outcomes for ${dept}, and future work can extend these results further.` },
    ],
    references: [
      "Author A., 'A study relevant to the topic', Journal of Engineering Research, 2023.",
      "Author B., 'Another relevant reference work', Proceedings of the National Conference, 2022.",
    ],
  };
}

// ---------------- PPT → Report (#8.1) ----------------

export type PptToReportRequest = {
  title: string;
  reportType?: string;
  student: ReportStudent;
  slides: { heading: string; bullets: string[] }[];
  guidelines?: string;
};

function stubPptToReportBody(req: PptToReportRequest): z.infer<typeof ReportBodySchema> {
  const sections = req.slides
    .filter((s) => s.heading?.trim())
    .map((s, i) => ({
      heading: `${i + 1}. ${s.heading}`,
      content:
        (s.bullets ?? []).map((b) => b.replace(/\s+/g, " ").trim()).filter(Boolean).join(". ") +
        ". (Expanded from the presentation; the real model writes full prose here.)",
    }));
  while (sections.length < 3) sections.push({ heading: `${sections.length + 1}. Discussion`, content: "Further discussion of the topic." });
  return {
    abstract: `This report expands the presentation "${req.title}" into a written academic document for ${req.student.department}. (Locally stubbed expansion.)`,
    sections,
    references: [
      "Author A., 'A study relevant to the topic', Journal of Engineering Research, 2023.",
      "Author B., 'Another relevant reference', Proceedings of the National Conference, 2022.",
    ],
  };
}

/** Expand an existing deck's slides into a full written report (preserving its structure). */
export async function expandPptToReport(req: PptToReportRequest): Promise<GenerateReportResult> {
  const assemble = (body: z.infer<typeof ReportBodySchema>) =>
    ReportContentSchema.parse({ title: req.title, student: req.student, abstract: body.abstract, sections: body.sections, references: body.references });

  if (process.env.AI_DRIVER === "stub") {
    return { content: assemble(ReportBodySchema.parse(stubPptToReportBody(req))), model: "stub" };
  }

  const system = systemPrompt();
  const deck = req.slides.map((s, i) => `Slide ${i + 1} — ${s.heading}\n${(s.bullets ?? []).map((b) => `- ${b}`).join("\n")}`).join("\n\n");
  const prompt = [
    `Convert this presentation into a full ${req.reportType ?? "project"} report titled "${req.title}".`,
    `Department: ${req.student.department}. Semester: ${req.student.semester}.`,
    "Preserve the deck's structure: each slide becomes a report section (expand its bullets into full paragraphs).",
    "Add an abstract and a realistic reference list.",
    req.guidelines ? `Guidelines: ${req.guidelines}` : "",
    "",
    "Presentation content:",
    deck,
  ].filter(Boolean).join("\n");

  let lastError: unknown;
  for (const model of [PRIMARY_MODEL, FALLBACK_MODEL]) {
    try {
      const { object } = await generateObject({ model, schema: ReportBodySchema, system, prompt });
      return { content: assemble(object), model };
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(`PPT→Report failed: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

export async function generateReportContent(req: ReportRequest): Promise<GenerateReportResult> {
  // Local/dev mode: skip the gateway entirely and use deterministic content.
  if (process.env.AI_DRIVER === "stub") {
    const object = ReportBodySchema.parse(stubReportBody(req));
    const content = ReportContentSchema.parse({
      title: req.title,
      student: req.student,
      abstract: object.abstract,
      sections: object.sections,
      references: object.references,
    });
    return { content, model: "stub" };
  }

  const system = systemPrompt();
  const prompt = userPrompt(req);
  let lastError: unknown;

  for (const model of [PRIMARY_MODEL, FALLBACK_MODEL]) {
    try {
      const { object } = await generateObject({
        model,
        schema: ReportBodySchema,
        system,
        prompt,
      });

      // Merge model-authored body with authoritative student identity + title,
      // then validate the whole against the renderer contract.
      const content = ReportContentSchema.parse({
        title: req.title,
        student: req.student,
        abstract: object.abstract,
        sections: object.sections,
        references: object.references,
      });

      return { content, model };
    } catch (err) {
      lastError = err;
      // Try the fallback model before giving up.
    }
  }

  throw new Error(
    `Report generation failed on both models: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
  );
}

// ----------------------- Figure suggestions (propose, don't generate) -----------------------
// Proposes which sections would benefit from a figure + a precise image prompt and caption. We
// generate NOTHING here — the student approves each suggestion before any image model is called
// (so a "Skip" costs zero credits).

export const FigureSuggestionSchema = z.object({
  sectionIndex: z.number().int().min(0),
  caption: z.string().min(3),
  /** A precise, self-contained prompt for an image model. Flat, clean, academic, NO text in image. */
  imagePrompt: z.string().min(10),
});
export type FigureSuggestion = z.infer<typeof FigureSuggestionSchema>;
const FigureSuggestionsSchema = z.object({ figures: z.array(FigureSuggestionSchema).max(6) });

export type SuggestFiguresRequest = {
  title: string;
  sections: { heading: string; content: string }[];
  /** Max figures to propose (keeps reports clean and credit-cheap). */
  max?: number;
};

export async function suggestReportFigures(req: SuggestFiguresRequest): Promise<{ figures: FigureSuggestion[]; model: string }> {
  if (process.env.AI_DRIVER === "stub") return { figures: [], model: "stub" };

  const max = req.max ?? 3;
  const outline = req.sections.map((s, i) => `[${i}] ${s.heading}: ${s.content.slice(0, 240)}`).join("\n");
  const system = [
    "You decide which sections of an academic report would genuinely benefit from a FIGURE (diagram, architecture, flowchart, labelled illustration), and write a precise image prompt for each.",
    `Propose at most ${max} figures — only where a visual truly adds value (skip purely textual sections like the abstract, references, or pure discussion).`,
    "Each imagePrompt must be self-contained and produce a clean, modern, FLAT vector academic illustration with NO text/labels/words in the image, suitable to sit inside a report. Describe the concept concretely.",
    "caption is a short figure caption (e.g. 'Figure 1: System architecture of the proposed pipeline').",
    "Return sectionIndex matching the [n] index of the section the figure belongs to.",
  ].join("\n");
  const prompt = `Report title: ${req.title}\n\nSections:\n${outline}`;

  let lastError: unknown;
  for (const model of [PRIMARY_MODEL, FALLBACK_MODEL]) {
    try {
      const { object } = await generateObject({ model, schema: FigureSuggestionsSchema, system, prompt });
      const figures = object.figures.filter((f) => f.sectionIndex < req.sections.length).slice(0, max);
      return { figures, model };
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(`Figure suggestion failed: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

import { z } from "zod";

/**
 * The structured content contract for an academic report.
 *
 * This is the ONLY thing the AI model produces. It is validated against this
 * schema, then handed to a deterministic renderer that injects it into a locked
 * institutional DOCX/PPTX template. The model never emits document XML or layout,
 * so per-college formatting can never be broken by a bad generation.
 */
export const ReportSectionSchema = z.object({
  heading: z.string().min(1),
  /** Body prose. Newlines become line breaks in the rendered document. */
  content: z.string().min(1),
  /** Optional AI-generated figure for this section (default report format only). */
  image: z.string().optional(), // R2 object key; resolved to bytes at render time
  caption: z.string().optional(), // figure caption shown under the image
  imagePrompt: z.string().optional(), // the prompt used (kept for regenerate)
  imageWidthPct: z.number().min(20).max(100).optional(), // figure size as % of page width (default 100)
});

export const ReportContentSchema = z.object({
  title: z.string().min(1),
  student: z.object({
    name: z.string().min(1),
    roll: z.string().min(1),
    department: z.string().min(1),
    semester: z.string().min(1),
    college: z.string().min(1),
    guide: z.string().default("—"),
  }),
  abstract: z.string().min(1),
  /** Ordered sections: introduction, literature review, methodology, results, conclusion, … */
  sections: z.array(ReportSectionSchema).min(1),
  references: z.array(z.string().min(1)).default([]),
});

export type ReportSection = z.infer<typeof ReportSectionSchema>;
export type ReportContent = z.infer<typeof ReportContentSchema>;

/** Thrown when model output doesn't fit the template's slots. We fail loudly and regenerate. */
export class TemplateContractError extends Error {
  constructor(
    message: string,
    public readonly issues: unknown,
  ) {
    super(message);
    this.name = "TemplateContractError";
  }
}

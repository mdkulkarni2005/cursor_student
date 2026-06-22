import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";
import { z } from "zod";

/**
 * A worked assignment solution — the "answer", per the product brief (not a
 * formatted report). Rendered to a clean DOCX programmatically (no template).
 */
export const AssignmentStepSchema = z.object({
  heading: z.string().min(1),
  detail: z.string().min(1),
});

export const AssignmentSolutionSchema = z.object({
  questionSummary: z.string().min(1),
  approach: z.string().min(1),
  steps: z.array(AssignmentStepSchema).min(1),
  finalAnswer: z.string().min(1),
  /** Present when the assignment involves code. */
  code: z.string().optional(),
});

export type AssignmentStep = z.infer<typeof AssignmentStepSchema>;
export type AssignmentSolution = z.infer<typeof AssignmentSolutionSchema>;

export async function renderAssignmentDocx(
  raw: unknown,
  meta?: { title?: string },
): Promise<{ buffer: Buffer }> {
  const sol = AssignmentSolutionSchema.parse(raw);

  const heading = (text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel]) =>
    new Paragraph({ heading: level, spacing: { before: 220, after: 100 }, children: [new TextRun(text)] });
  const body = (text: string) =>
    new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after: 140 }, children: [new TextRun(text)] });

  const children: Paragraph[] = [];
  if (meta?.title) {
    children.push(new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun(meta.title)] }));
  }
  children.push(heading("Question", HeadingLevel.HEADING_1), body(sol.questionSummary));
  children.push(heading("Approach", HeadingLevel.HEADING_2), body(sol.approach));
  children.push(heading("Solution", HeadingLevel.HEADING_2));
  for (const s of sol.steps) {
    children.push(heading(s.heading, HeadingLevel.HEADING_3), body(s.detail));
  }
  children.push(heading("Final Answer", HeadingLevel.HEADING_2), body(sol.finalAnswer));
  if (sol.code) {
    children.push(heading("Code", HeadingLevel.HEADING_2));
    for (const line of sol.code.split("\n")) {
      children.push(
        new Paragraph({ children: [new TextRun({ text: line || " ", font: "Courier New", size: 20 })] }),
      );
    }
  }

  const doc = new Document({
    styles: { default: { document: { run: { font: "Calibri", size: 22 } } } },
    sections: [{ children }],
  });
  const buffer = await Packer.toBuffer(doc);
  return { buffer };
}

import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } from "docx";
import { z } from "zod";

/**
 * A lab report generated from raw readings (+ optional graph image), in college format —
 * cross-branch: every non-CS branch (and CS/IT too) does weekly lab reports. Rendered
 * programmatically (no template), same shape as Assignment Solver.
 */
export const LabObservationTableSchema = z.object({
  columns: z.array(z.string().min(1)).min(1),
  rows: z.array(z.array(z.string())).min(1),
});

export const LabReportSolutionSchema = z.object({
  aim: z.string().min(1),
  apparatus: z.array(z.string().min(1)).min(1),
  theory: z.string().optional(),
  procedure: z.array(z.string().min(1)).min(1),
  observations: LabObservationTableSchema,
  calculations: z.string().optional(),
  result: z.string().min(1),
  conclusion: z.string().min(1),
  precautions: z.array(z.string()).optional(),
});

export type LabObservationTable = z.infer<typeof LabObservationTableSchema>;
export type LabReportSolution = z.infer<typeof LabReportSolutionSchema>;

const CELL_BORDER = { style: BorderStyle.SINGLE, size: 2, color: "999999" } as const;

function observationTable(t: LabObservationTable): Table {
  const cellBorders = { top: CELL_BORDER, bottom: CELL_BORDER, left: CELL_BORDER, right: CELL_BORDER };
  const headerRow = new TableRow({
    children: t.columns.map(
      (c) =>
        new TableCell({
          borders: cellBorders,
          children: [new Paragraph({ children: [new TextRun({ text: c, bold: true })] })],
        }),
    ),
  });
  const dataRows = t.rows.map(
    (row) =>
      new TableRow({
        children: row.map(
          (cell) => new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun(cell)] })] }),
        ),
      }),
  );
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [headerRow, ...dataRows] });
}

export async function renderLabReportDocx(
  raw: unknown,
  meta?: { title?: string },
): Promise<{ buffer: Buffer }> {
  const sol = LabReportSolutionSchema.parse(raw);

  const heading = (text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel]) =>
    new Paragraph({ heading: level, spacing: { before: 220, after: 100 }, children: [new TextRun(text)] });
  const body = (text: string) =>
    new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after: 140 }, children: [new TextRun(text)] });
  const bullet = (text: string) => new Paragraph({ bullet: { level: 0 }, spacing: { after: 80 }, children: [new TextRun(text)] });

  const children: (Paragraph | Table)[] = [];
  if (meta?.title) children.push(new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun(meta.title)] }));

  children.push(heading("Aim", HeadingLevel.HEADING_1), body(sol.aim));
  children.push(heading("Apparatus / Materials", HeadingLevel.HEADING_2));
  for (const a of sol.apparatus) children.push(bullet(a));

  if (sol.theory) children.push(heading("Theory", HeadingLevel.HEADING_2), body(sol.theory));

  children.push(heading("Procedure", HeadingLevel.HEADING_2));
  sol.procedure.forEach((step, i) => children.push(bullet(`${i + 1}. ${step}`)));

  children.push(heading("Observations", HeadingLevel.HEADING_2));
  children.push(observationTable(sol.observations));
  children.push(new Paragraph({ spacing: { after: 140 }, children: [] }));

  if (sol.calculations) children.push(heading("Calculations", HeadingLevel.HEADING_2), body(sol.calculations));

  children.push(heading("Result", HeadingLevel.HEADING_2), body(sol.result));

  if (sol.precautions?.length) {
    children.push(heading("Precautions", HeadingLevel.HEADING_2));
    for (const p of sol.precautions) children.push(bullet(p));
  }

  children.push(heading("Conclusion", HeadingLevel.HEADING_2), body(sol.conclusion));

  children.push(
    new Paragraph({
      spacing: { before: 300 },
      children: [
        new TextRun({
          text: "AI-generated from your submitted readings — verify values, units, and conclusions against your lab manual before submitting.",
          italics: true,
          size: 18,
          color: "996600",
        }),
      ],
    }),
  );

  const doc = new Document({
    styles: { default: { document: { run: { font: "Calibri", size: 22 } } } },
    sections: [{ children }],
  });
  const buffer = await Packer.toBuffer(doc);
  return { buffer };
}

import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } from "docx";
import { z } from "zod";

/**
 * A Bill of Quantities estimate — itemized quantity/rate/amount table, not a step-by-step solve.
 * Deliberately its own schema/renderer (not the generic branch-solver pipeline) since the output
 * shape genuinely differs: a table with a grand total, not worked steps.
 */
export const BOQItemSchema = z.object({
  description: z.string().min(1),
  unit: z.string().min(1),
  quantity: z.number(),
  rate: z.number(),
  amount: z.number(),
});

export const BOQEstimateSchema = z.object({
  title: z.string().min(1),
  items: z.array(BOQItemSchema).min(1),
  /** Any assumptions made (e.g. rates not given, so a typical market rate was assumed). */
  assumptions: z.array(z.string()).optional(),
  totalAmount: z.number(),
});

export type BOQItem = z.infer<typeof BOQItemSchema>;
export type BOQEstimate = z.infer<typeof BOQEstimateSchema>;

const CELL_BORDER = { style: BorderStyle.SINGLE, size: 2, color: "999999" } as const;

function inr(n: number): string {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export async function renderBoqDocx(raw: unknown, meta?: { title?: string }): Promise<{ buffer: Buffer }> {
  const est = BOQEstimateSchema.parse(raw);
  const cellBorders = { top: CELL_BORDER, bottom: CELL_BORDER, left: CELL_BORDER, right: CELL_BORDER };

  const headerRow = new TableRow({
    children: ["#", "Description", "Unit", "Qty", "Rate", "Amount"].map(
      (c) => new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: c, bold: true })] })] }),
    ),
  });
  const rows = est.items.map(
    (item, i) =>
      new TableRow({
        children: [
          String(i + 1), item.description, item.unit, String(item.quantity), inr(item.rate), inr(item.amount),
        ].map((c) => new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun(c)] })] })),
      }),
  );
  const totalRow = new TableRow({
    children: [
      new TableCell({ borders: cellBorders, columnSpan: 5, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "Grand Total", bold: true })] })] }),
      new TableCell({ borders: cellBorders, children: [new Paragraph({ children: [new TextRun({ text: inr(est.totalAmount), bold: true })] })] }),
    ],
  });

  const children: (Paragraph | Table)[] = [];
  children.push(new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun(meta?.title || est.title)] }));
  children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [headerRow, ...rows, totalRow] }));

  if (est.assumptions?.length) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 260, after: 100 }, children: [new TextRun("Assumptions")] }));
    for (const a of est.assumptions) {
      children.push(new Paragraph({ bullet: { level: 0 }, spacing: { after: 80 }, children: [new TextRun(a)] }));
    }
  }

  children.push(
    new Paragraph({
      spacing: { before: 300 },
      children: [
        new TextRun({
          text: "AI-generated estimate — verify rates and quantities against your local DSR/SOR and site conditions before submitting.",
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

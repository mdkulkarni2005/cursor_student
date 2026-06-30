import { Document, Packer, Paragraph, TextRun, ImageRun, HeadingLevel, AlignmentType, BorderStyle } from "docx";
import { ReportContentSchema, type ReportContent } from "./types";

/**
 * Programmatic academic-report renderer (default format) built directly with the `docx` library so
 * we can embed AI-generated FIGURES with captions — something the docxtemplater template path can't
 * do. Used when the student hasn't uploaded a custom .docx template. Uploaded templates keep using
 * the template-fill path (text-only / best-effort).
 *
 * Section images are passed as decoded PNG buffers keyed by section index (resolved from R2 by the
 * caller) so this package stays storage-agnostic.
 */
export type SectionImages = Map<number, Buffer>;

const FIGURE_W = 468; // ~page content width in px at 72dpi (A4 with 1" margins)
const FIGURE_H = 312; // 3:2, matching the 1536x1024 generation size

function paras(text: string): Paragraph[] {
  return text
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map(
      (block) =>
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 160, line: 300 },
          children: block.split("\n").flatMap((line, i) => (i === 0 ? [new TextRun(line)] : [new TextRun({ text: line, break: 1 })])),
        }),
    );
}

function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 320, after: 120 },
    children: [new TextRun({ text, bold: true, size: 28, color: "1F2937" })],
  });
}

export async function renderReportDocxProgrammatic(rawContent: unknown, images: SectionImages = new Map()): Promise<Buffer> {
  const content: ReportContent = ReportContentSchema.parse(rawContent);
  const children: Paragraph[] = [];

  // ---- Cover block ----
  children.push(
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 480, after: 80 }, children: [new TextRun({ text: content.title, bold: true, size: 40, color: "111827" })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 360 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "4F46E5", space: 8 } }, children: [new TextRun({ text: "Academic Report", italics: true, size: 22, color: "4F46E5" })] }),
  );
  const s = content.student;
  for (const [label, value] of [["Name", s.name], ["Department", s.department], ["Semester", s.semester], ["College", s.college], ["Guide", s.guide]] as const) {
    if (value && value !== "—") {
      children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [new TextRun({ text: `${label}: `, bold: true, size: 22 }), new TextRun({ text: String(value), size: 22 })] }));
    }
  }

  // ---- Abstract ----
  children.push(sectionHeading("Abstract"), ...paras(content.abstract));

  // ---- Sections (with optional figures) ----
  content.sections.forEach((sec, i) => {
    children.push(sectionHeading(sec.heading), ...paras(sec.content));
    const buf = images.get(i);
    if (buf) {
      children.push(
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 40 }, children: [new ImageRun({ data: buf, transformation: { width: FIGURE_W, height: FIGURE_H }, type: "png" })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: sec.caption ?? `Figure ${[...images.keys()].filter((k) => k <= i).length}`, italics: true, size: 18, color: "6B7280" })] }),
      );
    }
  });

  // ---- References ----
  if (content.references.length) {
    children.push(sectionHeading("References"));
    content.references.forEach((ref, i) =>
      children.push(new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: `[${i + 1}] `, bold: true }), new TextRun(ref)] })),
    );
  }

  const doc = new Document({
    styles: { default: { document: { run: { font: "Calibri", size: 22 } } } },
    sections: [{ properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } }, children }],
  });
  return Packer.toBuffer(doc) as unknown as Promise<Buffer>;
}

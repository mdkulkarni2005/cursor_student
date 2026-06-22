/**
 * Generates a stand-in "locked institutional template" as a real .docx with
 * docxtemplater placeholders. In production these templates come from each
 * college (their exact cover page, fonts, margins, headings) and are stored as
 * assets in R2 — this script just gives us one real template to prove the pipeline.
 *
 *   pnpm --filter @studentos/documents make:template
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
} from "docx";

const here = dirname(fileURLToPath(import.meta.url));
const outPath = join(here, "..", "templates", "seminar-report.docx");

/** Each placeholder lives in a single TextRun so docxtemplater never sees a split tag. */
const tag = (text: string, opts: ConstructorParameters<typeof TextRun>[0] extends string ? never : Record<string, unknown> = {}) =>
  new TextRun({ text, ...opts });

const center = (children: TextRun[], spacingAfter = 120) =>
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: spacingAfter }, children });

const doc = new Document({
  styles: {
    default: {
      document: { run: { font: "Times New Roman", size: 24 } }, // 12pt — a typical locked report style
    },
  },
  sections: [
    {
      properties: {},
      children: [
        // --- Cover page (locked formatting owned by the template) ---
        center([tag("{student.college}", { bold: true, size: 32 })], 240),
        center([tag("Department of {student.department}", { size: 26 })], 480),
        center([tag("{title}", { bold: true, size: 36 })], 360),
        center([tag("A Seminar Report", { italics: true, size: 26 })], 480),
        center([tag("Submitted by", { size: 24 })], 80),
        center([tag("{student.name}  (Roll No: {student.roll})", { bold: true, size: 26 })], 80),
        center([tag("Semester {student.semester}", { size: 24 })], 80),
        center([tag("Under the guidance of {student.guide}", { size: 24 })], 480),

        // --- Abstract ---
        new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 120 }, children: [tag("Abstract")] }),
        new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after: 200 }, children: [tag("{abstract}")] }),

        // --- Body sections (this block repeats once per section; styling is preserved each time) ---
        new Paragraph({ children: [tag("{#sections}")] }),
        new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 }, children: [tag("{heading}")] }),
        new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after: 160 }, children: [tag("{content}")] }),
        new Paragraph({ children: [tag("{/sections}")] }),

        // --- References ---
        new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 320, after: 120 }, children: [tag("References")] }),
        new Paragraph({ children: [tag("{#references}")] }),
        new Paragraph({ spacing: { after: 60 }, children: [tag("{.}")] }),
        new Paragraph({ children: [tag("{/references}")] }),
      ],
    },
  ],
});

const buffer = await Packer.toBuffer(doc);
writeFileSync(outPath, buffer);
console.log(`✓ template written → ${outPath} (${buffer.length} bytes)`);

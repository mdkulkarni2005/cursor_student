/**
 * Generates a realistic *user-uploaded* template: a real college report layout with
 * heading styles and a cover page, but NO placeholders — just like a student's own file.
 *   pnpm --filter @studentos/documents make:user-template
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";

const here = dirname(fileURLToPath(import.meta.url));
const outPath = join(here, "..", "templates", "user-sample.docx");

const SECTIONS = [
  "Abstract",
  "Introduction",
  "Literature Survey",
  "Methodology",
  "Results and Discussion",
  "Conclusion",
  "References",
];

const center = (runs: TextRun[], after = 120) =>
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after }, children: runs });

const doc = new Document({
  styles: { default: { document: { run: { font: "Times New Roman", size: 24 } } } },
  sections: [
    {
      children: [
        center([new TextRun({ text: "K. J. College of Engineering", bold: true, size: 32 })], 240),
        center([new TextRun({ text: "Department of Mechanical Engineering", size: 26 })], 360),
        center([new TextRun({ text: "A Project Report", italics: true, size: 26 })], 600),
        // The student's headings — using Word Heading styles (detectable by the engine).
        ...SECTIONS.map((s) => new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 240, after: 80 }, children: [new TextRun(s)] })),
      ],
    },
  ],
});

const buffer = await Packer.toBuffer(doc);
writeFileSync(outPath, buffer);
console.log(`✓ user-style template → ${outPath} (${buffer.length} bytes, ${SECTIONS.length} headings)`);

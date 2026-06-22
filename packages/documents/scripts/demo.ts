/**
 * End-to-end proof of the format pipeline (docs/PLAN.md §10, Milestone M1):
 *
 *   structured JSON  →  zod validation  →  inject into locked .docx template  →  real .docx
 *
 * Then we VERIFY the output: the injected data is present and NO placeholder
 * survived — i.e. the institutional formatting was filled, not broken.
 *
 *   pnpm --filter @studentos/documents demo
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import PizZip from "pizzip";
import { renderReportDocx } from "../src/report.js";
import type { ReportContent } from "../src/types.js";

const here = dirname(fileURLToPath(import.meta.url));
const templatePath = join(here, "..", "templates", "seminar-report.docx");
const outPath = join(here, "..", "out", "seminar-report-filled.docx");

// What the AI model would emit for a report (structured content only — no layout).
const content: ReportContent = {
  title: "Waste Heat Recovery in IC Engines",
  student: {
    name: "Aarav Sharma",
    roll: "ME21-047",
    department: "Mechanical Engineering",
    semester: "6",
    college: "Sardar Patel Institute of Technology",
    guide: "Prof. R. Deshmukh",
  },
  abstract:
    "This seminar explores recovering waste heat from internal-combustion engine exhaust to improve overall thermal efficiency. Thermoelectric generators and Rankine-cycle approaches are compared.",
  sections: [
    {
      heading: "1. Introduction",
      content:
        "Nearly a third of fuel energy in an IC engine is lost as exhaust heat. Capturing even a fraction of it offers meaningful efficiency gains.",
    },
    {
      heading: "2. Literature Review",
      content:
        "Prior work spans thermoelectric generators (TEGs), organic Rankine cycles, and turbocompounding. TEGs are simplest to retrofit but have low conversion efficiency.",
    },
    {
      heading: "3. Methodology",
      content:
        "An exhaust-mounted TEG array is modelled, with hot-side temperature swept from 300°C to 600°C and electrical output estimated from the Seebeck coefficient.",
    },
    {
      heading: "4. Conclusion",
      content:
        "Waste-heat recovery is a practical path to higher efficiency. A hybrid TEG + Rankine approach gives the best balance of cost and recovered power.",
    },
  ],
  references: [
    "Saidur R. et al., 'Technologies to recover exhaust heat from IC engines', Renewable & Sustainable Energy Reviews, 2012.",
    "Yu C. & Chau K.T., 'Thermoelectric automotive waste heat recovery', Energy Conversion and Management, 2009.",
  ],
};

const templateBuffer = readFileSync(templatePath);
const { buffer } = renderReportDocx(content, templateBuffer);
writeFileSync(outPath, buffer);

// ---- Verification ----------------------------------------------------------
const documentXml = new PizZip(buffer).file("word/document.xml")!.asText();

const mustContain = [content.title, content.student.name, content.student.roll, content.abstract, content.sections[2]!.heading, content.references[0]!];
const placeholderArtifacts = ["{title}", "{abstract}", "{#sections}", "{/sections}", "{heading}", "{content}", "{.}", "{student.name}"];

// OOXML escapes &, <, > inside <w:t>, so compare against the escaped form.
const xmlEscape = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/'/g, "&apos;")
    .replace(/"/g, "&quot;");
const missing = mustContain.filter((s) => !documentXml.includes(xmlEscape(s)));
const leftover = placeholderArtifacts.filter((s) => documentXml.includes(s));

console.log(`✓ rendered → ${outPath} (${buffer.length} bytes)`);
console.log(`  data fields injected : ${mustContain.length - missing.length}/${mustContain.length}`);
console.log(`  placeholders leftover: ${leftover.length}`);

if (missing.length || leftover.length) {
  if (missing.length) console.error("  ✗ MISSING in output:", missing);
  if (leftover.length) console.error("  ✗ LEFTOVER placeholders:", leftover);
  process.exit(1);
}
console.log("✓ PASS — structured content rendered into the locked template with formatting intact.");

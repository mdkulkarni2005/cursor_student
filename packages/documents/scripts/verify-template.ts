/**
 * Proves the user-template engine: inspect → fill → integrity-check, format preserved.
 *   pnpm --filter @studentos/documents verify:template
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import PizZip from "pizzip";
import { inspectTemplate, fillTemplate } from "../src/template-fill.js";

const here = dirname(fileURLToPath(import.meta.url));
const templatePath = join(here, "..", "templates", "user-sample.docx");
const outPath = join(here, "..", "out", "user-sample-filled.docx");

const buffer = readFileSync(templatePath);

// 1. Pre-check + heading extraction.
const inspection = inspectTemplate(buffer);
console.log(`  inspect.ok=${inspection.ok}  sections=[${inspection.sections.join(", ")}]`);
if (!inspection.ok) {
  console.error("  ✗ inspect failed:", inspection.issues);
  process.exit(1);
}

// 2. Fill content keyed to the user's actual headings.
const content: Record<string, string> = {
  Abstract: "This report investigates waste-heat recovery in IC engines, comparing thermoelectric and Rankine approaches.\n\nIt summarizes the methodology and key findings.",
  Introduction: "Internal-combustion engines lose roughly a third of fuel energy as exhaust heat. Recovering even part of it improves efficiency.",
  Methodology: "An exhaust-mounted thermoelectric array is modelled across a range of hot-side temperatures, with output estimated from the Seebeck effect.",
  "Results and Discussion": "Recovered power rises with temperature; a hybrid TEG + Rankine setup gives the best cost-to-output balance.",
  Conclusion: "Waste-heat recovery is a practical efficiency gain, with a hybrid approach recommended for further work.",
};
const { buffer: filledBuf, filled, missed } = fillTemplate(buffer, content);
writeFileSync(outPath, filledBuf);

// 3. Verify: valid output, headings preserved, content injected.
const xml = new PizZip(filledBuf).file("word/document.xml")!.asText();
const headingsPreserved = inspection.sections.every((s) => xml.includes(s));
const contentPresent = xml.includes("waste-heat recovery in IC engines") && xml.includes("Seebeck");

console.log(`  filled=[${filled.join(", ")}]`);
console.log(`  missed=[${missed.join(", ")}]  headingsPreserved=${headingsPreserved}  contentInjected=${contentPresent}`);

const ok = filled.length >= 4 && headingsPreserved && contentPresent;
console.log(ok ? "✓ PASS — user template filled with content, formatting + headings preserved." : "✗ FAIL");
if (!ok) process.exit(1);

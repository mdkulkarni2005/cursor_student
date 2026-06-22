/**
 * Full user-template path: inspect the user's file → AI writes content for ITS headings →
 * fill → integrity guard. (stub AI; no card needed.)
 *   AI_DRIVER=stub pnpm --filter web verify:user-template
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { inspectTemplate, fillTemplate } from "@studentos/documents";
import { generateTemplateContent } from "@studentos/ai";

const here = dirname(fileURLToPath(import.meta.url));
const templatePath = join(here, "..", "..", "..", "packages", "documents", "templates", "user-sample.docx");
const outPath = join(here, "..", "..", "..", "packages", "documents", "out", "user-sample-ai-filled.docx");

async function main() {
  const buffer = readFileSync(templatePath);

  const inspection = inspectTemplate(buffer);
  if (!inspection.ok) {
    console.error("✗ inspect failed:", inspection.issues);
    process.exit(1);
  }
  console.log(`  headings: [${inspection.sections.join(", ")}]`);

  const { contentByHeading, model } = await generateTemplateContent({
    topic: "Waste Heat Recovery in IC Engines",
    docKind: "report",
    headings: inspection.sections,
    department: "Mechanical Engineering",
  });
  console.log(`  AI (${model}) produced content for ${Object.keys(contentByHeading).length} headings`);

  const { buffer: out, filled, missed } = fillTemplate(buffer, contentByHeading);
  writeFileSync(outPath, out);

  // Re-inspect the output: valid OOXML + the user's headings still present.
  const reinspect = inspectTemplate(out);
  const headingsPreserved = inspection.sections.every((s) => reinspect.sections.includes(s));

  console.log(`  filled=${filled.length}/${inspection.sections.length}  missed=[${missed.join(", ")}]  headingsPreserved=${headingsPreserved}`);

  const ok = filled.length >= inspection.sections.length - 1 && headingsPreserved;
  console.log(ok ? "✓ PASS — AI wrote content for the user's headings; their format is intact." : "✗ FAIL");
  if (!ok) process.exit(1);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

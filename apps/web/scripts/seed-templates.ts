/**
 * Seeds the locked report template into R2 and registers it in Neon (#2).
 * Run from repo root with env loaded:
 *   export $(grep -E '^(DATABASE_URL|R2_)' apps/web/.env.local | sed 's/"//g' | xargs)
 *   pnpm --filter web seed:templates
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { prisma } from "@studentos/db";
import { putObject } from "@studentos/storage";

const here = dirname(fileURLToPath(import.meta.url));
const templatePath = join(
  here,
  "..",
  "..",
  "..",
  "packages",
  "documents",
  "templates",
  "seminar-report.docx",
);
const storageKey = "templates/seminar-report-v1.docx";
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

async function main() {
  const buffer = readFileSync(templatePath);
  await putObject(storageKey, buffer, DOCX_MIME);
  console.log(`✓ uploaded ${storageKey} (${buffer.length} bytes) → R2`);

  const existing = await prisma.template.findFirst({
    where: { name: "Seminar Report (Default)", type: "REPORT" },
  });
  const tpl = existing
    ? await prisma.template.update({ where: { id: existing.id }, data: { storageKey, isDefault: true } })
    : await prisma.template.create({
        data: { type: "REPORT", name: "Seminar Report (Default)", storageKey, isDefault: true },
      });

  console.log(`✓ Template ${tpl.id} registered in Neon (default REPORT)`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

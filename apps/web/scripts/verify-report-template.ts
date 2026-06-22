/**
 * Proves report generation INTO the user's own uploaded template, through the real
 * orchestration (quota, workspace, store). stub AI + local storage.
 *   export $(grep -E '^DATABASE_URL' apps/web/.env.local | sed 's/"//g' | xargs)
 *   STORAGE_DRIVER=local AI_DRIVER=stub pnpm --filter web verify:report-template
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { prisma } from "@studentos/db";
import { putObject, getObjectBuffer } from "@studentos/storage";
import { inspectTemplate } from "@studentos/documents";
import { generateAndStoreReport } from "../lib/reports/generate.js";

const here = dirname(fileURLToPath(import.meta.url));
const userTemplate = join(here, "..", "..", "..", "packages", "documents", "templates", "user-sample.docx");
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

async function main() {
  let inst = await prisma.institution.findFirst({ where: { name: "Local Test College" } });
  inst ??= await prisma.institution.create({ data: { name: "Local Test College" } });
  const user = await prisma.user.upsert({
    where: { clerkId: "local-tpl-test" },
    create: {
      clerkId: "local-tpl-test", email: "local-tpl@studentos.local", name: "Template Tester",
      department: "Mechanical Engineering", semester: "6", onboardedAt: new Date(), institutionId: inst.id, plan: "PRO",
    },
    update: { plan: "PRO", department: "Mechanical Engineering", institutionId: inst.id },
  });

  // Simulate the user uploading their template.
  const templateKey = `uploads/${user.id}/user-template.docx`;
  await putObject(templateKey, readFileSync(userTemplate), DOCX_MIME);

  const { docId } = await generateAndStoreReport({
    userId: user.id,
    title: "Waste Heat Recovery in IC Engines",
    reportType: "seminar",
    guidelines: "Focus on thermoelectric generators.",
    templateKey,
  });

  const doc = await prisma.document.findUnique({ where: { id: docId }, include: { exports: true, content: true } });
  const exp = doc?.exports[0];
  const out = exp ? await getObjectBuffer(exp.storageKey) : null;
  const isDocx = !!out && out[0] === 0x50 && out[1] === 0x4b;
  // The output must still contain the user's original headings.
  const reinspect = out ? inspectTemplate(out) : { sections: [] as string[] };
  const headingsKept = ["Abstract", "Introduction", "Methodology", "Conclusion"].every((h) => reinspect.sections.includes(h));
  const sectionCount = ((doc?.content?.data as { sections?: unknown[] } | undefined)?.sections ?? []).length;

  console.log(`  status:${doc?.status} | export:${exp?.sizeBytes}b validDocx:${isDocx} | sections:${sectionCount} | userHeadingsKept:${headingsKept}`);
  const ok = doc?.status === "READY" && isDocx && headingsKept && sectionCount >= 5;
  console.log(ok ? "✓ PASS — report generated into the user's own template, format preserved." : "✗ FAIL");
  if (!ok) process.exit(1);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });

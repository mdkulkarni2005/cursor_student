/**
 * Proves the mid-generation NEEDS_INPUT checkpoint: pause → ask → resume → finish.
 *   export $(grep -E '^DATABASE_URL' apps/web/.env.local | sed 's/"//g' | xargs)
 *   STORAGE_DRIVER=local AI_DRIVER=stub pnpm --filter web verify:needs-input
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { prisma } from "@studentos/db";
import { getObjectBuffer, putObject } from "@studentos/storage";
import { generateAndStoreReport, resumeReportGeneration } from "../lib/reports/generate.js";

const here = dirname(fileURLToPath(import.meta.url));
const seminarTemplate = join(here, "..", "..", "..", "packages", "documents", "templates", "seminar-report.docx");
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

async function main() {
  let inst = await prisma.institution.findFirst({ where: { name: "Local Test College" } });
  inst ??= await prisma.institution.create({ data: { name: "Local Test College" } });
  const user = await prisma.user.upsert({
    where: { clerkId: "local-needsinput" },
    create: {
      clerkId: "local-needsinput", email: "local-needsinput@studentos.local", name: "Pause Tester",
      department: "Computer Engineering", semester: "5", onboardedAt: new Date(), institutionId: inst.id, plan: "PRO",
    },
    update: { plan: "PRO" },
  });

  // Ensure the default template exists (default-mode generation).
  await putObject("templates/seminar-report-v1.docx", readFileSync(seminarTemplate), DOCX_MIME);
  const t = await prisma.template.findFirst({ where: { name: "Seminar Report (Default)", type: "REPORT" } });
  if (!t) await prisma.template.create({ data: { type: "REPORT", name: "Seminar Report (Default)", storageKey: "templates/seminar-report-v1.docx", isDefault: true } });

  // First pass: NO guidelines → should pause for input.
  const res = await generateAndStoreReport({ userId: user.id, title: "Internet of Things in Agriculture", reportType: "seminar" });
  const doc1 = await prisma.document.findUnique({ where: { id: res.docId }, include: { job: true } });
  const pending = ((doc1?.job?.pending as { questions?: { id: string }[] } | null)?.questions) ?? [];
  console.log(`  first pass → outcome=${res.status}, docStatus=${doc1?.status}, questions=${pending.length}`);

  // Answer and resume.
  const answers: Record<string, string> = {};
  for (const q of pending) answers[q.id] = "Use NPK soil sensors with an ESP32; results show ~20% water saving.";
  await resumeReportGeneration(user.id, res.docId, answers);

  const doc2 = await prisma.document.findUnique({ where: { id: res.docId }, include: { exports: true } });
  const exp = doc2?.exports[0];
  const bytes = exp ? await getObjectBuffer(exp.storageKey) : null;
  const isDocx = !!bytes && bytes[0] === 0x50 && bytes[1] === 0x4b;
  console.log(`  after resume → docStatus=${doc2?.status}, export=${exp?.sizeBytes}b, validDocx=${isDocx}`);

  const ok = res.status === "needs_input" && pending.length > 0 && doc2?.status === "READY" && isDocx;
  console.log(ok ? "✓ PASS — paused mid-generation for input, resumed to a finished report." : "✗ FAIL");
  if (!ok) process.exit(1);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });

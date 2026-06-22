/**
 * Proves PPT → Report conversion (#8.1): generate a deck → convert → a READY report whose
 * sections come from the deck's slides, with a valid .docx export. stub AI + local storage.
 *   export $(grep -E '^DATABASE_URL' apps/web/.env.local | sed 's/"//g' | xargs)
 *   STORAGE_DRIVER=local AI_DRIVER=stub pnpm --filter web verify:ppt-to-report
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { prisma } from "@studentos/db";
import { putObject, getObjectBuffer } from "@studentos/storage";
import { generateAndStorePpt } from "../lib/ppt/generate.js";
import { convertPptToReport } from "../lib/reports/generate.js";

const here = dirname(fileURLToPath(import.meta.url));
const seminarTemplate = join(here, "..", "..", "..", "packages", "documents", "templates", "seminar-report.docx");
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

async function main() {
  let inst = await prisma.institution.findFirst({ where: { name: "Local Test College" } });
  inst ??= await prisma.institution.create({ data: { name: "Local Test College" } });
  const user = await prisma.user.upsert({
    where: { clerkId: "local-ppt2report" },
    create: { clerkId: "local-ppt2report", email: "local-ppt2report@studentos.local", name: "Convert Tester", department: "Electronics Engineering", semester: "6", onboardedAt: new Date(), institutionId: inst.id, plan: "PRO" },
    update: { plan: "PRO" },
  });

  await putObject("templates/seminar-report-v1.docx", readFileSync(seminarTemplate), DOCX_MIME);
  if (!(await prisma.template.findFirst({ where: { name: "Seminar Report (Default)", type: "REPORT" } })))
    await prisma.template.create({ data: { type: "REPORT", name: "Seminar Report (Default)", storageKey: "templates/seminar-report-v1.docx", isDefault: true } });

  // 1) Generate a deck
  const { docId: pptId } = await generateAndStorePpt({ userId: user.id, title: "Smart Grid Monitoring", slideCount: 8, guidelines: "Cover sensing, comms, and a dashboard." });
  const pptSlides = ((await prisma.document.findUnique({ where: { id: pptId }, include: { content: true } }))?.content?.data as { slides?: unknown[] } | undefined)?.slides?.length ?? 0;

  // 2) Convert → report
  const { docId: reportId } = await convertPptToReport(user.id, pptId);
  const report = await prisma.document.findUnique({ where: { id: reportId }, include: { content: true, exports: true } });
  const exp = report?.exports.find((e) => e.format === "DOCX");
  const bytes = exp ? await getObjectBuffer(exp.storageKey) : null;
  const isDocx = !!bytes && bytes[0] === 0x50 && bytes[1] === 0x4b;
  const sections = ((report?.content?.data as { sections?: unknown[] } | undefined)?.sections ?? []).length;

  console.log(`  deck:${pptSlides} slides → report status:${report?.status} sections:${sections} validDocx:${isDocx}`);

  const ok = report?.type === "REPORT" && report?.status === "READY" && isDocx && sections >= 3;
  console.log(ok ? "✓ PASS — deck converted into a written report." : "✗ FAIL");
  if (!ok) process.exit(1);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });

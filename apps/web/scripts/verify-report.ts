/**
 * End-to-end proof of the Report pillar WITHOUT paid services (Part A validation).
 * Real Neon + real DOCX renderer + local file storage + stubbed AI.
 *
 *   export $(grep -E '^DATABASE_URL' apps/web/.env.local | sed 's/"//g' | xargs)
 *   STORAGE_DRIVER=local AI_DRIVER=stub pnpm --filter web verify:report
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { prisma } from "@studentos/db";
import { putObject, getObjectBuffer } from "@studentos/storage";
import { generateAndStoreReport } from "../lib/reports/generate.js";

const here = dirname(fileURLToPath(import.meta.url));
const templatePath = join(here, "..", "..", "..", "packages", "documents", "templates", "seminar-report.docx");
const TEMPLATE_KEY = "templates/seminar-report-v1.docx";
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

async function main() {
  // 1. Ensure a test user (mimics an onboarded student).
  let inst = await prisma.institution.findFirst({ where: { name: "Local Test College" } });
  inst ??= await prisma.institution.create({ data: { name: "Local Test College" } });
  const user = await prisma.user.upsert({
    where: { clerkId: "local-verify-user" },
    create: {
      clerkId: "local-verify-user",
      email: "local-verify@studentos.local",
      name: "Local Tester",
      department: "Mechanical Engineering",
      semester: "6",
      onboardedAt: new Date(),
      institutionId: inst.id,
      plan: "PRO",
    },
    update: { department: "Mechanical Engineering", semester: "6", institutionId: inst.id, plan: "PRO" },
  });

  // 2. Seed the locked template into (local) storage + register it.
  await putObject(TEMPLATE_KEY, readFileSync(templatePath), DOCX_MIME);
  const t = await prisma.template.findFirst({ where: { name: "Seminar Report (Default)", type: "REPORT" } });
  if (t) await prisma.template.update({ where: { id: t.id }, data: { storageKey: TEMPLATE_KEY, isDefault: true } });
  else await prisma.template.create({ data: { type: "REPORT", name: "Seminar Report (Default)", storageKey: TEMPLATE_KEY, isDefault: true } });

  // 3. Run the real orchestration.
  const { docId } = await generateAndStoreReport({
    userId: user.id,
    title: "Waste Heat Recovery in IC Engines",
    reportType: "seminar",
    guidelines: "Focus on thermoelectric generators and the Rankine cycle; ~1200 words; for a seminar panel.",
  });

  // 4. Verify the stored output is a real .docx and the DB rows are correct.
  const doc = await prisma.document.findUnique({
    where: { id: docId },
    include: { exports: true, content: true, job: true },
  });
  const exp = doc?.exports[0];
  const bytes = exp ? await getObjectBuffer(exp.storageKey) : null;
  const isDocx = !!bytes && bytes.length > 1000 && bytes[0] === 0x50 && bytes[1] === 0x4b; // "PK" zip magic

  console.log(`  status      : ${doc?.status}  | job: ${doc?.job?.status}  | model: ${doc?.job?.model}`);
  console.log(`  export      : ${exp?.storageKey}  (${exp?.sizeBytes} bytes)`);
  console.log(`  content row : ${doc?.content ? "saved" : "MISSING"}`);
  console.log(`  valid .docx : ${isDocx}`);

  if (doc?.status === "READY" && isDocx && doc.content) {
    console.log("✓ PASS — full Report pipeline ran end-to-end (real Neon + renderer + local storage + stub AI).");
  } else {
    console.error("✗ FAIL");
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

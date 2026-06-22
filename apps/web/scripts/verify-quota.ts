/**
 * Proves plan-gating (#8): a FREE user gets 2 reports, the 3rd is blocked.
 *   export $(grep -E '^DATABASE_URL' apps/web/.env.local | sed 's/"//g' | xargs)
 *   STORAGE_DRIVER=local AI_DRIVER=stub pnpm --filter web verify:quota
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { prisma } from "@studentos/db";
import { putObject } from "@studentos/storage";
import { generateAndStoreReport } from "../lib/reports/generate.js";
import { QuotaExceededError, quotaStatus } from "../lib/entitlements.js";

const here = dirname(fileURLToPath(import.meta.url));
const templatePath = join(here, "..", "..", "..", "packages", "documents", "templates", "seminar-report.docx");
const TEMPLATE_KEY = "templates/seminar-report-v1.docx";
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

async function main() {
  let inst = await prisma.institution.findFirst({ where: { name: "Local Test College" } });
  inst ??= await prisma.institution.create({ data: { name: "Local Test College" } });
  const user = await prisma.user.upsert({
    where: { clerkId: "local-quota-test" },
    create: {
      clerkId: "local-quota-test",
      email: "local-quota@studentos.local",
      name: "Quota Tester",
      department: "Mechanical Engineering",
      semester: "6",
      onboardedAt: new Date(),
      institutionId: inst.id,
      plan: "FREE",
    },
    update: { plan: "FREE" },
  });

  // Clean slate for a deterministic run.
  await prisma.usageEvent.deleteMany({ where: { userId: user.id } });
  await prisma.document.deleteMany({ where: { ownerId: user.id } });

  // Ensure a default template exists (local storage).
  await putObject(TEMPLATE_KEY, readFileSync(templatePath), DOCX_MIME);
  const t = await prisma.template.findFirst({ where: { name: "Seminar Report (Default)", type: "REPORT" } });
  if (!t) await prisma.template.create({ data: { type: "REPORT", name: "Seminar Report (Default)", storageKey: TEMPLATE_KEY, isDefault: true } });

  const results: string[] = [];
  for (let i = 1; i <= 3; i++) {
    try {
      const { docId } = await generateAndStoreReport({ userId: user.id, title: `Quota Report ${i}`, reportType: "seminar", guidelines: "Standard ~1000-word seminar report." });
      results.push(`  #${i}: OK (${docId.slice(0, 8)})`);
    } catch (e) {
      results.push(`  #${i}: ${e instanceof QuotaExceededError ? "BLOCKED — quota reached" : "ERROR " + (e as Error).message}`);
    }
  }
  console.log(results.join("\n"));
  console.log("  final:", await quotaStatus(user, "REPORT"));

  const ok =
    results[0]!.includes("OK") && results[1]!.includes("OK") && results[2]!.includes("BLOCKED");
  console.log(ok ? "✓ PASS — FREE allowed 2, blocked the 3rd." : "✗ FAIL");
  if (!ok) process.exit(1);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

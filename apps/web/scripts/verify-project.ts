/**
 * End-to-end proof of the Project pillar: AI ideas → finalize → generate bundle
 * (report + PPT + viva, reusing the existing pipelines). stub AI + local storage.
 *   export $(grep -E '^DATABASE_URL' apps/web/.env.local | sed 's/"//g' | xargs)
 *   STORAGE_DRIVER=local AI_DRIVER=stub pnpm --filter web verify:project
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { prisma } from "@studentos/db";
import { putObject } from "@studentos/storage";
import { generateProjectIdeas } from "@studentos/ai";
import { finalizeProject, generateProjectBundle } from "../lib/projects/generate.js";

const here = dirname(fileURLToPath(import.meta.url));
const seminarTemplate = join(here, "..", "..", "..", "packages", "documents", "templates", "seminar-report.docx");
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

async function main() {
  let inst = await prisma.institution.findFirst({ where: { name: "Local Test College" } });
  inst ??= await prisma.institution.create({ data: { name: "Local Test College" } });
  const user = await prisma.user.upsert({
    where: { clerkId: "local-project-test" },
    create: {
      clerkId: "local-project-test", email: "local-project@studentos.local", name: "Project Tester",
      department: "Electronics Engineering", semester: "7", onboardedAt: new Date(), institutionId: inst.id, plan: "PRO",
    },
    update: { plan: "PRO", department: "Electronics Engineering", institutionId: inst.id },
  });

  // Ensure the default report template exists (bundle report uses it).
  await putObject("templates/seminar-report-v1.docx", readFileSync(seminarTemplate), DOCX_MIME);
  const t = await prisma.template.findFirst({ where: { name: "Seminar Report (Default)", type: "REPORT" } });
  if (!t) await prisma.template.create({ data: { type: "REPORT", name: "Seminar Report (Default)", storageKey: "templates/seminar-report-v1.docx", isDefault: true } });

  // 1) Ideas
  const { content } = await generateProjectIdeas({ department: "Electronics Engineering", interests: "energy", difficulty: "major" });
  console.log(`  ideas → ${content.ideas.length} suggestions; first: "${content.ideas[0]!.title}" [${content.ideas[0]!.difficulty}] hw:${content.ideas[0]!.hardwareNeeded}`);

  // 2) Finalize
  const { docId } = await finalizeProject(user.id, content.ideas[0]!, "Team of 2; have an ESP32 and basic sensors.");
  console.log(`  finalize → project doc ${docId}`);

  // 3) Bundle
  const bundle = await generateProjectBundle(user.id, docId);
  const report = bundle.report?.docId ? await prisma.document.findUnique({ where: { id: bundle.report.docId } }) : null;
  const ppt = bundle.ppt?.docId ? await prisma.document.findUnique({ where: { id: bundle.ppt.docId } }) : null;
  const viva = bundle.viva?.docId ? await prisma.vivaSet.findUnique({ where: { documentId: bundle.viva.docId } }) : null;
  const vivaCount = ((viva?.questions as unknown[] | undefined) ?? []).length;

  console.log(`  bundle → report:${bundle.report?.status}(${report?.status}) ppt:${bundle.ppt?.status}(${ppt?.status}) viva:${bundle.viva?.status}(${vivaCount} Qs)`);

  const ok =
    bundle.report?.status === "ready" && report?.status === "READY" &&
    bundle.ppt?.status === "ready" && ppt?.status === "READY" &&
    bundle.viva?.status === "ready" && vivaCount >= 4;
  console.log(ok ? "✓ PASS — ideas → finalize → bundle (report+PPT+viva) all generated." : "✗ FAIL");
  if (!ok) process.exit(1);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });

/**
 * Proves the PPT mid-generation NEEDS_INPUT checkpoint: pause → ask → resume → finish.
 *   export $(grep -E '^DATABASE_URL' apps/web/.env.local | sed 's/"//g' | xargs)
 *   STORAGE_DRIVER=local AI_DRIVER=stub pnpm --filter web verify:ppt-needs-input
 */
import { prisma } from "@studentos/db";
import { getObjectBuffer } from "@studentos/storage";
import { generateAndStorePpt, resumePptGeneration } from "../lib/ppt/generate.js";

async function main() {
  let inst = await prisma.institution.findFirst({ where: { name: "Local Test College" } });
  inst ??= await prisma.institution.create({ data: { name: "Local Test College" } });
  const user = await prisma.user.upsert({
    where: { clerkId: "local-ppt-needsinput" },
    create: {
      clerkId: "local-ppt-needsinput", email: "local-ppt-needsinput@studentos.local", name: "PPT Pause Tester",
      department: "Computer Engineering", semester: "5", onboardedAt: new Date(), institutionId: inst.id, plan: "PRO",
    },
    update: { plan: "PRO" },
  });

  // First pass: NO guidelines → should pause for input (stub draft-gap check).
  const res = await generateAndStorePpt({ userId: user.id, title: "Blockchain for Supply Chains", slideCount: 8 });
  const doc1 = await prisma.document.findUnique({ where: { id: res.docId }, include: { job: true } });
  const pending = ((doc1?.job?.pending as { questions?: { id: string }[] } | null)?.questions) ?? [];
  console.log(`  first pass → outcome=${res.status}, docStatus=${doc1?.status}, questions=${pending.length}`);

  // Answer and resume.
  const answers: Record<string, string> = {};
  for (const q of pending) answers[q.id] = "Use Hyperledger Fabric; demo tracks a coffee shipment end-to-end.";
  await resumePptGeneration(user.id, res.docId, answers);

  const doc2 = await prisma.document.findUnique({ where: { id: res.docId }, include: { exports: true } });
  const exp = doc2?.exports[0];
  const bytes = exp ? await getObjectBuffer(exp.storageKey) : null;
  const isPptx = !!bytes && bytes.length > 1000 && bytes[0] === 0x50 && bytes[1] === 0x4b;
  console.log(`  after resume → docStatus=${doc2?.status}, export=${exp?.sizeBytes}b, validPptx=${isPptx}`);

  const ok = res.status === "needs_input" && pending.length > 0 && doc2?.status === "READY" && isPptx;
  console.log(ok ? "✓ PASS — paused mid-generation for input, resumed to a finished deck." : "✗ FAIL");
  if (!ok) process.exit(1);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });

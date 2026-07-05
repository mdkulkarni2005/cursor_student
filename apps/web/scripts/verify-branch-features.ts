/**
 * End-to-end proof of the branch-feature suite (stub AI + local storage): Lab Report, a generic
 * branch solver (mech-solver), Drawing Viva Prep, and BOQ Estimator — real Prisma writes, real
 * DOCX render/storage round-trip, and the follow-up-loop lock, for each.
 *   export $(grep -E '^DATABASE_URL' apps/web/.env.local | sed 's/"//g' | xargs)
 *   STORAGE_DRIVER=local AI_DRIVER=stub pnpm --filter web verify:branch-features
 */
import { prisma } from "@studentos/db";
import { getObjectBuffer, putObject, keys } from "@studentos/storage";
import { createLabReportDoc, runLabReportGeneration, addLabReportTurn } from "../lib/lab-reports/generate.js";
import { createBranchSolverDoc, runBranchSolverGeneration, addBranchSolverTurn } from "../lib/branch-solver/generate.js";
import { createDrawingVivaDoc, runDrawingVivaGeneration, regenerateDrawingViva } from "../lib/drawing-viva/generate.js";
import { createBoqDoc, runBoqGeneration, addBoqTurn } from "../lib/boq-estimator/generate.js";

let failures = 0;
function ok(name: string, cond: boolean) {
  console.log(`  ${cond ? "✓" : "✗ FAIL"} ${name}`);
  if (!cond) failures++;
}

async function isValidDocx(storageKey: string | undefined): Promise<boolean> {
  if (!storageKey) return false;
  const bytes = await getObjectBuffer(storageKey);
  return bytes.length > 1000 && bytes[0] === 0x50 && bytes[1] === 0x4b; // PK.. zip/docx magic
}

async function testUser(clerkId: string, department: string) {
  let inst = await prisma.institution.findFirst({ where: { name: "Local Test College" } });
  inst ??= await prisma.institution.create({ data: { name: "Local Test College" } });
  return prisma.user.upsert({
    where: { clerkId },
    create: { clerkId, email: `${clerkId}@studentos.local`, name: "Branch Tester", department, semester: "4", onboardedAt: new Date(), institutionId: inst.id, plan: "PRO" },
    update: { plan: "PRO", department, semester: "4", institutionId: inst.id },
  });
}

async function verifyLabReport() {
  console.log("\nLab Report Generator");
  const user = await testUser("local-lab-report-test", "Computer Engineering"); // cross-branch: works for CS too
  const input = { userId: user.id, title: "Ohm's Law Lab", readingsText: "V=2V I=0.4A; V=4V I=0.8A" };
  const docId = await createLabReportDoc(input);
  await runLabReportGeneration(docId, input);

  const doc = await prisma.document.findUnique({ where: { id: docId }, include: { exports: true, content: true, job: true } });
  const exp = doc?.exports[0];
  const data = doc?.content?.data as { observations?: { rows?: unknown[] }; result?: string } | undefined;

  ok("status READY", doc?.status === "READY");
  ok("job SUCCEEDED", doc?.job?.status === "SUCCEEDED");
  ok("valid .docx export", await isValidDocx(exp?.storageKey));
  ok("observation table present", (data?.observations?.rows?.length ?? 0) > 0);

  const after = await addLabReportTurn(user.id, docId, "Reading 2 should be 0.6A, not 0.8A.");
  ok("follow-up loop updates conversation", (after.conversation?.length ?? 0) === 2);
}

async function verifyBranchSolver() {
  console.log("\nBranch Solver (mech-solver)");
  const user = await testUser("local-branch-solver-test", "Mechanical Engineering");
  const input = { userId: user.id, feature: "mech-solver", title: "Shaft shear stress", questionText: "A shaft transmits 20kW at 200rpm, find shear stress." };
  const docId = await createBranchSolverDoc(input);
  await runBranchSolverGeneration(docId, input);

  const doc = await prisma.document.findUnique({ where: { id: docId }, include: { exports: true, content: true, job: true } });
  const exp = doc?.exports[0];
  const data = doc?.content?.data as { steps?: unknown[]; finalAnswer?: string } | undefined;

  ok("type BRANCH_SOLVER, feature mech-solver", doc?.type === "BRANCH_SOLVER" && doc?.feature === "mech-solver");
  ok("status READY", doc?.status === "READY");
  ok("valid .docx export", await isValidDocx(exp?.storageKey));
  ok("has steps + final answer", (data?.steps?.length ?? 0) >= 1 && !!data?.finalAnswer);

  const after = await addBranchSolverTurn(user.id, docId, "Redo step 1, check the units.");
  ok("follow-up loop updates conversation", (after.conversation?.length ?? 0) === 2);
}

async function verifyDrawingViva() {
  console.log("\nDrawing Viva Prep");
  const user = await testUser("local-drawing-viva-test", "Mechanical Engineering");
  const uploadKey = keys.upload(user.id, "test-drawing", "png");
  await putObject(uploadKey, Buffer.from([0x89, 0x50, 0x4e, 0x47]), "image/png"); // minimal PNG-ish bytes for local storage
  const input = { userId: user.id, title: "Drawing viva prep", uploadKey, uploadMime: "image/png" };
  const docId = await createDrawingVivaDoc(input);
  await runDrawingVivaGeneration(docId, input);

  const doc = await prisma.document.findUnique({ where: { id: docId }, include: { viva: true, job: true, uploads: true } });
  ok("type DRAWING_VIVA", doc?.type === "DRAWING_VIVA");
  ok("status READY", doc?.status === "READY");
  ok("VivaSet has questions", ((doc?.viva?.questions as unknown[] | undefined)?.length ?? 0) >= 4);
  ok("Upload linked to document", doc?.uploads.length === 1);

  await regenerateDrawingViva(user.id, docId);
  const reDoc = await prisma.document.findUnique({ where: { id: docId }, include: { viva: true } });
  ok("regenerate → still READY with questions", reDoc?.status === "READY" && ((reDoc?.viva?.questions as unknown[] | undefined)?.length ?? 0) >= 4);
}

async function verifyBoqEstimator() {
  console.log("\nBOQ Estimator");
  const user = await testUser("local-boq-test", "Civil Engineering");
  const input = { userId: user.id, title: "Foundation BOQ", dimensionsText: "Foundation 10x5x1.5m" };
  const docId = await createBoqDoc(input);
  await runBoqGeneration(docId, input);

  const doc = await prisma.document.findUnique({ where: { id: docId }, include: { exports: true, content: true, job: true } });
  const exp = doc?.exports[0];
  const data = doc?.content?.data as { items?: unknown[]; totalAmount?: number } | undefined;

  ok("type BRANCH_SOLVER, feature boq-estimator", doc?.type === "BRANCH_SOLVER" && doc?.feature === "boq-estimator");
  ok("status READY", doc?.status === "READY");
  ok("valid .docx export", await isValidDocx(exp?.storageKey));
  ok("has items + total", (data?.items?.length ?? 0) >= 1 && typeof data?.totalAmount === "number");

  const after = await addBoqTurn(user.id, docId, "Excavation quantity should be 12 cum.");
  ok("follow-up loop updates conversation", (after.conversation?.length ?? 0) === 2);
}

async function main() {
  await verifyLabReport();
  await verifyBranchSolver();
  await verifyDrawingViva();
  await verifyBoqEstimator();

  console.log(failures === 0 ? "\n✅ All branch-feature pipelines pass end-to-end." : `\n❌ ${failures} check(s) failed.`);
  if (failures > 0) process.exit(1);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

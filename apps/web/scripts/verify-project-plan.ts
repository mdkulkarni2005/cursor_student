/**
 * Proof of the new project build-plan + code-help pieces: finalize a project → generate the
 * build plan (diagrams/phases/components/research/differentiators) → persist → re-read → and
 * exercise the gated project code-review path. stub AI + local storage.
 *   export $(grep -E '^DATABASE_URL' apps/web/.env.local | sed 's/"//g' | xargs)
 *   STORAGE_DRIVER=local AI_DRIVER=stub pnpm --filter web verify:project-plan
 */
import { prisma, Prisma } from "@studentos/db";
import { generateProjectIdeas, reviewProjectCode } from "@studentos/ai";
import { finalizeProject, generateProjectPlan, getProject, getOrGeneratePregeneratedIdeas } from "../lib/projects/generate.js";
import { codingEnabledFor } from "../lib/capabilities.js";

async function main() {
  let inst = await prisma.institution.findFirst({ where: { name: "Local Test College" } });
  inst ??= await prisma.institution.create({ data: { name: "Local Test College" } });
  const user = await prisma.user.upsert({
    where: { clerkId: "local-project-plan-test" },
    create: {
      clerkId: "local-project-plan-test", email: "local-project-plan@studentos.local", name: "Plan Tester",
      department: "Computer Engineering", semester: "7", onboardedAt: new Date(), institutionId: inst.id, plan: "PRO",
    },
    update: { plan: "PRO", department: "Computer Engineering", institutionId: inst.id },
  });

  // 0) Pregenerated ideas — no asking required, cached on the User row, lazy on first read.
  await prisma.user.update({ where: { id: user.id }, data: { pregeneratedIdeas: Prisma.DbNull, pregeneratedIdeasAt: null } });
  const freshUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  const pregenFirst = await getOrGeneratePregeneratedIdeas(freshUser);
  const afterFirst = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  const pregenCached = await getOrGeneratePregeneratedIdeas(afterFirst); // should hit cache, not regenerate
  const pregenRefreshed = await getOrGeneratePregeneratedIdeas(afterFirst, true); // force regenerate
  const afterRefresh = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  const pregenOk = pregenFirst.length > 0 && pregenCached.length === pregenFirst.length && pregenRefreshed.length > 0 && !!afterRefresh.pregeneratedIdeasAt;
  console.log(`  pregenerated → first:${pregenFirst.length} cached:${pregenCached.length} refreshed:${pregenRefreshed.length} persistedAt:${!!afterRefresh.pregeneratedIdeasAt}`);

  // 1) Ideas → finalize
  const { content } = await generateProjectIdeas({ department: "Computer Engineering", interests: "web apps", difficulty: "major" });
  const { docId } = await finalizeProject(user.id, content.ideas[0]!, "Solo project, 8 weeks.");
  console.log(`  finalize → project doc ${docId}`);

  // 2) Build plan
  const breakdown = await generateProjectPlan(user.id, docId);
  console.log(`  plan → problem:${breakdown.problemStatement.length > 0} solution:${breakdown.solution.length > 0} diagrams:${breakdown.diagrams.length} images:${breakdown.images.length}(stub→0 expected) phases:${breakdown.phases.length} components:${breakdown.components.length} research:${breakdown.research.length} differentiators:${breakdown.differentiators.length}`);

  // 3) Re-read to confirm persistence
  const reloaded = await getProject(user.id, docId);
  const persisted =
    !!reloaded?.content.breakdown &&
    reloaded.content.breakdown.diagrams.length === breakdown.diagrams.length &&
    reloaded.content.breakdown.problemStatement === breakdown.problemStatement &&
    Array.isArray(reloaded.content.breakdown.images);

  const planOk =
    breakdown.diagrams.length >= 2 &&
    breakdown.phases.length >= 2 &&
    breakdown.components.length >= 2 &&
    breakdown.research.length >= 2 &&
    breakdown.differentiators.length >= 2 &&
    persisted;

  // 4) Gated code review (coding-enabled department)
  const gateOk = codingEnabledFor(user) === true;
  const { reply } = await reviewProjectCode({
    title: content.ideas[0]!.title,
    summary: content.ideas[0]!.summary,
    language: "JavaScript",
    code: "function add(a, b) { return a + b }",
    question: "Is this good enough?",
  });
  console.log(`  code review → ${reply.length} chars, gate(codingEnabledFor)=${gateOk}`);

  const ok = planOk && gateOk && reply.length > 0 && pregenOk;
  console.log(ok ? "✓ PASS — pregenerated ideas cache correctly, build plan generated+persisted, code review works, coding gate reads true for CS dept." : "✗ FAIL");
  if (!ok) process.exit(1);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });

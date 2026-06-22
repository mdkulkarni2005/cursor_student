/**
 * End-to-end proof of the Assignments pillar (stub AI + local storage).
 *   export $(grep -E '^DATABASE_URL' apps/web/.env.local | sed 's/"//g' | xargs)
 *   STORAGE_DRIVER=local AI_DRIVER=stub pnpm --filter web verify:assignment
 */
import { prisma } from "@studentos/db";
import { getObjectBuffer } from "@studentos/storage";
import { generateAndStoreAssignment, addAssignmentTurn, getAssignment } from "../lib/assignments/generate.js";

async function main() {
  let inst = await prisma.institution.findFirst({ where: { name: "Local Test College" } });
  inst ??= await prisma.institution.create({ data: { name: "Local Test College" } });
  const user = await prisma.user.upsert({
    where: { clerkId: "local-assignment-test" },
    create: {
      clerkId: "local-assignment-test",
      email: "local-assignment@studentos.local",
      name: "Assignment Tester",
      department: "Computer Engineering",
      semester: "4",
      onboardedAt: new Date(),
      institutionId: inst.id,
      plan: "PRO",
    },
    update: { plan: "PRO", department: "Computer Engineering", semester: "4", institutionId: inst.id },
  });

  const docId = await generateAndStoreAssignment({
    userId: user.id,
    title: "Time complexity of binary search",
    questionText: "Find the time complexity of binary search and explain why.",
  });

  const doc = await prisma.document.findUnique({
    where: { id: docId },
    include: { exports: true, content: true, job: true },
  });
  const exp = doc?.exports[0];
  const bytes = exp ? await getObjectBuffer(exp.storageKey) : null;
  const isDocx = !!bytes && bytes.length > 1000 && bytes[0] === 0x50 && bytes[1] === 0x4b;
  const data = doc?.content?.data as { steps?: unknown[]; finalAnswer?: string } | undefined;
  const steps = (data?.steps ?? []).length;

  console.log(`  status:${doc?.status} | job:${doc?.job?.status} | model:${doc?.job?.model}`);
  console.log(`  export:${exp?.storageKey} (${exp?.sizeBytes} b) | steps:${steps} | answer:${data?.finalAnswer ? "yes" : "no"} | valid .docx:${isDocx}`);

  // Multi-turn loop (#8.2): a plain question replies without changing the solution…
  const after1 = await addAssignmentTurn(user.id, docId, "Can you explain why it is logarithmic?");
  const convo1 = after1.conversation?.length ?? 0;
  const stepsAfter1 = after1.steps.length;
  // …and feedback that warrants a change revises the solution + re-renders the DOCX.
  const sizeBefore = (await prisma.documentExport.findFirst({ where: { documentId: docId, format: "DOCX" } }))?.sizeBytes ?? 0;
  const after2 = await addAssignmentTurn(user.id, docId, "Redo step 2, I think the formula is wrong.");
  const revised = after2.steps.length > stepsAfter1;
  const reloaded = await getAssignment(user.id, docId);
  const convo2 = reloaded?.data.conversation?.length ?? 0;
  const sizeAfter = (await prisma.documentExport.findFirst({ where: { documentId: docId, format: "DOCX" } }))?.sizeBytes ?? 0;

  console.log(`  follow-up → after Q: turns=${convo1} stepsChanged=${stepsAfter1 !== steps}; after feedback: turns=${convo2} revised=${revised} docxResized=${sizeAfter !== sizeBefore}`);

  const ok =
    doc?.status === "READY" && isDocx && steps >= 1 && !!data?.finalAnswer &&
    convo1 === 2 && stepsAfter1 === steps && convo2 === 4 && revised;
  console.log(ok ? "✓ PASS — solver + multi-turn loop (reply, then revise-on-feedback) work." : "✗ FAIL");
  if (!ok) process.exit(1);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

/**
 * Proves the LIVE VAPI interview path (adrianhajdin pattern), server side only:
 *   start → a resume-grounded question SET is pre-generated + stored (incl. a coding question);
 *   finalizeFromTranscript(captured VAPI transcript) → evaluation present + phase complete.
 * The voice itself is a browser check; this covers everything the server owns.
 *   export $(grep -E '^DATABASE_URL' apps/web/.env.local | sed 's/"//g' | xargs)
 *   STORAGE_DRIVER=local AI_DRIVER=stub pnpm --filter web verify:interview-vapi
 */
import { prisma } from "@studentos/db";
import { formatQuestionsForVoice } from "../lib/interview/vapi-assistant.js";
import { startInterview, getInterview, finalizeFromTranscript } from "../lib/interview/generate.js";

async function main() {
  let inst = await prisma.institution.findFirst({ where: { name: "Local Test College" } });
  inst ??= await prisma.institution.create({ data: { name: "Local Test College" } });
  const user = await prisma.user.upsert({
    where: { clerkId: "local-interview-vapi-test" },
    create: {
      clerkId: "local-interview-vapi-test", email: "local-interview-vapi@studentos.local", name: "Vapi Tester",
      department: "Computer Engineering", semester: "7", onboardedAt: new Date(), institutionId: inst.id, plan: "FREE",
    },
    update: { department: "Computer Engineering", institutionId: inst.id },
  });

  const { docId } = await startInterview({
    userId: user.id,
    role: "Backend Engineer",
    rounds: ["technical", "behavioral", "coding"],
    jobDescription: "Node.js backend engineer with PostgreSQL and Redis experience.",
  });

  const loaded = await getInterview(user.id, docId);
  const set = loaded!.state.questions ?? [];
  const hasCoding = set.some((q) => q.kind === "coding");
  const formatted = formatQuestionsForVoice(set);
  const formatOk = formatted.includes("1.") && formatted.includes("[CODING]") && !/[*`]/.test(formatted);
  console.log(`  start → question set length=${set.length} hasCoding=${hasCoding} formatOk=${formatOk}`);

  // Simulate a captured VAPI transcript (assistant=interviewer, user=candidate).
  const transcript = [
    { role: "assistant" as const, content: "Tell me about yourself." },
    { role: "user" as const, content: "I'm a backend engineer who has built Node.js APIs with PostgreSQL and Redis." },
    { role: "assistant" as const, content: "How would you design a rate limiter?" },
    { role: "user" as const, content: "I would use a sliding window counter in Redis keyed per user, and explain the tradeoffs." },
    { role: "user" as const, content: "[My code solution (python)]:\nprint('racecar'[::-1] == 'racecar')\n\n[Program output]:\nTrue" },
  ];
  const state = await finalizeFromTranscript(user.id, docId, transcript);
  const candidateTurns = state.transcript.filter((t) => t.speaker === "candidate").length;
  console.log(`  finalize → phase=${state.phase} eval.overall=${state.evaluation?.overall} areas=${state.evaluation?.areas.length} candidateTurns=${candidateTurns}`);

  // A second finalize must be a no-op (idempotent once complete).
  const again = await finalizeFromTranscript(user.id, docId, transcript);
  const idempotent = again.phase === "complete";

  const ok =
    set.length === loaded!.state.questionPlan.length &&
    hasCoding && formatOk &&
    state.phase === "complete" &&
    typeof state.evaluation?.overall === "number" &&
    (state.evaluation?.areas.length ?? 0) >= 1 &&
    candidateTurns === 3 && idempotent;
  console.log(ok ? "✓ PASS — VAPI question set + transcript finalize + evaluation work." : "✗ FAIL");
  if (!ok) process.exit(1);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });

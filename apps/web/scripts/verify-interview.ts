/**
 * Proves the Interview state machine (NOT the AI's intelligence — stub can't show that):
 * start → answer through the budget → evaluation present → phase complete, plus the
 * concurrency lock (a submit while busy / after completion is rejected).
 *   export $(grep -E '^DATABASE_URL' apps/web/.env.local | sed 's/"//g' | xargs)
 *   STORAGE_DRIVER=local AI_DRIVER=stub pnpm --filter web verify:interview
 */
import { prisma } from "@studentos/db";
import { interviewHint } from "@studentos/ai";
import { startInterview, submitAnswer, getInterview } from "../lib/interview/generate.js";

async function main() {
  let inst = await prisma.institution.findFirst({ where: { name: "Local Test College" } });
  inst ??= await prisma.institution.create({ data: { name: "Local Test College" } });
  const user = await prisma.user.upsert({
    where: { clerkId: "local-interview-test" },
    create: {
      clerkId: "local-interview-test", email: "local-interview@studentos.local", name: "Interview Tester",
      department: "Computer Engineering", semester: "7", onboardedAt: new Date(), institutionId: inst.id, plan: "FREE",
    },
    update: { department: "Computer Engineering", institutionId: inst.id },
  });

  // Start with a job description (Phase C: JD grounding) — no resume → profile fallback.
  const { docId } = await startInterview({
    userId: user.id,
    role: "Backend Engineer",
    rounds: ["technical", "behavioral", "coding"],
    jobDescription: "Node.js backend engineer with PostgreSQL and Redis experience.",
  });
  const loaded = await getInterview(user.id, docId);
  const budget = loaded!.state.questionPlan.length;
  const jdStored = (loaded!.state.jobDescription ?? "").includes("Redis");
  console.log(`  start → budget ${budget} questions; first kind=${loaded!.state.transcript[0]?.kind}; jdStored=${jdStored}`);

  // Answer through the budget. On coding turns, submit with code metadata (language + run output).
  let state = loaded!.state;
  let codingMetaStored = false;
  let sawRunnableFlag = false;
  for (let i = 0; i < budget; i++) {
    const lastQ = state.transcript[state.transcript.length - 1];
    const coding = lastQ?.kind === "coding";
    if (coding && typeof lastQ?.runnable === "boolean") sawRunnableFlag = true;
    state = await submitAnswer(
      user.id,
      docId,
      coding ? `print("racecar"[::-1] == "racecar")` : `Answer ${i + 1}: I would reason step by step and explain my tradeoffs in detail.`,
      coding ? { language: "python", runOutput: "True" } : {},
    );
  }
  // The stored coding candidate turn should carry language + runOutput (feeds the evaluator).
  const codingAnswer = state.transcript.find((t) => t.speaker === "candidate" && t.runOutput);
  codingMetaStored = !!codingAnswer && codingAnswer.language === "python" && codingAnswer.runOutput === "True";
  const candidateTurns = state.transcript.filter((t) => t.speaker === "candidate").length;
  console.log(`  phase C → sawRunnableFlag=${sawRunnableFlag} codingMetaStored=${codingMetaStored}`);
  console.log(`  answered ${candidateTurns} → phase=${state.phase} eval.overall=${state.evaluation?.overall} areas=${state.evaluation?.areas.length}`);

  // Lock / completeness: a further submit must be rejected.
  let rejectedAfterComplete = false;
  try { await submitAnswer(user.id, docId, "one more"); } catch { rejectedAfterComplete = true; }

  // Concurrency lock: while status is GENERATING (a turn "in flight"), submit is rejected.
  await prisma.document.update({ where: { id: docId }, data: { status: "GENERATING" } });
  let rejectedWhileBusy = false;
  try { await submitAnswer(user.id, docId, "racing answer"); } catch { rejectedWhileBusy = true; }
  await prisma.document.update({ where: { id: docId }, data: { status: "READY" } });
  console.log(`  guards → rejectedAfterComplete=${rejectedAfterComplete} rejectedWhileBusy=${rejectedWhileBusy}`);

  // Stuck-help nudge (5.3): returns a round-appropriate, non-empty coaching nudge.
  const codingHint = await interviewHint({ question: "Two-sum problem", round: "coding" });
  const behavioralHint = await interviewHint({ question: "Tell me about a conflict", round: "behavioral" });
  const hintOk = codingHint.hint.length > 20 && /complexity|brute/i.test(codingHint.hint) && /STAR/i.test(behavioralHint.hint);
  console.log(`  hint → coding mentions approach:${/complexity|brute/i.test(codingHint.hint)} behavioral uses STAR:${/STAR/i.test(behavioralHint.hint)}`);

  const ok =
    candidateTurns === budget &&
    state.phase === "complete" &&
    typeof state.evaluation?.overall === "number" &&
    (state.evaluation?.areas.length ?? 0) >= 1 &&
    rejectedAfterComplete && rejectedWhileBusy && hintOk &&
    jdStored && sawRunnableFlag && codingMetaStored;
  console.log(ok ? "✓ PASS — interview loop + evaluation + concurrency guards work. (AI quality = real-AI/browser check.)" : "✗ FAIL");
  if (!ok) process.exit(1);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });

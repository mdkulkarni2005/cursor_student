/**
 * Proves E4 (transcript) + E5 (AI judgment) against the real dev DB, in stub mode: transcript
 * lines write/query correctly, judgeRealInterview's stub path returns a valid shape, and
 * endInterviewRoom actually generates + upserts an InterviewJudgment from the transcript.
 *
 * Does NOT test: actual SpeechRecognition capture (needs a browser + mic), actual recruiter-side
 * join (needs a second browser session) — see the plan's verification split.
 *
 *   export $(grep -E '^DATABASE_URL' apps/web/.env.local | sed 's/"//g' | xargs)
 *   LIVEKIT_DRIVER=stub AI_DRIVER=stub pnpm --filter web verify:interview-transcript
 */
import assert from "node:assert";
import { prisma } from "@studentos/db";
import { judgeRealInterview } from "@studentos/ai";
import { endInterviewRoom, createOrGetRoom } from "../lib/live-interview.js";

let pass = 0;
function ok(name: string, cond: boolean, extra = "") {
  assert(cond, `FAILED: ${name} ${extra}`);
  console.log(`  ✓ ${name}${extra ? `  (${extra})` : ""}`);
  pass++;
}

async function main() {
  // Reuse the same fixtures as the earlier verify scripts.
  let inst = await prisma.institution.findFirst({ where: { name: "Local Test College" } });
  inst ??= await prisma.institution.create({ data: { name: "Local Test College" } });

  const student = await prisma.user.upsert({
    where: { clerkId: "local-real-interview-student" },
    create: {
      clerkId: "local-real-interview-student",
      email: "local-real-interview-student@studentos.local",
      name: "Real Interview Tester",
      onboardedAt: new Date(),
      institutionId: inst.id,
      plan: "FREE",
    },
    update: {},
  });

  const recruiter = await prisma.recruiter.upsert({
    where: { clerkId: "local-real-interview-recruiter" },
    create: {
      clerkId: "local-real-interview-recruiter",
      email: "local-real-interview-recruiter@studentos.local",
      name: "Recruiter Tester",
      companyName: "Acme Test Co",
      status: "APPROVED",
    },
    update: {},
  });

  const schedule = await prisma.interviewSchedule.upsert({
    where: { id: "local-real-interview-schedule" },
    create: {
      id: "local-real-interview-schedule",
      recruiterId: recruiter.id,
      studentId: student.id,
      status: "ACCEPTED",
      proposedAt: new Date(),
      note: "30 min, backend fundamentals",
    },
    update: { status: "ACCEPTED", proposedAt: new Date(), note: "30 min, backend fundamentals" },
  });

  await prisma.interviewTranscriptLine.deleteMany({ where: { scheduleId: schedule.id } });
  await prisma.interviewJudgment.deleteMany({ where: { scheduleId: schedule.id } });

  console.log("Transcript writes/queries:");
  await prisma.interviewTranscriptLine.create({ data: { scheduleId: schedule.id, speaker: "recruiter", text: "Tell me about a time you scaled a system." } });
  await prisma.interviewTranscriptLine.create({
    data: {
      scheduleId: schedule.id,
      speaker: "candidate",
      text: "At my last internship I optimized a query path that cut p99 latency by 40%, moving from N+1 queries to a batched fetch.",
    },
  });
  const lines = await prisma.interviewTranscriptLine.findMany({ where: { scheduleId: schedule.id }, orderBy: { occurredAt: "asc" } });
  ok("both speakers' lines written", lines.length === 2);
  ok("speaker order preserved", lines[0]!.speaker === "recruiter" && lines[1]!.speaker === "candidate");

  console.log("\njudgeRealInterview stub path:");
  process.env.AI_DRIVER = "stub";
  const { judgment, model } = await judgeRealInterview({
    transcriptLines: lines.map((l) => ({ speaker: l.speaker, text: l.text })),
    candidateName: student.name ?? undefined,
    recruiterNote: schedule.note ?? undefined,
  });
  ok("stub returns a valid fitVerdict", ["strong_fit", "fit", "weak_fit", "not_fit"].includes(judgment.fitVerdict), judgment.fitVerdict);
  ok("stub model label is 'stub'", model === "stub");
  ok("stub summary is non-empty", judgment.summary.length > 0);

  console.log("\nendInterviewRoom generates + upserts InterviewJudgment:");
  process.env.LIVEKIT_DRIVER = "stub";
  await createOrGetRoom(schedule.id); // ensure a room row exists so end has something to end
  await endInterviewRoom(schedule.id);
  const savedJudgment = await prisma.interviewJudgment.findUnique({ where: { scheduleId: schedule.id } });
  ok("InterviewJudgment row exists after end", !!savedJudgment);
  ok("saved judgment has a valid verdict", ["strong_fit", "fit", "weak_fit", "not_fit"].includes(savedJudgment?.fitVerdict ?? ""));
  ok("saved judgment references the stub model", savedJudgment?.model === "stub");

  console.log("\nRe-running end is idempotent (upsert, not duplicate rows):");
  await endInterviewRoom(schedule.id);
  const judgmentCount = await prisma.interviewJudgment.count({ where: { scheduleId: schedule.id } });
  ok("still exactly one judgment row", judgmentCount === 1, `${judgmentCount} rows`);

  delete process.env.LIVEKIT_DRIVER;
  delete process.env.AI_DRIVER;

  console.log(`\n✅ ${pass} checks passed against the real dev DB.`);
  console.log("\nNote: actual SpeechRecognition capture and recruiter-side join need your live browser test.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("\n❌", e.message);
    process.exit(1);
  });

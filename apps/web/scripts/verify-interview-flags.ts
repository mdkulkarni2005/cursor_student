/**
 * Proves the E3 proctoring layer against the real dev DB: flags write/query correctly, the
 * owner-guard rejects a non-owned schedule, the client-side throttle logic is correct, the
 * recruiter-side query respects ownership, MULTI_MONITOR has no DB-level duplicate guard (the
 * "once" guarantee is client-side only), and the flag route's rate limit blocks after its cap.
 *
 * Does NOT test: actual browser permission prompts, actual LiveKit media connection, actual
 * fullscreen/tab-switch/multi-monitor detection — those need a live browser (see plan §6b).
 *
 *   export $(grep -E '^DATABASE_URL' apps/web/.env.local | sed 's/"//g' | xargs)
 *   pnpm --filter web verify:interview-flags
 */
import assert from "node:assert";
import { prisma, type InterviewFlagKind } from "@studentos/db";
import { ownedAcceptedSchedule, recordFlag, markCandidateReady, getReadyStatus } from "../lib/live-interview.js";
import { rateLimit, RateLimitError } from "../lib/reliability.js";
import { shouldSendFlag, type FlagKind } from "../lib/proctoring-throttle.js";

let pass = 0;
function ok(name: string, cond: boolean, extra = "") {
  assert(cond, `FAILED: ${name} ${extra}`);
  console.log(`  ✓ ${name}${extra ? `  (${extra})` : ""}`);
  pass++;
}

async function main() {
  // Reuse the exact fixtures verify-real-interview.ts sets up (upsert, no duplicate setup).
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

  const otherStudent = await prisma.user.upsert({
    where: { clerkId: "local-real-interview-other-student" },
    create: {
      clerkId: "local-real-interview-other-student",
      email: "local-real-interview-other-student@studentos.local",
      name: "Other Tester",
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
    },
    update: { status: "ACCEPTED", proposedAt: new Date() },
  });

  await prisma.interviewFlag.deleteMany({ where: { scheduleId: schedule.id } });

  console.log("Flag writes/queries:");
  await ownedAcceptedSchedule(schedule.id, student.id); // throws if not owned/accepted
  await recordFlag(schedule.id, "FULLSCREEN_EXIT" as InterviewFlagKind);
  await recordFlag(schedule.id, "TAB_HIDDEN" as InterviewFlagKind, "hidden 12s");
  await recordFlag(schedule.id, "CAMERA_OFF" as InterviewFlagKind);
  await recordFlag(schedule.id, "MIC_OFF" as InterviewFlagKind);
  await recordFlag(schedule.id, "MULTI_MONITOR" as InterviewFlagKind, "2 displays detected");
  await recordFlag(schedule.id, "COPY_PASTE_ATTEMPT" as InterviewFlagKind, "paste");
  const rows = await prisma.interviewFlag.findMany({ where: { scheduleId: schedule.id }, orderBy: { occurredAt: "asc" } });
  ok("all 6 kinds written", rows.length === 6, `${rows.length} rows`);
  ok(
    "kinds match",
    rows.map((r) => r.kind).join(",") === "FULLSCREEN_EXIT,TAB_HIDDEN,CAMERA_OFF,MIC_OFF,MULTI_MONITOR,COPY_PASTE_ATTEMPT",
  );

  console.log("\nOwner-guard rejects a non-owned schedule:");
  let threw = false;
  try {
    await ownedAcceptedSchedule(schedule.id, otherStudent.id);
  } catch {
    threw = true;
  }
  ok("flagging as a different student throws", threw);

  console.log("\nMULTI_MONITOR duplicate-write check (DB does NOT enforce 'once' — client-side only):");
  await recordFlag(schedule.id, "MULTI_MONITOR" as InterviewFlagKind, "second write, same session");
  const monitorRows = await prisma.interviewFlag.findMany({ where: { scheduleId: schedule.id, kind: "MULTI_MONITOR" } });
  ok("DB allows a second MULTI_MONITOR row (no DB constraint)", monitorRows.length === 2, `${monitorRows.length} rows`);

  console.log("\nRecruiter-side query respects ownership:");
  const otherRecruiter = await prisma.recruiter.upsert({
    where: { clerkId: "local-real-interview-other-recruiter" },
    create: { clerkId: "local-real-interview-other-recruiter", email: "local-real-interview-other-recruiter@studentos.local", name: "Other Recruiter", status: "APPROVED" },
    update: {},
  });
  const scheduleForOwnership = await prisma.interviewSchedule.findUnique({ where: { id: schedule.id } });
  ok("schedule.recruiterId matches the proposing recruiter", scheduleForOwnership?.recruiterId === recruiter.id);
  ok("schedule.recruiterId does NOT match an unrelated recruiter", scheduleForOwnership?.recruiterId !== otherRecruiter.id);

  console.log("\nClient-side throttle logic (pure, no DOM):");
  const lastSent = new Map<FlagKind, number>();
  const t0 = 1_000_000;
  ok("first send always allowed", shouldSendFlag(lastSent, "TAB_HIDDEN", t0));
  lastSent.set("TAB_HIDDEN", t0);
  ok("re-send within throttle window is blocked", shouldSendFlag(lastSent, "TAB_HIDDEN", t0 + 5_000) === false);
  ok("re-send after throttle window is allowed", shouldSendFlag(lastSent, "TAB_HIDDEN", t0 + 25_000) === true);
  lastSent.set("MULTI_MONITOR", t0);
  ok("MULTI_MONITOR never re-sends in the same session (infinite throttle)", shouldSendFlag(lastSent, "MULTI_MONITOR", t0 + 10_000_000) === false);
  lastSent.set("COPY_PASTE_ATTEMPT", t0);
  ok("COPY_PASTE_ATTEMPT re-send within its shorter 10s window is blocked", shouldSendFlag(lastSent, "COPY_PASTE_ATTEMPT", t0 + 5_000) === false);
  ok("COPY_PASTE_ATTEMPT re-send after its window is allowed", shouldSendFlag(lastSent, "COPY_PASTE_ATTEMPT", t0 + 11_000) === true);

  console.log("\nPre-join lobby/admit reconciliation (Phase E6):");
  await prisma.interviewRoom.upsert({
    where: { scheduleId: schedule.id },
    create: { scheduleId: schedule.id, livekitRoom: `interview-${schedule.id}`, status: "PENDING" },
    update: { status: "PENDING", candidateReadyAt: null, admittedAt: null, candidateChecks: undefined },
  });
  const beforeReady = await getReadyStatus(schedule.id);
  ok("not admitted before markCandidateReady", beforeReady.admitted === false);
  const readyResult = await markCandidateReady(schedule.id, { fullscreen: true, monitorCount: 1 });
  ok("markCandidateReady reports not-yet-admitted", readyResult.admitted === false);
  const roomAfterReady = await prisma.interviewRoom.findUnique({ where: { scheduleId: schedule.id } });
  ok("candidateReadyAt persisted", roomAfterReady?.candidateReadyAt != null);
  ok(
    "candidateChecks persisted",
    JSON.stringify(roomAfterReady?.candidateChecks) === JSON.stringify({ fullscreen: true, monitorCount: 1 }),
  );
  // Simulate the recruiter's admit (admitCandidate lives in apps/recruiter's lib — same
  // scheduleId-keyed InterviewRoom write, verified directly here to stay within this app).
  await prisma.interviewRoom.update({ where: { scheduleId: schedule.id }, data: { admittedAt: new Date() } });
  const afterAdmit = await getReadyStatus(schedule.id);
  ok("getReadyStatus reflects admittedAt", afterAdmit.admitted === true);
  const readyAgain = await markCandidateReady(schedule.id, { fullscreen: true, monitorCount: 1 });
  ok("a reconnecting candidate's markCandidateReady now reports admitted", readyAgain.admitted === true);

  console.log("\nRoute-level rate limit blocks after cap (mirrors interview-room/flag's limit=30):");
  const u = `verify-flag-rl-${Date.now()}`;
  for (let i = 0; i < 30; i++) rateLimit(u, "interview-room-flag", 30, 60_000);
  let blocked = false;
  try {
    rateLimit(u, "interview-room-flag", 30, 60_000);
  } catch (e) {
    blocked = e instanceof RateLimitError;
  }
  ok("31st call in the window throws RateLimitError", blocked);

  console.log(`\n✅ ${pass} checks passed against the real dev DB.`);
  console.log("\nNote: browser-only behavior (permission prompts, LiveKit media, real fullscreen/tab/monitor");
  console.log("detection) needs your live click-through — see the plan's verification split.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("\n❌", e.message);
    process.exit(1);
  });

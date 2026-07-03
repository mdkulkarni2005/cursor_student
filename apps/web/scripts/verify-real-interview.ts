/**
 * Proves the E0/E0b/E1 foundation end-to-end against the real dev DB, in stub mode (no LiveKit/
 * Resend account needed): the "Real Interview" gate is live (not decorative), room create/join
 * works via the stub driver, and LIVEKIT_DRIVER=off fails closed instead of faking a room.
 *
 *   export $(grep -E '^DATABASE_URL' apps/web/.env.local | sed 's/"//g' | xargs)
 *   LIVEKIT_DRIVER=stub EMAIL_DRIVER=stub pnpm --filter web verify:real-interview
 */
import assert from "node:assert";
import { prisma } from "@studentos/db";
import { hasJoinableRealInterview } from "../lib/real-interview.js";
import { ownedAcceptedSchedule, createOrGetRoom, joinRoom } from "../lib/live-interview.js";

let pass = 0;
function ok(name: string, cond: boolean, extra = "") {
  assert(cond, `FAILED: ${name} ${extra}`);
  console.log(`  ✓ ${name}${extra ? `  (${extra})` : ""}`);
  pass++;
}

async function main() {
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
      status: "PROPOSED",
      proposedAt: new Date(),
    },
    update: { status: "PROPOSED", proposedAt: new Date() },
  });

  console.log("Gate is closed before acceptance:");
  ok("PROPOSED (not yet accepted) → gate closed", (await hasJoinableRealInterview(student.id)) === false);

  await prisma.interviewSchedule.update({ where: { id: schedule.id }, data: { status: "ACCEPTED", proposedAt: new Date() } });
  console.log("\nGate opens once ACCEPTED + in window:");
  ok("ACCEPTED + proposedAt=now → gate open", (await hasJoinableRealInterview(student.id)) === true);

  console.log("\nRoom create/join (LIVEKIT_DRIVER=stub):");
  // Clean any InterviewRoom left by another verify script sharing this fixture schedule (e.g.
  // verify-interview-transcript.ts ends the room) — makes this script order-independent.
  await prisma.interviewRoom.deleteMany({ where: { scheduleId: schedule.id } });
  process.env.LIVEKIT_DRIVER = "stub";
  await ownedAcceptedSchedule(schedule.id, student.id); // throws if not owned/accepted
  const room = await createOrGetRoom(schedule.id);
  ok("createOrGetRoom → PENDING (stub)", room.status === "PENDING", room.livekitRoom);
  const joined = await joinRoom(schedule.id, student.id, "candidate");
  ok("joinRoom → token minted (stub)", !joined.unavailable && !!("token" in joined && joined.token));

  console.log("\nFail-closed when LiveKit is off:");
  await prisma.interviewRoom.delete({ where: { scheduleId: schedule.id } }).catch(() => {});
  process.env.LIVEKIT_DRIVER = "off";
  const offRoom = await createOrGetRoom(schedule.id);
  ok("LIVEKIT_DRIVER=off → UNAVAILABLE (never a fake room)", offRoom.status === "UNAVAILABLE");
  delete process.env.LIVEKIT_DRIVER;

  console.log("\nGate closes again once expired/un-accepted:");
  await prisma.interviewSchedule.update({ where: { id: schedule.id }, data: { status: "PROPOSED" } });
  ok("flipped back to PROPOSED → gate closed", (await hasJoinableRealInterview(student.id)) === false);

  console.log(`\n✅ ${pass} checks passed against the real dev DB.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("\n❌", e.message);
    process.exit(1);
  });

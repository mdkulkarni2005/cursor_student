/**
 * Verification for the LiveKit room/token layer.
 *
 * Safety checks need NO LiveKit account and always run: off → unavailable; missing keys (non-stub)
 * → unavailable, never throws; stub → deterministic room name + non-empty tokens for both roles.
 *
 * A real-LiveKit check only runs if LIVEKIT_URL/LIVEKIT_API_KEY/LIVEKIT_API_SECRET are all set —
 * otherwise it's skipped (exit 0), same pattern as @studentos/execution's Piston-unreachable skip.
 *
 *   pnpm --filter @studentos/live-interview verify
 */
import assert from "node:assert";
import { ensureRoom, mintToken, endRoom } from "../src/index";

let pass = 0;
function ok(name: string, cond: boolean, extra = "") {
  assert(cond, `FAILED: ${name} ${extra}`);
  console.log(`  ✓ ${name}${extra ? `  (${extra})` : ""}`);
  pass++;
}

async function safetyChecks() {
  // Kill switch: LIVEKIT_DRIVER=off → unavailable, never a fake room/token.
  process.env.LIVEKIT_DRIVER = "off";
  const offRoom = await ensureRoom("sched-off");
  ok("LIVEKIT_DRIVER=off → ensureRoom unavailable", offRoom.unavailable === true);
  const offToken = await mintToken({ roomName: "x", identity: "u1", role: "candidate" });
  ok("LIVEKIT_DRIVER=off → mintToken unavailable", offToken.unavailable === true);

  // Real mode, but no keys configured → unavailable, never throws.
  delete process.env.LIVEKIT_DRIVER;
  delete process.env.LIVEKIT_URL;
  delete process.env.LIVEKIT_API_KEY;
  delete process.env.LIVEKIT_API_SECRET;
  const unconfigured = await ensureRoom("sched-unconfigured");
  ok("missing keys → ensureRoom unavailable (fail-closed)", unconfigured.unavailable === true);
  const unconfiguredToken = await mintToken({ roomName: "x", identity: "u1", role: "recruiter" });
  ok("missing keys → mintToken unavailable (fail-closed)", unconfiguredToken.unavailable === true);
}

async function stubChecks() {
  process.env.LIVEKIT_DRIVER = "stub";

  const room1 = await ensureRoom("sched-abc");
  ok("stub: ensureRoom returns ok", room1.unavailable === false && room1.status === "ok");
  const room2 = await ensureRoom("sched-abc");
  ok("stub: same scheduleId → same roomName (idempotency contract)", room1.roomName === room2.roomName, room1.roomName);

  const candidateToken = await mintToken({ roomName: room1.roomName!, identity: "student-1", role: "candidate" });
  ok("stub: candidate token non-empty", candidateToken.unavailable === false && !!candidateToken.token);
  const recruiterToken = await mintToken({ roomName: room1.roomName!, identity: "recruiter-1", role: "recruiter" });
  ok("stub: recruiter token non-empty", recruiterToken.unavailable === false && !!recruiterToken.token);
  ok("stub: tokens differ by role/identity", candidateToken.token !== recruiterToken.token);

  const ended = await endRoom(room1.roomName!);
  ok("stub: endRoom ok", ended.unavailable === false);

  delete process.env.LIVEKIT_DRIVER;
}

async function realLiveKitCheck() {
  const url = process.env.LIVEKIT_URL;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!url || !apiKey || !apiSecret) {
    console.log("  ⚠ SKIPPED — no LiveKit account configured (set LIVEKIT_URL/API_KEY/API_SECRET to verify against a real server).");
    return;
  }
  const room = await ensureRoom("verify-real-room");
  ok("real LiveKit: ensureRoom succeeds", room.unavailable === false, room.reason ?? "");
  const token = await mintToken({ roomName: room.roomName!, identity: "verify-user", role: "candidate" });
  ok("real LiveKit: mintToken succeeds", token.unavailable === false, token.reason ?? "");
  await endRoom(room.roomName!);
}

async function main() {
  console.log("Live-interview room/token verification\n");

  console.log("Safety behavior (no LiveKit account needed):");
  await safetyChecks();

  console.log("\nStub mode (deterministic, no network):");
  await stubChecks();

  console.log("\nReal LiveKit (needs a configured account):");
  await realLiveKitCheck();

  console.log(`\n✅ ${pass} checks passed.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("\n❌", e.message);
    process.exit(1);
  });

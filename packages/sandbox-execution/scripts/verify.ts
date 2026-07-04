/**
 * Verifies the fail-closed safety behavior always, and a real create→run→stop cycle only if
 * Vercel Sandbox credentials are actually configured (this is billable, opt-in infra — CI/dev
 * environments without credentials should still pass this).
 *
 *   pnpm --filter @studentos/sandbox-execution verify
 */
import assert from "node:assert";
import { createSandbox, runInSandbox, stopSandbox } from "../src/index";

let pass = 0;
function ok(name: string, cond: boolean, extra = "") {
  assert(cond, `FAILED: ${name} ${extra}`);
  console.log(`  ✓ ${name}${extra ? `  (${extra})` : ""}`);
  pass++;
}

async function safetyChecks() {
  process.env.SANDBOX_DRIVER = "off";
  const off = await createSandbox("verify-schedule-off");
  ok("SANDBOX_DRIVER=off → unavailable (never a fake sandbox)", off.unavailable === true);
  delete process.env.SANDBOX_DRIVER;

  const savedToken = process.env.VERCEL_TOKEN;
  const savedTeam = process.env.VERCEL_TEAM_ID;
  const savedProject = process.env.VERCEL_PROJECT_ID;
  const savedOidc = process.env.VERCEL_OIDC_TOKEN;
  delete process.env.VERCEL_TOKEN;
  delete process.env.VERCEL_TEAM_ID;
  delete process.env.VERCEL_PROJECT_ID;
  delete process.env.VERCEL_OIDC_TOKEN;
  const unconfigured = await createSandbox("verify-schedule-unconfigured");
  ok("missing credentials → unavailable", unconfigured.unavailable === true);
  const runUnconfigured = await runInSandbox("nonexistent", [{ path: "main.py", content: "print(1)" }], { cmd: "python3", args: ["main.py"] });
  ok("runInSandbox with missing credentials → unavailable", runUnconfigured.unavailable === true);
  if (savedToken !== undefined) process.env.VERCEL_TOKEN = savedToken;
  if (savedTeam !== undefined) process.env.VERCEL_TEAM_ID = savedTeam;
  if (savedProject !== undefined) process.env.VERCEL_PROJECT_ID = savedProject;
  if (savedOidc !== undefined) process.env.VERCEL_OIDC_TOKEN = savedOidc;
}

function configured(): boolean {
  return Boolean(process.env.VERCEL_OIDC_TOKEN) || Boolean(process.env.VERCEL_TOKEN && process.env.VERCEL_TEAM_ID && process.env.VERCEL_PROJECT_ID);
}

async function realCycleCheck() {
  const scheduleId = `verify-${Date.now()}`;
  const created = await createSandbox(scheduleId);
  ok("createSandbox succeeds against real Vercel Sandbox", created.unavailable === false, JSON.stringify(created));
  if (created.unavailable) return;

  const run = await runInSandbox(created.sandboxId, [{ path: "main.py", content: "print(7)" }], { cmd: "python3", args: ["main.py"] });
  ok("runInSandbox executes and captures stdout", !run.unavailable && run.exitCode === 0 && run.stdout.trim() === "7", JSON.stringify(run));

  const stopped = await stopSandbox(created.sandboxId);
  ok("stopSandbox tears down cleanly", stopped.unavailable === false, JSON.stringify(stopped));
}

async function main() {
  console.log("Sandbox execution verification\n");
  console.log("Safety behavior (no credentials needed):");
  await safetyChecks();

  console.log("\nReal create→run→stop cycle:");
  if (configured()) {
    await realCycleCheck();
  } else {
    console.log("  ⚠ SKIPPED — no VERCEL_TOKEN/TEAM_ID/PROJECT_ID or VERCEL_OIDC_TOKEN configured.");
    console.log("    Run `vercel link && vercel env pull` (or set access-token env vars) to verify a real sandbox cycle.");
  }
  console.log(`\n✅ ${pass} checks passed.`);
}

main().then(() => process.exit(0)).catch((e) => { console.error("\n❌", e.message); process.exit(1); });

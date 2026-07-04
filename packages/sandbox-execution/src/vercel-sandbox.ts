/**
 * Vercel Sandbox (https://vercel.com/docs/sandbox) client for the real-interview coding round —
 * a persistent, ephemeral Linux microVM (unlike Piston's stateless single-file judge), so it can
 * install dependencies and run whatever language/framework the interview needs.
 *
 * FAIL CLOSED: hard-disabled via `SANDBOX_DRIVER=off`, or unconfigured credentials, always report
 * `unavailable` — never a fabricated sandbox or run result. This is billable, opt-in infra.
 */
import { Sandbox } from "@vercel/sandbox";
import {
  type SandboxFile,
  type SandboxRunCommand,
  type SandboxCreateResult,
  type SandboxRunResult,
  type SandboxStopResult,
  unavailableCreate,
  unavailableRun,
} from "./types";

const DEFAULT_TIMEOUT_MS = 45 * 60 * 1000; // an interview coding round easily runs this long

export function sandboxEnabled(): boolean {
  return process.env.SANDBOX_DRIVER !== "off";
}

/** Access-token auth for non-Vercel hosts (see docs) — OIDC (VERCEL_OIDC_TOKEN via `vercel env
 *  pull`) is picked up automatically by the SDK when present, so it's not required here. */
function accessTokenConfig(): { teamId: string; projectId: string; token: string } | null {
  const teamId = process.env.VERCEL_TEAM_ID;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const token = process.env.VERCEL_TOKEN;
  if (!teamId || !projectId || !token) return null;
  return { teamId, projectId, token };
}

function configured(): boolean {
  return Boolean(process.env.VERCEL_OIDC_TOKEN) || accessTokenConfig() !== null;
}

function sandboxNameFor(scheduleId: string): string {
  return `interview-${scheduleId}`;
}

/** Idempotent-ish create-or-resume, keyed by scheduleId — one sandbox per InterviewSchedule. */
export async function createSandbox(scheduleId: string): Promise<SandboxCreateResult> {
  if (!sandboxEnabled()) return unavailableCreate("sandbox disabled (SANDBOX_DRIVER=off)");
  if (!configured()) return unavailableCreate("Vercel Sandbox not configured (missing VERCEL_TOKEN/TEAM_ID/PROJECT_ID or VERCEL_OIDC_TOKEN)");

  try {
    const name = sandboxNameFor(scheduleId);
    await Sandbox.getOrCreate({
      name,
      runtime: "node24",
      timeout: DEFAULT_TIMEOUT_MS,
      ...accessTokenConfig(),
    });
    return { unavailable: false, sandboxId: name };
  } catch (err) {
    return unavailableCreate(err instanceof Error ? err.message : String(err));
  }
}

/**
 * Writes `files` into the sandbox, installs dependencies if a package.json is present (unless
 * `install: false`), then runs `runCommand`. Returns combined stdout/stderr, capped like Piston's
 * runner so a runaway process can't blow up the response.
 */
export async function runInSandbox(
  sandboxId: string,
  files: SandboxFile[],
  runCommand: SandboxRunCommand,
  opts: { install?: boolean } = {},
): Promise<SandboxRunResult> {
  if (!sandboxEnabled()) return unavailableRun("sandbox disabled (SANDBOX_DRIVER=off)");
  if (!configured()) return unavailableRun("Vercel Sandbox not configured");

  try {
    const sandbox = await Sandbox.get({ name: sandboxId, ...accessTokenConfig() });
    await sandbox.writeFiles(files.map((f) => ({ path: f.path, content: Buffer.from(f.content, "utf8") })));

    const shouldInstall = (opts.install ?? true) && files.some((f) => f.path === "package.json");
    if (shouldInstall) {
      const install = await sandbox.runCommand("npm", ["install"]);
      if (install.exitCode !== 0) {
        return {
          unavailable: false,
          exitCode: install.exitCode,
          stdout: (await install.stdout()).slice(0, 10_000),
          stderr: `npm install failed:\n${(await install.stderr()).slice(0, 4_000)}`,
        };
      }
    }

    const result = await sandbox.runCommand(runCommand.cmd, runCommand.args ?? []);
    return {
      unavailable: false,
      exitCode: result.exitCode,
      stdout: (await result.stdout()).slice(0, 10_000),
      stderr: (await result.stderr()).slice(0, 4_000),
    };
  } catch (err) {
    return unavailableRun(err instanceof Error ? err.message : String(err));
  }
}

export async function stopSandbox(sandboxId: string): Promise<SandboxStopResult> {
  if (!sandboxEnabled() || !configured()) return { unavailable: true };
  try {
    const sandbox = await Sandbox.get({ name: sandboxId, resume: false, ...accessTokenConfig() });
    await sandbox.delete();
    return { unavailable: false };
  } catch (err) {
    // Best-effort teardown — a sandbox that's already gone (or was never created) isn't an error
    // worth surfacing to the "end interview" action.
    return { unavailable: true, message: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Piston client (https://github.com/engineer-man/piston). Provider-abstracted behind `runCode` so
 * a future swap to Judge0 / a microVM provider is a change here only — the app never sees it.
 *
 * FAIL CLOSED: any unreachable engine, non-200, or transport error returns an `unverified` result.
 * Never a fabricated pass.
 */
import {
  type Language,
  type RunLimits,
  type RunResult,
  DEFAULT_LIMITS,
  unverifiedResult,
} from "./types";

const DEFAULT_PISTON = "https://emkc.org/api/v2/piston";

/** Self-hosted Piston in prod via `PISTON_URL`; the public dev API otherwise. */
export function pistonBaseUrl(): string {
  return (process.env.PISTON_URL ?? DEFAULT_PISTON).replace(/\/+$/, "");
}

/** Execution can be hard-disabled with `EXECUTION_DRIVER=off` (then everything is `unverified`). */
export function executionEnabled(): boolean {
  return process.env.EXECUTION_DRIVER !== "off";
}

/** Our language id → Piston language name (+ aliases to avoid the Deno js/ts runtimes). */
const PISTON_NAME: Record<Language, string> = {
  python: "python",
  javascript: "javascript",
  typescript: "typescript",
  java: "java",
  cpp: "c++",
};

export type PistonFile = { name?: string; content: string };

type Runtime = { language: string; version: string; aliases: string[] };

let _runtimes: Runtime[] | null = null;

async function fetchRuntimes(): Promise<Runtime[]> {
  if (_runtimes) return _runtimes;
  const res = await fetch(`${pistonBaseUrl()}/runtimes`);
  if (!res.ok) throw new Error(`piston /runtimes ${res.status}`);
  _runtimes = (await res.json()) as Runtime[];
  return _runtimes;
}

function cmpVersion(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d) return d;
  }
  return 0;
}

/**
 * Resolve the concrete Piston runtime (language + version) to call. Robust across self-hosted and
 * public Piston: reads the installed runtimes, prefers Node over Deno for js/ts, and otherwise
 * picks the highest version. Override per language with e.g. `PISTON_VERSION_PYTHON=3.10.0`.
 */
async function resolveRuntime(language: Language): Promise<{ language: string; version: string }> {
  const name = PISTON_NAME[language];
  const runtimes = await fetchRuntimes();
  let candidates = runtimes.filter((r) => r.language === name || r.aliases.includes(name));
  // Avoid the Deno js/ts runtimes — our drivers read stdin via Node's `fs`.
  if (language === "javascript" || language === "typescript") {
    const node = candidates.filter((r) => !r.aliases.some((a) => a.startsWith("deno")));
    if (node.length) candidates = node;
  }
  if (!candidates.length) throw new Error(`no Piston runtime for ${language}`);

  const envVer = process.env[`PISTON_VERSION_${language.toUpperCase()}`];
  if (envVer) {
    const m = candidates.find((r) => r.version === envVer);
    if (m) return { language: m.language, version: m.version };
  }
  candidates.sort((a, b) => cmpVersion(b.version, a.version));
  return { language: candidates[0]!.language, version: candidates[0]!.version };
}

type PistonStage = { stdout: string; stderr: string; code: number | null; signal: string | null; output: string };
type PistonResponse = { compile?: PistonStage; run: PistonStage };

function interpret(data: PistonResponse): RunResult {
  const c = data.compile;
  if (c && c.code !== 0 && c.code !== null) {
    return { status: "compile_error", stdout: c.stdout ?? "", stderr: c.stderr || c.output || "", exitCode: c.code, unverified: false };
  }
  const r = data.run;
  // Piston kills a run that exceeds run_timeout with SIGKILL — that's our infinite-loop guard firing.
  if (r.signal === "SIGKILL") {
    return { status: "timeout", stdout: r.stdout ?? "", stderr: r.stderr || "Time limit exceeded", exitCode: r.code, unverified: false };
  }
  if (r.code !== 0) {
    return { status: "runtime_error", stdout: r.stdout ?? "", stderr: r.stderr || r.output || "", exitCode: r.code, unverified: false };
  }
  return { status: "ok", stdout: r.stdout ?? "", stderr: r.stderr ?? "", exitCode: r.code, unverified: false };
}

/**
 * Low-level: run `files` for `language` with `stdin`. Problem-agnostic — both DSA grading and
 * interview coding go through this. Fails closed to `unverified` on any engine problem.
 */
export async function runCode(
  language: Language,
  files: PistonFile[],
  stdin = "",
  limits: RunLimits = DEFAULT_LIMITS,
): Promise<RunResult> {
  if (!executionEnabled()) return unverifiedResult("execution disabled (EXECUTION_DRIVER=off)");
  try {
    const rt = await resolveRuntime(language);
    const body: Record<string, unknown> = {
      language: rt.language,
      version: rt.version,
      files,
      stdin,
      run_timeout: limits.runTimeoutMs,
      compile_timeout: limits.compileTimeoutMs,
    };
    if (limits.memoryBytes > 0) body.run_memory_limit = limits.memoryBytes;

    const res = await fetch(`${pistonBaseUrl()}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return unverifiedResult(`piston /execute ${res.status}`);
    return interpret((await res.json()) as PistonResponse);
  } catch (err) {
    return unverifiedResult(err instanceof Error ? err.message : String(err));
  }
}

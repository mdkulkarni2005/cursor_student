/** The languages students can write solutions in. */
export type Language = "python" | "javascript" | "typescript" | "java" | "cpp";

export const LANGUAGES: readonly Language[] = [
  "python",
  "javascript",
  "typescript",
  "java",
  "cpp",
] as const;

/** Human labels (match the UI's language picker). */
export const LANGUAGE_LABEL: Record<Language, string> = {
  python: "Python",
  javascript: "JavaScript",
  typescript: "TypeScript",
  java: "Java",
  cpp: "C++",
};

/** Hard safety caps for a single run — these are what stop a `while(true)` from draining us. */
export type RunLimits = {
  /** Wall-clock cap for the run stage (ms). Exceeding it kills the process. */
  runTimeoutMs: number;
  /** Cap for the compile stage (ms), for compiled languages. */
  compileTimeoutMs: number;
  /** Memory cap for the run stage (bytes); `-1` = use the engine default. */
  memoryBytes: number;
};

export const DEFAULT_LIMITS: RunLimits = {
  runTimeoutMs: 3000,
  compileTimeoutMs: 10000,
  memoryBytes: -1,
};

export type RunStatus =
  | "ok"
  | "runtime_error"
  | "compile_error"
  | "timeout"
  | "unverified";

/**
 * The result of one execution. `unverified` is the critical field: when the engine could not be
 * reached/used, callers MUST NOT treat the run as a pass — that would write a fake `solved=true`.
 */
export type RunResult = {
  status: RunStatus;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  unverified: boolean;
};

export function unverifiedResult(reason: string): RunResult {
  return { status: "unverified", stdout: "", stderr: reason, exitCode: null, unverified: true };
}

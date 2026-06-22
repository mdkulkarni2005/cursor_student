/**
 * `runFunction` — the high-level primitive both DSA grading and interview coding use: run the
 * student's `solve` against one set of JSON arguments and get back the parsed return value.
 * Compare/verdict logic stays with the caller (problems own their own correctness rules).
 */
import { runCode } from "./piston";
import { buildFunctionFiles, supportsRun } from "./drivers";
import {
  type Language,
  type RunLimits,
  type RunResult,
  DEFAULT_LIMITS,
  unverifiedResult,
} from "./types";

export type FunctionRun = {
  result: RunResult;
  /** Parsed JSON return value of `solve`, present only when `result.status === "ok"`. */
  output?: unknown;
};

export async function runFunction(opts: {
  language: Language;
  userSource: string;
  args: unknown[];
  limits?: RunLimits;
}): Promise<FunctionRun> {
  if (!supportsRun(opts.language)) {
    return { result: unverifiedResult(`run not supported for ${opts.language} yet`) };
  }
  const files = buildFunctionFiles(opts.language, opts.userSource);
  const stdin = JSON.stringify(opts.args);
  const result = await runCode(opts.language, files, stdin, opts.limits ?? DEFAULT_LIMITS);
  if (result.status !== "ok") return { result };
  try {
    const output = result.stdout.trim() === "" ? null : JSON.parse(result.stdout);
    return { result, output };
  } catch {
    return {
      result: {
        ...result,
        status: "runtime_error",
        stderr: `Output was not valid JSON: ${result.stdout.slice(0, 200)}`,
      },
    };
  }
}

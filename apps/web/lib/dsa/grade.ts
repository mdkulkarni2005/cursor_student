/**
 * DSA grading — runs a submission against the problem's centralized test cases via the execution
 * engine and returns a verdict. The package runs code; this owns the per-problem compare rules.
 *
 * Verdicts: "passed" (all tests) · "failed" (some wrong) · "unverified" (engine down / language not
 * gradeable yet) — and "unverified" NEVER counts as solved (fail-closed).
 */
import { runFunction, supportsRun, type Language } from "@studentos/execution";
import { JUDGING, sampleTests, type CompareMode } from "./judging";

/** UI labels → engine language ids. */
const LANG_ID: Record<string, Language> = {
  Python: "python",
  JavaScript: "javascript",
  TypeScript: "typescript",
  Java: "java",
  "C++": "cpp",
};

export function toLanguageId(label?: string): Language | undefined {
  return label ? LANG_ID[label] : undefined;
}

export type TestOutcome = { passed: boolean; expected: unknown; got?: unknown; error?: string };
export type Verdict = "passed" | "failed" | "unverified";
export type GradeResult = {
  verdict: Verdict;
  passed: number;
  total: number;
  outcomes: TestOutcome[];
  /** A friendly note when we couldn't grade (engine down / unsupported language). */
  message?: string;
};

/** Recursively sort arrays so order-insensitive answers compare equal. */
function canonical(v: unknown): unknown {
  if (Array.isArray(v)) {
    const mapped = v.map(canonical);
    return [...mapped].sort((a, b) => (JSON.stringify(a) < JSON.stringify(b) ? -1 : 1));
  }
  return v;
}

function matches(got: unknown, expected: unknown, mode: CompareMode): boolean {
  if (mode === "float-eps") {
    const a = Number(got);
    const b = Number(expected);
    return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) < 1e-6;
  }
  if (mode === "unordered") {
    return JSON.stringify(canonical(got)) === JSON.stringify(canonical(expected));
  }
  return JSON.stringify(got) === JSON.stringify(expected);
}

export async function gradeSubmission(opts: {
  slug: string;
  language: Language;
  code: string;
  /** "sample" runs only the visible/sample tests (used by Run); default "all" is the real grade (Submit). */
  only?: "sample" | "all";
}): Promise<GradeResult> {
  const j = JUDGING[opts.slug];
  if (!j) {
    return { verdict: "unverified", passed: 0, total: 0, outcomes: [], message: "This problem isn't auto-graded yet — your attempt was saved for review." };
  }
  const tests = opts.only === "sample" ? sampleTests(opts.slug) : j.tests;
  if (tests.length === 0) {
    return { verdict: "unverified", passed: 0, total: 0, outcomes: [], message: "No sample tests available for this problem yet." };
  }
  if (!supportsRun(opts.language)) {
    return { verdict: "unverified", passed: 0, total: tests.length, outcomes: [], message: "Auto-grading for this language is coming soon — your attempt was saved." };
  }

  const outcomes: TestOutcome[] = [];
  let passed = 0;

  for (const t of tests) {
    const run = await runFunction({ language: opts.language, userSource: opts.code, args: t.args });

    // Engine unreachable → stop and report unverified (never a fake pass).
    if (run.result.unverified) {
      return { verdict: "unverified", passed, total: tests.length, outcomes, message: "We couldn't run your code right now — saved as an attempt. Try again in a moment." };
    }
    // Compile error repeats for every test — report once and stop.
    if (run.result.status === "compile_error") {
      return { verdict: "failed", passed, total: tests.length, outcomes: [{ passed: false, expected: t.expected, error: run.result.stderr.slice(0, 300) || "Compile error" }] };
    }
    if (run.result.status !== "ok") {
      outcomes.push({ passed: false, expected: t.expected, error: run.result.stderr.slice(0, 200) || run.result.status });
      continue;
    }
    const good = matches(run.output, t.expected, j.compare);
    if (good) passed++;
    outcomes.push({ passed: good, expected: t.expected, got: run.output });
  }

  return { verdict: passed === tests.length ? "passed" : "failed", passed, total: tests.length, outcomes };
}

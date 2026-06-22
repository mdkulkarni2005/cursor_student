/**
 * REAL verification against a live Piston (public dev API by default, or $PISTON_URL).
 * A structural test can't prove a sandbox works — only running real correct/wrong/looping code can.
 *
 * Proves: correct solution → right output; wrong solution → wrong output (grading will fail it);
 * infinite loop → killed by the timeout (not a hang); engine unreachable → `unverified` (NEVER a
 * pass); and that all 5 language runtimes actually execute.
 *
 *   pnpm --filter @studentos/execution verify
 */
import assert from "node:assert";
import { runFunction, runCode, pistonBaseUrl, type Language } from "../src/index";

let pass = 0;
function ok(name: string, cond: boolean, extra = "") {
  assert(cond, `FAILED: ${name} ${extra}`);
  console.log(`  ✓ ${name}${extra ? `  (${extra})` : ""}`);
  pass++;
}

/** Is a Piston actually reachable AND able to execute (not whitelist-gated)? */
async function engineReachable(): Promise<boolean> {
  const probe = await runCode("python", [{ name: "main.py", content: "print(1)" }]);
  return probe.status === "ok" && probe.stdout.trim() === "1";
}

// Two-sum-style solve(nums, target) for the dynamic languages.
const CORRECT: Record<string, string> = {
  python: `def solve(nums, target):
    seen = {}
    for i, n in enumerate(nums):
        if target - n in seen:
            return [seen[target - n], i]
        seen[n] = i
    return []`,
  javascript: `function solve(nums, target) {
    const seen = new Map();
    for (let i = 0; i < nums.length; i++) {
      if (seen.has(target - nums[i])) return [seen.get(target - nums[i]), i];
      seen.set(nums[i], i);
    }
    return [];
  }`,
  typescript: `function solve(nums: number[], target: number): number[] {
    const seen = new Map<number, number>();
    for (let i = 0; i < nums.length; i++) {
      if (seen.has(target - nums[i])) return [seen.get(target - nums[i])!, i];
      seen.set(nums[i], i);
    }
    return [];
  }`,
};
// Wrong: always returns [0,0].
const WRONG: Record<string, string> = {
  python: `def solve(nums, target):\n    return [0, 0]`,
  javascript: `function solve(nums, target) { return [0, 0]; }`,
  typescript: `function solve(nums: number[], target: number): number[] { return [0, 0]; }`,
};

async function safetyChecks() {
  // These prove the SAFETY-CRITICAL behavior and need NO engine.
  // Fail-closed: unreachable engine → unverified, NEVER a pass.
  const saved = process.env.PISTON_URL;
  process.env.PISTON_URL = "http://127.0.0.1:9"; // nothing listening
  const down = await runFunction({ language: "python", userSource: CORRECT.python!, args: [[2, 7], 9] });
  ok("engine down → unverified (never a fake pass)", down.result.unverified === true && down.result.status === "unverified");
  if (saved === undefined) delete process.env.PISTON_URL; else process.env.PISTON_URL = saved;

  // Kill switch.
  process.env.EXECUTION_DRIVER = "off";
  const off = await runFunction({ language: "python", userSource: CORRECT.python!, args: [[2, 7], 9] });
  ok("EXECUTION_DRIVER=off → unverified", off.result.unverified === true);
  delete process.env.EXECUTION_DRIVER;

  // Unsupported language (java/cpp function grading not wired yet) → unverified, not a fake pass.
  const javaFn = await runFunction({ language: "java", userSource: "x", args: [] });
  ok("unsupported lang → unverified (fail-closed)", javaFn.result.unverified === true);
}

async function realExecutionChecks() {
  // Correct + wrong across the 3 dynamic languages.
  for (const lang of ["python", "javascript", "typescript"] as Language[]) {
    const good = await runFunction({ language: lang, userSource: CORRECT[lang]!, args: [[2, 7, 11, 15], 9] });
    ok(`${lang}: correct solution runs`, good.result.status === "ok", good.result.stderr.slice(0, 80));
    ok(`${lang}: correct output = [0,1]`, JSON.stringify(good.output) === "[0,1]", JSON.stringify(good.output));

    const bad = await runFunction({ language: lang, userSource: WRONG[lang]!, args: [[2, 7, 11, 15], 9] });
    ok(`${lang}: wrong solution → wrong output (grading fails it)`,
      bad.result.status === "ok" && JSON.stringify(bad.output) !== "[0,1]", JSON.stringify(bad.output));
  }

  // Infinite loop is KILLED by the timeout (the credit-drain guard).
  const loop = await runFunction({
    language: "python",
    userSource: `def solve(n):\n    while True:\n        pass`,
    args: [1],
    limits: { runTimeoutMs: 1500, compileTimeoutMs: 10000, memoryBytes: -1 },
  });
  ok("infinite loop is killed (timeout, not a hang)", loop.result.status === "timeout", loop.result.status);

  // Java + C++ runtimes actually execute (low-level — function grading lands in step A2).
  // Skip gracefully if a runtime isn't installed on this Piston (these are forward-looking).
  const java = await runCode("java", [{ name: "Main.java", content: "public class Main{public static void main(String[] a){System.out.print(7);}}" }]);
  if (java.unverified) console.log("  – java runtime not installed on this Piston (skipped)");
  else ok("java runtime executes", java.status === "ok" && java.stdout.trim() === "7", java.stderr.slice(0, 80));
  const cpp = await runCode("cpp", [{ name: "main.cpp", content: "#include <iostream>\nint main(){std::cout<<7;return 0;}" }]);
  if (cpp.unverified) console.log("  – c++ runtime not installed on this Piston (skipped)");
  else ok("c++ runtime executes", cpp.status === "ok" && cpp.stdout.trim() === "7", cpp.stderr.slice(0, 80));
}

async function main() {
  console.log(`Execution engine verification (Piston @ ${process.env.PISTON_URL ?? "public dev API"})\n`);

  console.log("Safety behavior (no engine needed):");
  await safetyChecks();

  console.log("\nReal execution (needs a reachable Piston):");
  if (await engineReachable()) {
    await realExecutionChecks();
    console.log(`\n✅ ${pass} checks passed — verified against a REAL sandbox.`);
  } else {
    console.log("  ⚠ SKIPPED — no Piston reachable (public API is whitelist-only since 2026-02-15).");
    console.log("    Point PISTON_URL at your self-hosted Piston and re-run to verify grading across languages.");
    console.log(`\n✅ ${pass} safety checks passed. Real-execution checks pending a reachable Piston.`);
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error("\n❌", e.message); process.exit(1); });

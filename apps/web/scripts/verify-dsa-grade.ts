/**
 * End-to-end DSA grading against a REAL Piston: a correct solution is Accepted, a wrong one is
 * rejected, and the per-problem compare modes (unordered, float-eps) work. Needs a reachable
 * Piston — point PISTON_URL at it (e.g. local container http://localhost:2000/api/v2):
 *   PISTON_URL=http://localhost:2000/api/v2 pnpm --filter web verify:dsa-grade
 */
import { runCode } from "@studentos/execution";
import { gradeSubmission } from "../lib/dsa/grade.js";

let failed = 0;
function check(name: string, cond: boolean, extra = "") {
  console.log(`  ${cond ? "✓" : "✗"} ${name}${extra ? `  (${extra})` : ""}`);
  if (!cond) failed++;
}

const PY_TWO_SUM_OK = `def solve(nums, target):
    seen = {}
    for i, n in enumerate(nums):
        if target - n in seen:
            return [seen[target - n], i]
        seen[n] = i
    return []`;
const PY_TWO_SUM_WRONG = `def solve(nums, target):
    return [0, 0]`;
const PY_GROUP_ANAGRAMS = `def solve(strs):
    from collections import defaultdict
    g = defaultdict(list)
    for s in strs:
        g["".join(sorted(s))].append(s)
    return list(g.values())`;
const PY_MEDIAN = `def solve(a, b):
    m = sorted(a + b)
    n = len(m)
    return m[n//2] if n % 2 else (m[n//2 - 1] + m[n//2]) / 2`;

async function main() {
  console.log(`DSA grading — end-to-end (Piston @ ${process.env.PISTON_URL ?? "public dev API"})\n`);

  const probe = await runCode("python", [{ name: "main.py", content: "print(1)" }]);
  if (probe.status !== "ok") {
    console.log("  ⚠ SKIPPED — no Piston reachable. Set PISTON_URL to your Piston and re-run.");
    return;
  }

  const ok = await gradeSubmission({ slug: "two-sum", language: "python", code: PY_TWO_SUM_OK });
  check("correct two-sum → passed, all tests", ok.verdict === "passed" && ok.passed === ok.total, `${ok.passed}/${ok.total}`);

  const wrong = await gradeSubmission({ slug: "two-sum", language: "python", code: PY_TWO_SUM_WRONG });
  check("wrong two-sum → failed (not a fake pass)", wrong.verdict === "failed" && wrong.passed < wrong.total, `${wrong.passed}/${wrong.total}`);

  const anag = await gradeSubmission({ slug: "group-anagrams", language: "python", code: PY_GROUP_ANAGRAMS });
  check("group-anagrams (unordered compare) → passed", anag.verdict === "passed", `${anag.passed}/${anag.total}`);

  const med = await gradeSubmission({ slug: "median-two-sorted", language: "python", code: PY_MEDIAN });
  check("median (float-eps compare) → passed", med.verdict === "passed", `${med.passed}/${med.total}`);

  console.log(failed === 0 ? "\n✓ PASS — real grading: correct accepted, wrong rejected, compare modes work." : `\n✗ FAIL (${failed})`);
  if (failed) process.exit(1);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });

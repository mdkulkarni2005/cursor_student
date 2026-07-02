/**
 * DSA problem authoring pipeline — computes `expected` values by actually RUNNING a reference
 * solution through the real execution engine, never by hand-guessing. AI-generated problems have
 * hallucinated wrong expected outputs before (see apps/web/lib/dsa/catalog/index.ts header) — a
 * wrong `expected` is a false-negative that punishes a correct student solution, the exact failure
 * this pipeline exists to prevent.
 *
 * Usage:
 *   pnpm dsa:verify <slug>       — verify one problem
 *   pnpm dsa:verify              — verify every problem under references/
 *
 * For each <slug>:
 *   - reads references/<slug>.py (a correct Python solution defining `solve(...)`)
 *   - reads cases/<slug>.json ({ "tests": [{ "args": [...] , "sample"?: true }, ...] })
 *   - runs the reference through the SAME runFunction() primitive apps/web/lib/dsa/grade.ts uses
 *   - runs each test twice to catch nondeterminism (e.g. unordered dict/set iteration)
 *   - prints a ready-to-paste TS object literal for judging/<difficulty>.ts with `expected` filled in
 *
 * Requires a reachable Piston (PISTON_URL, e.g. local docker compose) — this is a LOCAL pre-merge
 * gate, not enforced in CI. Do not paste `expected` values into judging/*.ts without running this
 * first.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runFunction } from "../../packages/execution/src/index";

const DIR = dirname(fileURLToPath(import.meta.url));
const REFERENCES_DIR = join(DIR, "references");
const CASES_DIR = join(DIR, "cases");

type CaseFile = { tests: { args: unknown[]; sample?: boolean }[] };

function loadCases(slug: string): CaseFile {
  const path = join(CASES_DIR, `${slug}.json`);
  if (!existsSync(path)) {
    throw new Error(`Missing cases/${slug}.json — add { "tests": [{ "args": [...] }, ...] }`);
  }
  return JSON.parse(readFileSync(path, "utf-8"));
}

function loadReference(slug: string): string {
  return readFileSync(join(REFERENCES_DIR, `${slug}.py`), "utf-8");
}

function tsLiteral(v: unknown): string {
  return JSON.stringify(v);
}

async function verifyProblem(slug: string): Promise<boolean> {
  console.log(`\n== ${slug} ==`);
  const reference = loadReference(slug);
  const { tests } = loadCases(slug);
  if (tests.length === 0) {
    console.log("  ⚠ no test cases in cases/" + slug + ".json — skipping");
    return false;
  }

  const lines: string[] = [];
  let allOk = true;

  for (const [i, t] of tests.entries()) {
    const first = await runFunction({ language: "python", userSource: reference, args: t.args });
    if (first.result.unverified) {
      console.log(`  ✗ test ${i}: engine unreachable — point PISTON_URL at a reachable Piston and retry`);
      allOk = false;
      continue;
    }
    if (first.result.status !== "ok") {
      console.log(`  ✗ test ${i}: reference solution failed to run (${first.result.status}): ${first.result.stderr.slice(0, 200)}`);
      allOk = false;
      continue;
    }

    // Run twice — catch nondeterministic reference solutions before they poison the answer key.
    const second = await runFunction({ language: "python", userSource: reference, args: t.args });
    if (JSON.stringify(second.output) !== JSON.stringify(first.output)) {
      console.log(`  ✗ test ${i}: reference solution is NONDETERMINISTIC (${JSON.stringify(first.output)} vs ${JSON.stringify(second.output)}) — fix before using`);
      allOk = false;
      continue;
    }

    console.log(`  ✓ test ${i}: args=${JSON.stringify(t.args)} → expected=${JSON.stringify(first.output)}`);
    const sample = t.sample ? ", sample: true" : "";
    lines.push(`      { args: ${tsLiteral(t.args)}, expected: ${tsLiteral(first.output)}${sample} },`);
  }

  if (allOk) {
    console.log(`\n  Paste-ready tests array for judging/<difficulty>.ts:\n`);
    console.log(`    tests: [\n${lines.join("\n")}\n    ],`);
  } else {
    console.log(`\n  ❌ ${slug} did NOT verify cleanly — do not paste these results into judging/*.ts`);
  }
  return allOk;
}

async function main() {
  const arg = process.argv[2];
  const slugs = arg
    ? [arg]
    : readdirSync(REFERENCES_DIR)
        .filter((f) => f.endsWith(".py"))
        .map((f) => f.replace(/\.py$/, ""));

  if (slugs.length === 0) {
    console.log("No reference solutions found under scripts/dsa-verify/references/");
    process.exit(1);
  }

  let allOk = true;
  for (const slug of slugs) {
    const ok = await verifyProblem(slug);
    allOk = allOk && ok;
  }

  console.log(allOk ? "\n✅ all problems verified." : "\n❌ some problems failed verification — see above.");
  process.exit(allOk ? 0 : 1);
}

main().catch((e) => {
  console.error("\n❌", e instanceof Error ? e.message : e);
  process.exit(1);
});

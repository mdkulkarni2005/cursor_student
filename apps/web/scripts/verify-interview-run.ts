/**
 * Interview "run my code" — proves a COMPLETE program runs (stdout/stderr), the path the
 * interview Run button uses. Unlike DSA there are no hidden tests. Needs a reachable Piston:
 *   PISTON_URL=http://localhost:2000/api/v2 pnpm --filter web verify:interview-run
 */
import { runCode, type Language } from "@studentos/execution";

let failed = 0;
function check(name: string, cond: boolean, extra = "") {
  console.log(`  ${cond ? "✓" : "✗"} ${name}${extra ? `  (${extra})` : ""}`);
  if (!cond) failed++;
}

const FILE: Record<Language, string> = { python: "main.py", javascript: "main.js", typescript: "main.ts", java: "Main.java", cpp: "main.cpp" };
const PROGRAMS: Partial<Record<Language, string>> = {
  python: `print("racecar"[::-1] == "racecar")`,
  javascript: `const s="racecar"; console.log(s.split("").reverse().join("")===s);`,
  java: `public class Main{public static void main(String[] a){String s="racecar";System.out.println(new StringBuilder(s).reverse().toString().equals(s));}}`,
};

async function main() {
  console.log(`Interview run-code (Piston @ ${process.env.PISTON_URL ?? "public dev API"})\n`);

  const probe = await runCode("python", [{ name: "main.py", content: "print(1)" }]);
  if (probe.status !== "ok") {
    console.log("  ⚠ SKIPPED — no Piston reachable. Set PISTON_URL and re-run.");
    return;
  }

  for (const [lang, src] of Object.entries(PROGRAMS) as [Language, string][]) {
    const r = await runCode(lang, [{ name: FILE[lang], content: src }]);
    check(`${lang}: full program runs and prints`, r.status === "ok" && r.stdout.trim().toLowerCase() === "true", r.status === "ok" ? r.stdout.trim() : r.stderr.slice(0, 60));
  }

  // A program that throws → runtime_error surfaced (not a crash).
  const boom = await runCode("python", [{ name: "main.py", content: "raise ValueError('boom')" }]);
  check("runtime error is surfaced (not a hang/crash)", boom.status === "runtime_error" && /boom/.test(boom.stderr));

  console.log(failed === 0 ? "\n✓ PASS — interview run path executes full programs across languages." : `\n✗ FAIL (${failed})`);
  if (failed) process.exit(1);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });

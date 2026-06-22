/**
 * Function-call drivers. The student implements a single entry point named `solve`; the driver
 * reads a JSON array of arguments from stdin, calls `solve(...args)`, and prints the JSON-encoded
 * return value. One generic driver per DYNAMICALLY-typed language covers every problem whose args
 * and return are plain JSON.
 *
 * Statically-typed languages (Java, C++) cannot splat arbitrary JSON into a typed signature
 * generically — they need per-problem typed glue, added in a later step. Until then `supportsRun`
 * is false for them and grading reports `unverified` (fail-closed), never a fake pass.
 */
import type { Language } from "./types";
import type { PistonFile } from "./piston";

/** The fixed entry-point name students implement, across all problems and languages. */
export const ENTRY = "solve";

/** Languages with a generic JSON driver today. */
export const RUNNABLE_LANGUAGES: Language[] = ["python", "javascript", "typescript"];

export function supportsRun(language: Language): boolean {
  return RUNNABLE_LANGUAGES.includes(language);
}

const PY_DRIVER = (user: string) => `import sys, json


${user}


def __run():
    raw = sys.stdin.read()
    args = json.loads(raw) if raw.strip() else []
    sys.stdout.write(json.dumps(${ENTRY}(*args)))


__run()
`;

const JS_DRIVER = (user: string) => `${user}

;(() => {
  const _raw = require('fs').readFileSync(0, 'utf8');
  const _args = _raw.trim() ? JSON.parse(_raw) : [];
  const _res = ${ENTRY}(..._args);
  process.stdout.write(JSON.stringify(_res));
})();
`;

const TS_DRIVER = (user: string) => `// @ts-nocheck
${user}

;(() => {
  const _raw = require('fs').readFileSync(0, 'utf8');
  const _args = _raw.trim() ? JSON.parse(_raw) : [];
  const _res = ${ENTRY}(..._args);
  process.stdout.write(JSON.stringify(_res));
})();
`;

/** Wrap the student's source with the language's driver into the file(s) Piston runs. */
export function buildFunctionFiles(language: Language, userSource: string): PistonFile[] {
  switch (language) {
    case "python":
      return [{ name: "main.py", content: PY_DRIVER(userSource) }];
    case "javascript":
      return [{ name: "main.js", content: JS_DRIVER(userSource) }];
    case "typescript":
      return [{ name: "main.ts", content: TS_DRIVER(userSource) }];
    default:
      // java / cpp — handled by per-problem typed glue in a later step.
      return [];
  }
}

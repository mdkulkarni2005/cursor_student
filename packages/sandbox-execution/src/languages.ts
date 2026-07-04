import type { SandboxRunCommand } from "./types";

/** Same language set as @studentos/execution (Piston) so the UI's language picker is unchanged. */
export type SandboxLanguage = "python" | "javascript" | "typescript" | "java" | "cpp";

export const SANDBOX_LANGUAGES: readonly SandboxLanguage[] = ["python", "javascript", "typescript", "java", "cpp"] as const;

/** The single entry file name per language (Java needs a `public class Main`). */
export const SANDBOX_FILE_NAME: Record<SandboxLanguage, string> = {
  python: "main.py",
  javascript: "main.js",
  typescript: "main.ts",
  java: "Main.java",
  cpp: "main.cpp",
};

/** How to run the entry file once it's written into the sandbox. Compiled languages compile then
 *  run in one shell step; `npx tsx` resolves TypeScript without a separate build step. */
export const SANDBOX_RUN_COMMAND: Record<SandboxLanguage, SandboxRunCommand> = {
  python: { cmd: "python3", args: ["main.py"] },
  javascript: { cmd: "node", args: ["main.js"] },
  typescript: { cmd: "npx", args: ["-y", "tsx", "main.ts"] },
  java: { cmd: "sh", args: ["-c", "javac Main.java && java Main"] },
  cpp: { cmd: "sh", args: ["-c", "g++ main.cpp -o main_bin && ./main_bin"] },
};

import { NextResponse } from "next/server";
import { prisma } from "@studentos/db";
import { runCode, LANGUAGES, type Language } from "@studentos/execution";
import { getOrCreateUser } from "@/lib/user";
import { rateLimit, friendlyError, RateLimitError } from "@/lib/reliability";

/** The full-program file name per language (Java needs a `public class Main`). */
const FILE_NAME: Record<Language, string> = {
  python: "main.py",
  javascript: "main.js",
  typescript: "main.ts",
  java: "Main.java",
  cpp: "main.cpp",
};

/**
 * Run a candidate's coding answer DURING an interview. Unlike DSA, there are no hidden tests —
 * the candidate writes a complete program and runs it to show it works; the output is shown back
 * and (on submit) fed to the evaluator. Degrades gracefully if the sandbox is unreachable.
 */
export async function POST(req: Request) {
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Sign in to run code." }, { status: 401 });

  try {
    rateLimit(user.id, "interview-run", 30);
  } catch (e) {
    const retryAfter = e instanceof RateLimitError ? Math.ceil(e.retryAfterMs / 1000) : 30;
    return NextResponse.json({ error: friendlyError(e) }, { status: 429, headers: { "Retry-After": String(retryAfter) } });
  }

  let body: { docId?: string; language?: string; code?: string; stdin?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const docId = String(body.docId ?? "");
  const language = String(body.language ?? "") as Language;
  const code = String(body.code ?? "");
  const stdin = typeof body.stdin === "string" ? body.stdin.slice(0, 10_000) : "";

  if (!LANGUAGES.includes(language)) return NextResponse.json({ error: "Unsupported language." }, { status: 400 });
  if (code.trim().length < 1) return NextResponse.json({ error: "Write some code first." }, { status: 400 });
  if (code.length > 50_000) return NextResponse.json({ error: "That's a lot of code — trim it down." }, { status: 400 });

  // Owner-guard: the run must belong to one of this user's interviews.
  const owned = await prisma.document.findFirst({ where: { id: docId, ownerId: user.id, type: "INTERVIEW" }, select: { id: true } });
  if (!owned) return NextResponse.json({ error: "Interview not found." }, { status: 404 });

  const result = await runCode(language, [{ name: FILE_NAME[language], content: code }], stdin);

  // Sandbox unreachable → calm message, never an error the interview chokes on.
  if (result.unverified) {
    return NextResponse.json({ unavailable: true, message: "Running code isn't available right now — you can still write your solution and submit." });
  }

  return NextResponse.json({
    status: result.status,
    stdout: result.stdout.slice(0, 10_000),
    stderr: result.stderr.slice(0, 4_000),
  });
}

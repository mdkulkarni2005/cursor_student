import { NextResponse } from "next/server";
import { runCode, LANGUAGES, type Language } from "@studentos/execution";
import { getOrCreateUser } from "@/lib/user";
import { rateLimit, friendlyError, RateLimitError } from "@/lib/reliability";
import { ownedAcceptedSchedule } from "@/lib/live-interview";

/** The full-program file name per language (Java needs a `public class Main`). Same map as
 *  apps/web/app/api/interview/run/route.ts (unrelated feature, not reused directly — that route
 *  is owner-guarded against Document ownership, this one against InterviewSchedule ownership). */
const FILE_NAME: Record<Language, string> = {
  python: "main.py",
  javascript: "main.js",
  typescript: "main.ts",
  java: "Main.java",
  cpp: "main.cpp",
};

export async function POST(req: Request) {
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Sign in to run code." }, { status: 401 });

  try {
    rateLimit(user.id, "interview-room-run", 30);
  } catch (e) {
    const retryAfter = e instanceof RateLimitError ? Math.ceil(e.retryAfterMs / 1000) : 30;
    return NextResponse.json({ error: friendlyError(e) }, { status: 429, headers: { "Retry-After": String(retryAfter) } });
  }

  let body: { scheduleId?: string; language?: string; code?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const scheduleId = String(body.scheduleId ?? "");
  const language = String(body.language ?? "") as Language;
  const code = String(body.code ?? "");

  if (!LANGUAGES.includes(language)) return NextResponse.json({ error: "Unsupported language." }, { status: 400 });
  if (code.trim().length < 1) return NextResponse.json({ error: "Write some code first." }, { status: 400 });
  if (code.length > 50_000) return NextResponse.json({ error: "That's a lot of code — trim it down." }, { status: 400 });

  try {
    await ownedAcceptedSchedule(scheduleId, user.id);
  } catch (err) {
    return NextResponse.json({ error: friendlyError(err) }, { status: 404 });
  }

  const result = await runCode(language, [{ name: FILE_NAME[language], content: code }]);

  if (result.unverified) {
    return NextResponse.json({ unavailable: true, message: "Running code isn't available right now — you can still edit and try again shortly." });
  }

  return NextResponse.json({
    status: result.status,
    stdout: result.stdout.slice(0, 10_000),
    stderr: result.stderr.slice(0, 4_000),
  });
}

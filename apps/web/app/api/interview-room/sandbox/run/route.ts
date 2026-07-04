import { NextResponse } from "next/server";
import { prisma } from "@studentos/db";
import { runInSandbox, SANDBOX_LANGUAGES, SANDBOX_FILE_NAME, SANDBOX_RUN_COMMAND, type SandboxLanguage } from "@studentos/sandbox-execution";
import { getOrCreateUser } from "@/lib/user";
import { rateLimit, friendlyError, RateLimitError } from "@/lib/reliability";
import { ownedAcceptedSchedule } from "@/lib/live-interview";

/** Candidate can run in the shared sandbox once the recruiter has launched it — same shape as the
 *  existing Piston-backed /api/interview-room/run, just backed by a real sandbox. */
export async function POST(req: Request) {
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Sign in to run code." }, { status: 401 });

  try {
    rateLimit(user.id, "interview-room-sandbox-run", 30);
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
  const language = String(body.language ?? "") as SandboxLanguage;
  const code = String(body.code ?? "");

  if (!SANDBOX_LANGUAGES.includes(language)) return NextResponse.json({ error: "Unsupported language." }, { status: 400 });
  if (code.trim().length < 1) return NextResponse.json({ error: "Write some code first." }, { status: 400 });
  if (code.length > 50_000) return NextResponse.json({ error: "That's a lot of code — trim it down." }, { status: 400 });

  try {
    await ownedAcceptedSchedule(scheduleId, user.id);
  } catch (err) {
    return NextResponse.json({ error: friendlyError(err) }, { status: 404 });
  }

  const sandbox = await prisma.interviewSandbox.findUnique({ where: { scheduleId } });
  if (!sandbox || sandbox.status !== "RUNNING") {
    return NextResponse.json({ unavailable: true, message: "The recruiter hasn't launched the sandbox yet." });
  }

  const result = await runInSandbox(sandbox.sandboxId, [{ path: SANDBOX_FILE_NAME[language], content: code }], SANDBOX_RUN_COMMAND[language]);
  if (result.unavailable) return NextResponse.json({ unavailable: true, message: result.message });
  return NextResponse.json({ exitCode: result.exitCode, stdout: result.stdout, stderr: result.stderr });
}

import { NextResponse } from "next/server";
import { prisma } from "@studentos/db";
import { runInSandbox, SANDBOX_LANGUAGES, SANDBOX_FILE_NAME, SANDBOX_RUN_COMMAND, type SandboxLanguage } from "@studentos/sandbox-execution";
import { requireRecruiter } from "@/lib/recruiter";

/** Recruiter can run in the shared sandbox once it's launched — same request/response shape as
 *  apps/web's Piston-backed run route, just backed by a real sandbox (package installs, any
 *  language/framework, not just a single-file snippet judge). */
export async function POST(req: Request) {
  const guard = await requireRecruiter();
  if (!guard.ok) return NextResponse.json({ error: "Sign in as an approved recruiter." }, { status: 401 });

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

  const schedule = await prisma.interviewSchedule.findUnique({ where: { id: scheduleId } });
  if (!schedule || schedule.recruiterId !== guard.recruiter.id) return NextResponse.json({ error: "Interview not found." }, { status: 404 });

  const sandbox = await prisma.interviewSandbox.findUnique({ where: { scheduleId } });
  if (!sandbox || sandbox.status !== "RUNNING") {
    return NextResponse.json({ unavailable: true, message: "Launch the sandbox first." });
  }

  const result = await runInSandbox(sandbox.sandboxId, [{ path: SANDBOX_FILE_NAME[language], content: code }], SANDBOX_RUN_COMMAND[language]);
  if (result.unavailable) return NextResponse.json({ unavailable: true, message: result.message });
  return NextResponse.json({ exitCode: result.exitCode, stdout: result.stdout, stderr: result.stderr });
}

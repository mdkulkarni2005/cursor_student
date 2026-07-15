import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { completeStudentOnboarding } from "@/lib/onboarding";

/**
 * Mobile is student-only (see plan), so this only implements the STUDENT branch of the web
 * onboarding form. The ID card photo is uploaded first via POST /api/mobile/uploads; this
 * endpoint takes the resulting key, mirroring how the web action uploads then calls the same
 * lib/onboarding.ts function.
 */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  let body: {
    department?: string;
    isCustomDepartment?: boolean;
    college?: string;
    semester?: string;
    codingEnabled?: boolean;
    github?: string;
    linkedin?: string;
    phone?: string;
    gpa?: number | null;
    careerGoal?: string | null;
    idCardKey?: string;
    acceptedLegal?: boolean;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!body.acceptedLegal) return NextResponse.json({ error: "Please accept the Terms and Privacy Policy to continue." }, { status: 400 });

  const result = await completeStudentOnboarding(userId, {
    department: String(body.department ?? "").trim(),
    isCustomDepartment: Boolean(body.isCustomDepartment),
    college: String(body.college ?? "").trim(),
    semester: String(body.semester ?? "").trim(),
    codingEnabled: Boolean(body.codingEnabled),
    github: String(body.github ?? "").trim(),
    linkedin: String(body.linkedin ?? "").trim(),
    phone: String(body.phone ?? "").trim(),
    gpa: typeof body.gpa === "number" ? body.gpa : null,
    careerGoal: body.careerGoal?.trim() || null,
    idCardKey: String(body.idCardKey ?? ""),
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}

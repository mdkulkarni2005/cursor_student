import { NextResponse } from "next/server";
import { updateProfile, type ProfileEditInput } from "@/lib/actions/profile-edit";

/**
 * Delegates straight to the web's updateProfile() (requireOnboardedUser() inside handles auth —
 * middleware already guarantees a session reaches here). Settings only exists for already
 * onboarded users on both platforms, so the redirect-on-not-onboarded edge case in that function
 * never fires here in practice.
 */
export async function PATCH(req: Request) {
  let body: Partial<ProfileEditInput>;
  try {
    body = (await req.json()) as Partial<ProfileEditInput>;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const input: ProfileEditInput = {
    name: String(body.name ?? "").trim(),
    careerGoal: String(body.careerGoal ?? "").trim(),
    github: String(body.github ?? "").trim(),
    linkedin: String(body.linkedin ?? "").trim(),
    gpa: typeof body.gpa === "number" ? body.gpa : null,
    department: body.department,
    semester: body.semester,
    college: body.college,
    companyName: body.companyName,
    jobTitle: body.jobTitle,
    yearsOfExperience: body.yearsOfExperience ?? null,
  };

  const result = await updateProfile(input);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}

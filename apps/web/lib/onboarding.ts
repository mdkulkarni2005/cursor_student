import { prisma, assertPhoneAvailable } from "@studentos/db";
import { DEPARTMENTS } from "@/lib/constants";

// Loose "10+ digits, optional leading +" check — real validation (OTP delivery) happens once
// Clerk phone verification is wired up; this just keeps obviously-malformed input out of the
// uniqueness check.
const PHONE_RE = /^\+?[0-9]{10,15}$/;

export type StudentOnboardingInput = {
  department: string;
  isCustomDepartment: boolean;
  college: string;
  semester: string;
  codingEnabled: boolean;
  github: string;
  linkedin: string;
  phone: string;
  gpa: number | null;
  careerGoal: string | null;
  /** Already-uploaded R2 key for the college ID card photo (see keys.idCard). */
  idCardKey: string;
};

export type OnboardingResult = { ok: true } | { ok: false; error: string };

/**
 * The STUDENT onboarding write path, shared by the web Server Action (lib/actions/onboarding.ts,
 * which multipart-uploads the ID card itself before calling this) and the mobile JSON API
 * (which uploads the ID card via /api/mobile/uploads first, then passes the resulting key).
 */
export async function completeStudentOnboarding(clerkUserId: string, input: StudentOnboardingInput): Promise<OnboardingResult> {
  const { department, isCustomDepartment, college, semester, codingEnabled, github, linkedin, phone, gpa, careerGoal, idCardKey } = input;

  if (!PHONE_RE.test(phone)) return { ok: false, error: "Please enter a valid phone number." };
  if (!linkedin) return { ok: false, error: "Please add your LinkedIn link." };
  if (gpa !== null && (!Number.isFinite(gpa) || gpa < 0 || gpa > 10)) return { ok: false, error: "Please enter a valid GPA between 0 and 10." };
  if (isCustomDepartment) {
    if (department.length < 2) return { ok: false, error: "Please type your branch/department." };
  } else if (!DEPARTMENTS.includes(department as (typeof DEPARTMENTS)[number])) {
    return { ok: false, error: "Please choose your department." };
  }
  if (college.length < 2) return { ok: false, error: "Please enter your college name." };
  if (!semester) return { ok: false, error: "Please choose your semester." };
  if (codingEnabled && !github) return { ok: false, error: "Please add your GitHub link — it's required for the coding track." };
  if (!idCardKey) return { ok: false, error: "Please upload a photo of your college ID card." };

  const me = await prisma.user.findUnique({ where: { clerkId: clerkUserId }, select: { id: true } });
  if (!me) return { ok: false, error: "Account not found — please refresh and try again." };

  try {
    await assertPhoneAvailable(phone, { userId: me.id });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "That phone number is already in use." };
  }

  let institution = await prisma.institution.findFirst({ where: { name: college } });
  institution ??= await prisma.institution.create({ data: { name: college } });

  // One submit sets academic context, coding track, AND legal acceptance — no separate gate.
  await prisma.user.update({
    where: { clerkId: clerkUserId },
    data: {
      userType: "STUDENT",
      department,
      semester,
      careerGoal: careerGoal || null,
      phone,
      githubUrl: github || null,
      linkedin,
      gpa,
      institutionId: institution.id,
      codingEnabled,
      idCardKey,
      acceptedLegalAt: new Date(),
      onboardedAt: new Date(),
    },
  });

  return { ok: true };
}

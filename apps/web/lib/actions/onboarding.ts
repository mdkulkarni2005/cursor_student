"use server";

import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { prisma, assertPhoneAvailable } from "@studentos/db";
import { putObject, keys } from "@studentos/storage";
import { SESSION_EXPIRED_ERROR } from "@/lib/actions/onboarding-constants";
import { completeStudentOnboarding } from "@/lib/onboarding";

export type OnboardingState = { error?: string };

// Loose "10+ digits, optional leading +" check — real validation (OTP delivery) happens once
// Clerk phone verification is wired up; this just keeps obviously-malformed input out of the
// uniqueness check.
const PHONE_RE = /^\+?[0-9]{10,15}$/;

const MAX_ID_CARD_UPLOAD = 10 * 1024 * 1024; // 10 MB

export async function completeOnboarding(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const { userId } = await auth();
  if (!userId) return { error: SESSION_EXPIRED_ERROR };

  const userType = formData.get("userType") === "PROFESSIONAL" ? "PROFESSIONAL" : "STUDENT";
  const careerGoal = String(formData.get("careerGoal") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const github = String(formData.get("github") ?? "").trim();
  const linkedin = String(formData.get("linkedin") ?? "").trim();
  const gpaRaw = String(formData.get("gpa") ?? "").trim();
  const acceptedLegal = formData.get("acceptedLegal") === "on";

  if (!PHONE_RE.test(phone)) return { error: "Please enter a valid phone number." };
  if (!linkedin) return { error: "Please add your LinkedIn link." };
  let gpa: number | null = null;
  if (gpaRaw) {
    gpa = Number(gpaRaw);
    if (!Number.isFinite(gpa) || gpa < 0 || gpa > 10) return { error: "Please enter a valid GPA between 0 and 10." };
  }
  if (!acceptedLegal) return { error: "Please accept the Terms and Privacy Policy to continue." };

  const me = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } });
  if (!me) return { error: "Account not found — please refresh and try again." };

  try {
    await assertPhoneAvailable(phone, { userId: me.id });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "That phone number is already in use." };
  }

  if (userType === "PROFESSIONAL") {
    const companyName = String(formData.get("companyName") ?? "").trim();
    const jobTitle = String(formData.get("jobTitle") ?? "").trim();
    const yearsRaw = String(formData.get("yearsOfExperience") ?? "").trim();

    if (!companyName) return { error: "Please enter your company name." };
    if (!jobTitle) return { error: "Please enter your job title." };
    if (!github) return { error: "Please add your GitHub link." };
    let yearsOfExperience: number | null = null;
    if (yearsRaw) {
      yearsOfExperience = Number(yearsRaw);
      if (!Number.isFinite(yearsOfExperience) || yearsOfExperience < 0 || yearsOfExperience > 60)
        return { error: "Please enter a valid number of years (0–60)." };
    }

    await prisma.user.update({
      where: { clerkId: userId },
      data: {
        userType: "PROFESSIONAL",
        companyName,
        jobTitle,
        yearsOfExperience,
        githubUrl: github,
        linkedin,
        gpa,
        careerGoal: careerGoal || null,
        phone,
        codingEnabled: true,
        acceptedLegalAt: new Date(),
        onboardedAt: new Date(),
      },
    });

    redirect("/interview");
  }

  const department = String(formData.get("department") ?? "").trim();
  const college = String(formData.get("college") ?? "").trim();
  const semester = String(formData.get("semester") ?? "").trim();
  const codingEnabled = formData.get("codingEnabled") === "on";
  const idCard = formData.get("idCard");
  const isCustomDepartment = formData.get("isCustomDepartment") === "on";

  if (!(idCard instanceof File) || idCard.size === 0)
    return { error: "Please upload a photo of your college ID card." };
  if (idCard.size > MAX_ID_CARD_UPLOAD) return { error: "ID card file is too large (max 10 MB)." };

  const idCardExt = (idCard.type.split("/")[1] || "bin").replace("+xml", "");
  const idCardKey = keys.idCard(me.id, idCardExt);
  await putObject(idCardKey, Buffer.from(await idCard.arrayBuffer()), idCard.type);

  const result = await completeStudentOnboarding(userId, {
    department,
    isCustomDepartment,
    college,
    semester,
    codingEnabled,
    github,
    linkedin,
    phone,
    gpa,
    careerGoal: careerGoal || null,
    idCardKey,
  });
  if (!result.ok) return { error: result.error };

  redirect("/dashboard");
}

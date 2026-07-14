"use server";

import { prisma } from "@studentos/db";
import { requireOnboardedUser } from "@/lib/user";
import { DEPARTMENTS, SEMESTERS } from "@/lib/constants";

export type ProfileEditInput = {
  name: string;
  careerGoal: string;
  github: string;
  linkedin: string;
  gpa: number | null;
  // STUDENT-only
  department?: string;
  semester?: string;
  college?: string;
  // PROFESSIONAL-only
  companyName?: string;
  jobTitle?: string;
  yearsOfExperience?: number | null;
};

export type ProfileEditResult = { ok: true } | { ok: false; error: string };

/** Lets an already-onboarded user edit the profile fields shown in Settings, without re-running onboarding. */
export async function updateProfile(input: ProfileEditInput): Promise<ProfileEditResult> {
  const user = await requireOnboardedUser();

  const name = input.name.trim();
  const github = input.github.trim();
  const linkedin = input.linkedin.trim();
  const careerGoal = input.careerGoal.trim();

  if (!name) return { ok: false, error: "Please enter your name." };
  if (!linkedin) return { ok: false, error: "Please add your LinkedIn link." };
  if (input.gpa !== null && (!Number.isFinite(input.gpa) || input.gpa < 0 || input.gpa > 10)) {
    return { ok: false, error: "Please enter a valid GPA between 0 and 10." };
  }

  if (user.userType === "PROFESSIONAL") {
    const companyName = (input.companyName ?? "").trim();
    const jobTitle = (input.jobTitle ?? "").trim();
    if (!companyName) return { ok: false, error: "Please enter your company name." };
    if (!jobTitle) return { ok: false, error: "Please enter your job title." };
    if (!github) return { ok: false, error: "Please add your GitHub link." };
    if (
      input.yearsOfExperience != null &&
      (!Number.isFinite(input.yearsOfExperience) || input.yearsOfExperience < 0 || input.yearsOfExperience > 60)
    ) {
      return { ok: false, error: "Please enter a valid number of years (0–60)." };
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        name,
        careerGoal: careerGoal || null,
        githubUrl: github,
        linkedin,
        gpa: input.gpa,
        companyName,
        jobTitle,
        yearsOfExperience: input.yearsOfExperience ?? null,
      },
    });
    return { ok: true };
  }

  const department = (input.department ?? "").trim();
  const semester = (input.semester ?? "").trim();
  const college = (input.college ?? "").trim();

  if (!DEPARTMENTS.includes(department as (typeof DEPARTMENTS)[number]))
    return { ok: false, error: "Please choose your department." };
  if (!SEMESTERS.includes(semester as (typeof SEMESTERS)[number])) return { ok: false, error: "Please choose your semester." };
  if (college.length < 2) return { ok: false, error: "Please enter your college name." };
  // Same rule as onboarding — GitHub only matters for the coding track.
  if (user.codingEnabled && !github) return { ok: false, error: "Please add your GitHub link — it's required for the coding track." };

  let institution = await prisma.institution.findFirst({ where: { name: college } });
  institution ??= await prisma.institution.create({ data: { name: college } });

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name,
      department,
      semester,
      institutionId: institution.id,
      careerGoal: careerGoal || null,
      githubUrl: github || null,
      linkedin,
      gpa: input.gpa,
    },
  });
  return { ok: true };
}

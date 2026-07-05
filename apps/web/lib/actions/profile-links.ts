"use server";

import { prisma } from "@studentos/db";
import { requireOnboardedUser } from "@/lib/user";

export type ProfileLinksInput = { github: string; linkedin: string; gpa?: number | null };
export type ProfileLinksResult = { ok: true } | { ok: false; error: string };

/**
 * Lets a user who onboarded before GitHub/LinkedIn were required (or who skipped GPA) fill them
 * in later, without re-running the full onboarding form. Gates the "Share Profile" action in
 * apps/web/lib/actions/profile.ts.
 */
export async function updateProfileLinks(input: ProfileLinksInput): Promise<ProfileLinksResult> {
  const user = await requireOnboardedUser();

  const github = input.github.trim();
  const linkedin = input.linkedin.trim();
  if (!github) return { ok: false, error: "Please add your GitHub link." };
  if (!linkedin) return { ok: false, error: "Please add your LinkedIn link." };

  // Only touch gpa if the caller explicitly passed a value — leaving it untouched otherwise
  // preserves whatever the user already set at onboarding.
  let gpa: number | null | undefined = undefined;
  if (input.gpa !== undefined) {
    if (input.gpa !== null && (!Number.isFinite(input.gpa) || input.gpa < 0 || input.gpa > 10)) {
      return { ok: false, error: "Please enter a valid GPA between 0 and 10." };
    }
    gpa = input.gpa;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { githubUrl: github, linkedin, ...(gpa !== undefined ? { gpa } : {}) },
  });
  return { ok: true };
}

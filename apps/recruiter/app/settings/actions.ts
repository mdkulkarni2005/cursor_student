"use server";

import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@studentos/db";

export type SettingsState = { error?: string; savedAt?: string };

/**
 * Lets an already-APPROVED recruiter change their preferred industry/branch after onboarding.
 * Separate from onboarding's saveApplication, which refuses edits once status leaves DRAFT —
 * this only ever touches `industry`, never `status`.
 */
export async function updateIndustry(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const user = await currentUser();
  if (!user) return { error: "You must be signed in." };

  const industry = String(formData.get("industry") ?? "").trim();

  const recruiter = await prisma.recruiter.findUnique({ where: { clerkId: user.id } });
  if (!recruiter || recruiter.status !== "APPROVED") {
    return { error: "Only approved recruiters can change their preference." };
  }

  await prisma.recruiter.update({
    where: { clerkId: user.id },
    data: { industry: industry || null },
  });

  return { savedAt: new Date().toLocaleTimeString() };
}

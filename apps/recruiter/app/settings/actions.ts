"use server";

import { prisma } from "@studentos/db";
import { requireRecruiter } from "@/lib/recruiter";

export type SettingsState = { error?: string; savedAt?: string };

/**
 * Lets an already-APPROVED recruiter change their preferred industry/branch after onboarding.
 * Separate from onboarding's saveApplication, which refuses edits once status leaves DRAFT —
 * this only ever touches `industry`, never `status`.
 */
export async function updateIndustry(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const guard = await requireRecruiter();
  if (!guard.ok) return { error: "Only approved recruiters can change their preference." };

  const industry = String(formData.get("industry") ?? "").trim();

  await prisma.recruiter.update({
    where: { id: guard.recruiter.id },
    data: { industry: industry || null },
  });

  return { savedAt: new Date().toLocaleTimeString() };
}

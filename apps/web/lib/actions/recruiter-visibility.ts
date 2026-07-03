"use server";

import { prisma } from "@studentos/db";
import { requireOnboardedUser } from "@/lib/user";

/**
 * Explicit opt-in/out for recruiter discovery (apps/recruiter's student search). On by default —
 * a student can flip this off to hide their profile from recruiter search.
 */
export async function setRecruiterVisibility(visible: boolean): Promise<{ visible: boolean }> {
  const user = await requireOnboardedUser();
  await prisma.user.update({
    where: { id: user.id },
    data: { visibleToRecruiters: visible, visibleToRecruitersAt: visible ? new Date() : null },
  });
  return { visible };
}

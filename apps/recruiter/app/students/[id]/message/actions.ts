"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@studentos/db";
import { requireRecruiter } from "@/lib/recruiter";
import { assertRecruiterWithinQuota, recordRecruiterUsage, RecruiterQuotaExceededError } from "@/lib/entitlements";

export type SendMessageState = { error?: string; sent?: boolean };

export async function sendMessage(studentId: string, _prev: SendMessageState, formData: FormData): Promise<SendMessageState> {
  const guard = await requireRecruiter();
  if (!guard.ok) return { error: "Not authorized." };

  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "Message can't be empty." };
  if (body.length > 2000) return { error: "Message is too long." };

  const student = await prisma.user.findUnique({ where: { id: studentId }, select: { visibleToRecruiters: true } });
  if (!student?.visibleToRecruiters) return { error: "This student is no longer visible to recruiters." };

  // First contact with this student this month consumes a candidate-contact credit — replies in
  // an existing thread don't (only the outreach itself is quota-gated).
  const alreadyContacted = await prisma.recruiterMessage.findFirst({
    where: { recruiterId: guard.recruiter.id, studentId },
    select: { id: true },
  });
  if (!alreadyContacted) {
    try {
      await assertRecruiterWithinQuota(guard.recruiter, "CANDIDATE_CONTACT");
    } catch (err) {
      if (err instanceof RecruiterQuotaExceededError) return { error: err.message };
      throw err;
    }
  }

  await prisma.recruiterMessage.create({
    data: { recruiterId: guard.recruiter.id, studentId, body },
  });
  if (!alreadyContacted) await recordRecruiterUsage(guard.recruiter.id, "CANDIDATE_CONTACT");

  revalidatePath(`/students/${studentId}`);
  return { sent: true };
}

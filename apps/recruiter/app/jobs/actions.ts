"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { prisma } from "@studentos/db";
import { requireRecruiter } from "@/lib/recruiter";
import { startFindCandidates, runFindCandidates, getJobPosting } from "@/lib/job-postings";
import { assertRecruiterWithinQuota, recordRecruiterUsage, RecruiterQuotaExceededError } from "@/lib/entitlements";

export type CreatePostingState = { error?: string };

export async function createJobPosting(_prev: CreatePostingState, formData: FormData): Promise<CreatePostingState> {
  const guard = await requireRecruiter();
  if (!guard.ok) return { error: "Not authorized." };

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const department = String(formData.get("department") ?? "").trim();
  if (!title) return { error: "Please give the posting a title." };
  if (!description) return { error: "Please paste the job description." };

  try {
    await assertRecruiterWithinQuota(guard.recruiter, "JOB_POSTING");
  } catch (err) {
    if (err instanceof RecruiterQuotaExceededError) return { error: err.message };
    throw err;
  }

  const posting = await prisma.jobPosting.create({
    data: { recruiterId: guard.recruiter.id, title, description, department: department || null },
  });
  await recordRecruiterUsage(guard.recruiter.id, "JOB_POSTING");

  revalidatePath("/jobs");
  redirect(`/jobs/${posting.id}`);
}

/**
 * Kicks off scoring every visible student against this posting. Runs via `after()` — outside the
 * request lifecycle — so a large candidate pool's multiple sequential AI-batch calls can't hit a
 * serverless timeout (same pattern apps/web uses for report/resume generation). Returns
 * immediately once the posting is marked RUNNING; the page polls for completion.
 */
export async function findCandidates(jobPostingId: string): Promise<void> {
  const guard = await requireRecruiter();
  if (!guard.ok) throw new Error("Not authorized");

  const started = await startFindCandidates(jobPostingId, guard.recruiter.id);
  if (started) {
    after(() => runFindCandidates(jobPostingId, guard.recruiter.id));
  }
  revalidatePath(`/jobs/${jobPostingId}`);
}

/**
 * Recruiter picks a candidate for this posting: sends them a message with the JD attached, then
 * hands off to the normal schedule-interview flow (student page, pre-tagged with jobPostingId).
 * Selection itself is just the notification — no InterviewSchedule row is created here.
 */
export async function selectCandidateForJob(jobPostingId: string, studentId: string): Promise<void> {
  const guard = await requireRecruiter();
  if (!guard.ok) throw new Error("Not authorized");

  const posting = await getJobPosting(jobPostingId, guard.recruiter.id);
  if (!posting) throw new Error("Job posting not found.");

  const student = await prisma.user.findUnique({ where: { id: studentId }, select: { visibleToRecruiters: true } });
  if (!student?.visibleToRecruiters) throw new Error("This student is no longer visible to recruiters.");

  await assertRecruiterWithinQuota(guard.recruiter, "CANDIDATE_CONTACT");

  await prisma.recruiterMessage.create({
    data: {
      recruiterId: guard.recruiter.id,
      studentId,
      body: [
        `You've been selected to interview for "${posting.title}"! Here's the job description:`,
        "",
        posting.description,
        "",
        "We'll follow up shortly to schedule a time — keep an eye on your interviews page.",
      ].join("\n"),
    },
  });
  await recordRecruiterUsage(guard.recruiter.id, "CANDIDATE_CONTACT");

  redirect(`/students/${studentId}?jobPostingId=${jobPostingId}`);
}

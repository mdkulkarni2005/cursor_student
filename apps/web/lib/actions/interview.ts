"use server";

import { redirect } from "next/navigation";
import { INTERVIEW_ROUNDS, INTERVIEW_DIFFICULTIES, type InterviewRound, type InterviewDifficulty } from "@studentos/ai";
import { getOrCreateUser } from "@/lib/user";
import { startInterview, submitAnswer } from "@/lib/interview/generate";
import { rateLimit, friendlyError } from "@/lib/reliability";
import { assertWithinCostBudget, assertWithinQuota, recordUsage } from "@/lib/entitlements";

export type InterviewFormState = { error?: string };

export async function startInterviewAction(
  _prev: InterviewFormState,
  formData: FormData,
): Promise<InterviewFormState> {
  const user = await getOrCreateUser();
  if (!user) return { error: "You must be signed in." };
  if (!user.onboardedAt) redirect("/onboarding");
  try {
    await rateLimit(user.id, "interview-start");
    await assertWithinQuota(user, "INTERVIEW"); // also enforces the $ cost cap internally
  } catch (e) {
    return { error: friendlyError(e) };
  }

  const role = String(formData.get("role") ?? "").trim();
  if (role.length < 2) return { error: "Enter the role you're interviewing for." };

  const rounds = formData
    .getAll("rounds")
    .map(String)
    .filter((r): r is InterviewRound => (INTERVIEW_ROUNDS as readonly string[]).includes(r));
  if (rounds.length === 0) return { error: "Pick at least one round." };

  const resumeDocId = String(formData.get("resumeDocId") ?? "") || undefined;
  const jobDescription = String(formData.get("jobDescription") ?? "").trim().slice(0, 4000) || undefined;

  const difficultyRaw = String(formData.get("difficulty") ?? "auto");
  const difficulty: InterviewDifficulty = (INTERVIEW_DIFFICULTIES as readonly string[]).includes(difficultyRaw)
    ? (difficultyRaw as InterviewDifficulty)
    : "auto";

  let docId: string;
  try {
    const res = await startInterview({ userId: user.id, role, rounds, resumeDocId, jobDescription, difficulty });
    docId = res.docId;
  } catch (err) {
    return { error: friendlyError(err) };
  }
  await recordUsage(user.id, "INTERVIEW", docId);
  redirect(`/interview/${docId}`);
}

export async function submitAnswerAction(formData: FormData): Promise<void> {
  const user = await getOrCreateUser();
  const docId = String(formData.get("docId") ?? "");
  const answer = String(formData.get("answer") ?? "");
  // Coding answers also carry the language + what the candidate's code printed (feeds the evaluator).
  const language = String(formData.get("language") ?? "") || undefined;
  const runOutput = String(formData.get("runOutput") ?? "") || undefined;
  if (!user || !docId) return;
  try {
    await rateLimit(user.id, "interview-answer", 40);
    await assertWithinCostBudget(user);
    await submitAnswer(user.id, docId, answer, { language, runOutput });
  } catch {
    /* surfaced on the page (busy/complete/rate-limited) */
  }
  redirect(`/interview/${docId}`);
}

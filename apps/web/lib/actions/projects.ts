"use server";

import { redirect } from "next/navigation";
import {
  assessContext,
  answersToContext,
  generateProjectIdeas,
  withAiRetry,
  ProjectIdeaSchema,
  PROJECT_DIFFICULTIES,
  type ClarifyQuestion,
  type ProjectIdea,
  type ProjectDifficulty,
} from "@studentos/ai";
import { getOrCreateUser } from "@/lib/user";
import { finalizeProject, generateProjectBundle } from "@/lib/projects/generate";
import { rateLimit, friendlyError } from "@/lib/reliability";

export type IdeasFormState = {
  error?: string;
  questions?: ClarifyQuestion[];
  ideas?: ProjectIdea[];
};

function difficultyOf(v: FormDataEntryValue | null): ProjectDifficulty | undefined {
  const s = String(v ?? "");
  return (PROJECT_DIFFICULTIES as readonly string[]).includes(s) ? (s as ProjectDifficulty) : undefined;
}

export async function suggestIdeasAction(
  _prev: IdeasFormState,
  formData: FormData,
): Promise<IdeasFormState> {
  const user = await getOrCreateUser();
  if (!user) return { error: "You must be signed in." };
  if (!user.onboardedAt) redirect("/onboarding");
  try { rateLimit(user.id, "project-ideas"); } catch (e) { return { error: friendlyError(e) }; }

  const interests = String(formData.get("interests") ?? "").trim() || undefined;
  const difficulty = difficultyOf(formData.get("difficulty"));
  let guidelines: string | undefined;

  const alreadyAsked = formData.get("clarifyShown") === "1";
  if (!alreadyAsked) {
    try {
      const assessment = await withAiRetry(() => assessContext({
        task: "project idea",
        topic: interests ?? "project",
        context: interests,
        department: user.department ?? undefined,
      }), { label: "project.assess" });
      if (!assessment.ready && assessment.questions.length > 0) return { questions: assessment.questions };
    } catch {
      /* clarify is optional — proceed to generation */
    }
  } else {
    const rawQs = formData.get("clarifyQuestions");
    if (typeof rawQs === "string" && rawQs) {
      try {
        const qs = JSON.parse(rawQs) as ClarifyQuestion[];
        const answers: Record<string, string> = {};
        for (const q of qs) {
          const vals = formData.getAll(`clarify_${q.id}`).map(String).map((s) => s.trim()).filter(Boolean);
          if (vals.length) answers[q.id] = vals.join(", ");
        }
        guidelines = answersToContext(qs, answers) || undefined;
      } catch {
        /* ignore */
      }
    }
  }

  try {
    const { content } = await withAiRetry(() => generateProjectIdeas({
      department: user.department ?? "Engineering",
      interests,
      difficulty,
      guidelines,
    }), { label: "project.ideas" });
    return { ideas: content.ideas };
  } catch (err) {
    return { error: friendlyError(err) };
  }
}

/** Finalize a chosen idea into a persisted PROJECT, then open it. */
export async function finalizeProjectAction(formData: FormData): Promise<void> {
  const user = await getOrCreateUser();
  if (!user) return;
  const raw = String(formData.get("idea") ?? "");
  const description = String(formData.get("description") ?? "").trim() || undefined;
  let idea: ProjectIdea;
  try {
    idea = ProjectIdeaSchema.parse(JSON.parse(raw));
  } catch {
    return;
  }
  const { docId } = await finalizeProject(user.id, idea, description);
  redirect(`/projects/${docId}`);
}

/** Generate the report + PPT + viva bundle from a finalized project. */
export async function generateBundleAction(formData: FormData): Promise<void> {
  const user = await getOrCreateUser();
  const docId = String(formData.get("docId") ?? "");
  if (!user || !docId) return;
  await generateProjectBundle(user.id, docId);
  redirect(`/projects/${docId}`);
}

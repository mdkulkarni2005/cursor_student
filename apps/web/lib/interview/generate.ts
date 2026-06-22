import { prisma } from "@studentos/db";
import {
  nextInterviewQuestion,
  evaluateInterview,
  withAiRetry,
  type InterviewRound,
  type InterviewTurn,
  type InterviewConfig,
  type InterviewEvaluation,
  type ResumeBrief,
} from "@studentos/ai";
import { getOrCreateCurrentWorkspace } from "@/lib/workspace";
import { getResume } from "@/lib/resume/generate";

/** The full interview session, persisted in Document.content.data. */
export type InterviewState = {
  config: InterviewConfig;
  phase: "active" | "complete";
  questionPlan: InterviewRound[]; // round for each question slot (length = budget)
  transcript: InterviewTurn[];
  brief?: ResumeBrief;
  department?: string;
  jobDescription?: string;
  evaluation?: InterviewEvaluation;
};

export type StartInterviewInput = {
  userId: string;
  role: string;
  rounds: InterviewRound[];
  resumeDocId?: string;
  jobDescription?: string;
};

/** Extra metadata for a coding answer — what was run and what it produced (feeds the evaluator). */
export type AnswerMeta = { language?: string; runOutput?: string };

/** Two questions per round (one for coding), capped — keeps a session short and real. */
function buildPlan(rounds: InterviewRound[]): InterviewRound[] {
  const plan: InterviewRound[] = [];
  for (const r of rounds) {
    const n = r === "coding" ? 1 : 2;
    for (let i = 0; i < n; i++) plan.push(r);
  }
  return plan.slice(0, 6);
}

async function resumeBrief(userId: string, resumeDocId?: string): Promise<ResumeBrief | undefined> {
  if (!resumeDocId) return undefined;
  const r = await getResume(userId, resumeDocId);
  if (!r) return undefined;
  return {
    skills: r.resume.skills.flatMap((g) => g.items).slice(0, 20),
    projects: r.resume.projects.map((p) => p.name),
    experience: r.resume.experience.map((e) => [e.organization, e.role].filter(Boolean).join(" - ")),
  };
}

export async function startInterview(input: StartInterviewInput): Promise<{ docId: string }> {
  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!user) throw new Error("User not found.");
  if (input.rounds.length === 0) throw new Error("Pick at least one interview round.");

  const workspace = await getOrCreateCurrentWorkspace(user);
  const config: InterviewConfig = { role: input.role, rounds: input.rounds };
  const plan = buildPlan(input.rounds);
  const brief = await resumeBrief(input.userId, input.resumeDocId);

  const { next } = await withAiRetry(() => nextInterviewQuestion({
    config,
    round: plan[0]!,
    questionNumber: 1,
    totalQuestions: plan.length,
    transcript: [],
    brief,
    department: user.department ?? undefined,
    jobDescription: input.jobDescription,
  }), { label: "interview.firstQ" });

  const state: InterviewState = {
    config,
    phase: "active",
    questionPlan: plan,
    brief,
    department: user.department ?? undefined,
    jobDescription: input.jobDescription,
    transcript: [{ speaker: "interviewer", content: next.question, kind: next.kind, runnable: next.runnable, round: plan[0] }],
  };

  const doc = await prisma.document.create({
    data: {
      ownerId: user.id,
      type: "INTERVIEW",
      title: `Interview — ${input.role}`,
      status: "READY", // READY = idle / not processing a turn
      workspaceId: workspace.id,
      content: { create: { data: state as unknown as object } },
    },
  });
  return { docId: doc.id };
}

export async function getInterview(userId: string, docId: string): Promise<{ title: string; state: InterviewState } | null> {
  const doc = await prisma.document.findFirst({
    where: { id: docId, ownerId: userId, type: "INTERVIEW" },
    include: { content: true },
  });
  if (!doc?.content) return null;
  return { title: doc.title, state: doc.content.data as unknown as InterviewState };
}

/**
 * Submit the candidate's answer and advance the session. Concurrency-safe: acquires a
 * DB lock by flipping status READY→GENERATING atomically, so a double-click can't append
 * two turns or fire two generations. Rejects once the interview is complete.
 */
export async function submitAnswer(userId: string, docId: string, answer: string, meta: AnswerMeta = {}): Promise<InterviewState> {
  const text = answer.trim();
  if (!text) throw new Error("Please type an answer.");

  // Acquire the per-document lock (count 0 = busy or not found/owned).
  const lock = await prisma.document.updateMany({
    where: { id: docId, ownerId: userId, type: "INTERVIEW", status: "READY" },
    data: { status: "GENERATING" },
  });
  if (lock.count === 0) throw new Error("This interview is busy or already finished.");

  try {
    const loaded = await getInterview(userId, docId);
    if (!loaded) throw new Error("Interview not found.");
    const state = loaded.state;
    if (state.phase === "complete") throw new Error("This interview is already complete.");

    state.transcript.push({ speaker: "candidate", content: text, kind: "answer", language: meta.language, runOutput: meta.runOutput });
    const answered = state.transcript.filter((t) => t.speaker === "candidate").length;

    if (answered < state.questionPlan.length) {
      const round = state.questionPlan[answered]!;
      const { next } = await withAiRetry(() => nextInterviewQuestion({
        config: state.config,
        round,
        questionNumber: answered + 1,
        totalQuestions: state.questionPlan.length,
        transcript: state.transcript,
        brief: state.brief,
        department: state.department,
        jobDescription: state.jobDescription,
      }), { label: "interview.nextQ" });
      state.transcript.push({ speaker: "interviewer", content: next.question, kind: next.kind, runnable: next.runnable, round });
    } else {
      const { evaluation } = await withAiRetry(() => evaluateInterview({
        config: state.config,
        transcript: state.transcript,
        brief: state.brief,
        department: state.department,
        jobDescription: state.jobDescription,
      }), { label: "interview.eval" });
      state.evaluation = evaluation;
      state.phase = "complete";
    }

    await prisma.documentContent.update({ where: { documentId: docId }, data: { data: state as unknown as object } });
    return state;
  } finally {
    // Release the lock.
    await prisma.document.update({ where: { id: docId }, data: { status: "READY" } }).catch(() => {});
  }
}

import { prisma } from "@studentos/db";
import {
  nextInterviewQuestion,
  generateInterviewQuestionSet,
  evaluateInterview,
  withAiRetry,
  type InterviewRound,
  type InterviewTurn,
  type InterviewConfig,
  type InterviewEvaluation,
  type QuestionItem,
  type ResumeBrief,
} from "@studentos/ai";
import { getOrCreateCurrentWorkspace } from "@/lib/workspace";
import { getResume } from "@/lib/resume/generate";

/** The full interview session, persisted in Document.content.data. */
export type InterviewState = {
  config: InterviewConfig;
  phase: "active" | "complete";
  questionPlan: InterviewRound[]; // round for each question slot (length = budget)
  /** Pre-generated, resume-grounded question set for the live VAPI voice flow (injected via variableValues). */
  questions?: QuestionItem[];
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

/**
 * Pacing bounds for the AI-driven interview. The candidate never sees a counter; the model
 * decides when to wrap up (`wrapUp`) somewhere between these. MIN keeps it substantive; MAX
 * is a hard cost/length cap the caller enforces even if the model never wraps up.
 */
const MIN_QUESTIONS = 6;
// Hard cap on questions in one interview (the interviewer works through these, then prompts the
// candidate to End). Kept at most ~10-15 per product requirement.
const MAX_QUESTIONS = 14;

/**
 * The interview opens like a real one: the interviewer greets the candidate and asks them to
 * introduce themselves BEFORE any technical question. This is turn 0 (no AI call, no plan slot);
 * the candidate's self-intro then grounds the first real question alongside their resume.
 */
const INTRO_TURN: InterviewTurn = {
  speaker: "interviewer",
  kind: "question",
  content:
    "Hi, thanks for taking the time today. I'm your interviewer for this session — we'll go through a few questions and, if it's part of your round, a short coding exercise, and I'll share feedback at the end. To get us started, tell me a little about yourself and what you've been working on recently.",
};

/**
 * Round ordering guide — NOT a fixed length anymore. We lay out the chosen rounds across up to
 * MAX_QUESTIONS slots (coding stays last). The interview ends dynamically via `wrapUp` or the
 * MAX_QUESTIONS cap, so this is just "which round does slot N belong to".
 */
function buildPlan(rounds: InterviewRound[]): InterviewRound[] {
  const plan: InterviewRound[] = [];
  for (const r of rounds) {
    // A fuller interview: ~4 questions per spoken round, with coding kept to 2 (it's longer). The
    // hard MAX cap keeps the whole session at most ~10-15 questions.
    const n = r === "coding" ? 2 : 4;
    for (let i = 0; i < n; i++) plan.push(r);
  }
  return plan.slice(0, MAX_QUESTIONS);
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

  // Pre-generate the full, resume-grounded question set so the live VAPI assistant can be handed
  // all questions up front (injected via variableValues). The typed fallback ignores this and uses
  // the per-turn nextInterviewQuestion path instead, so both flows keep working.
  const { questions } = await withAiRetry(() => generateInterviewQuestionSet({
    config,
    plan,
    brief,
    department: user.department ?? undefined,
    jobDescription: input.jobDescription,
  }), { label: "interview.questionSet" });

  // The interview opens with the fixed self-introduction prompt. For the typed fallback, the first
  // real (resume-grounded) question is generated after the candidate answers the intro.
  const state: InterviewState = {
    config,
    phase: "active",
    questionPlan: plan,
    questions,
    brief,
    department: user.department ?? undefined,
    jobDescription: input.jobDescription,
    transcript: [INTRO_TURN],
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

    // Dynamic, AI-decided termination. Below the hard cap we ask the model for the next
    // question — but it may signal `wrapUp` once it has enough signal. At/above MAX_QUESTIONS
    // we end regardless. The candidate never sees a count; the round for the next slot is the
    // plan entry, clamped to the last slot if we run past the (shorter) plan.
    let wrapUp = answered >= MAX_QUESTIONS;
    if (!wrapUp) {
      // `answered` includes the intro answer (turn 0), so the first real question (answered=1)
      // maps to plan slot 0. Clamp in case we run past the (possibly shorter) plan.
      const round = state.questionPlan[Math.min(answered - 1, state.questionPlan.length - 1)]!;
      const { next } = await withAiRetry(() => nextInterviewQuestion({
        config: state.config,
        round,
        questionNumber: answered,
        totalQuestions: state.questionPlan.length,
        minQuestions: MIN_QUESTIONS,
        maxQuestions: MAX_QUESTIONS,
        transcript: state.transcript,
        brief: state.brief,
        department: state.department,
        jobDescription: state.jobDescription,
      }), { label: "interview.nextQ" });
      if (next.wrapUp) wrapUp = true;
      else state.transcript.push({ speaker: "interviewer", content: next.question, kind: next.kind, runnable: next.runnable, round });
    }

    if (wrapUp) {
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

/**
 * End the interview NOW (the red "End" button) and evaluate whatever was answered so far. This is
 * the deliberate early-exit path — without it, ending just refreshed back into an active session.
 * Uses the same READY→GENERATING lock; idempotent once the interview is already complete.
 */
export async function endInterviewNow(userId: string, docId: string): Promise<InterviewState> {
  const lock = await prisma.document.updateMany({
    where: { id: docId, ownerId: userId, type: "INTERVIEW", status: "READY" },
    data: { status: "GENERATING" },
  });
  if (lock.count === 0) throw new Error("This interview is busy or already finished.");

  try {
    const loaded = await getInterview(userId, docId);
    if (!loaded) throw new Error("Interview not found.");
    const state = loaded.state;
    if (state.phase === "complete") return state; // already evaluated — nothing to do

    const { evaluation } = await withAiRetry(() => evaluateInterview({
      config: state.config,
      transcript: state.transcript,
      brief: state.brief,
      department: state.department,
      jobDescription: state.jobDescription,
    }), { label: "interview.endEval" });
    state.evaluation = evaluation;
    state.phase = "complete";

    await prisma.documentContent.update({ where: { documentId: docId }, data: { data: state as unknown as object } });
    return state;
  } finally {
    await prisma.document.update({ where: { id: docId }, data: { status: "READY" } }).catch(() => {});
  }
}

/** A turn captured from the VAPI call transcript (assistant = interviewer, user = candidate). */
export type VapiTurn = { role: "assistant" | "user" | "system"; content: string };

/**
 * Finalize the LIVE VAPI interview from the transcript the browser captured during the call, then
 * evaluate it (Sonnet). The VAPI conversation — not our per-turn state — is the source of truth for
 * the voice flow, so we replace the stored transcript with the mapped turns before evaluating.
 */
export async function finalizeFromTranscript(userId: string, docId: string, turns: VapiTurn[]): Promise<InterviewState> {
  const lock = await prisma.document.updateMany({
    where: { id: docId, ownerId: userId, type: "INTERVIEW", status: "READY" },
    data: { status: "GENERATING" },
  });
  if (lock.count === 0) throw new Error("This interview is busy or already finished.");

  try {
    const loaded = await getInterview(userId, docId);
    if (!loaded) throw new Error("Interview not found.");
    const state = loaded.state;
    if (state.phase === "complete") return state;

    const mapped: InterviewTurn[] = turns
      .filter((t) => t.content?.trim())
      .map((t) => (t.role === "user"
        ? { speaker: "candidate" as const, content: t.content.trim(), kind: "answer" as const }
        : { speaker: "interviewer" as const, content: t.content.trim(), kind: "question" as const }));
    if (mapped.length) state.transcript = mapped;

    const { evaluation } = await withAiRetry(() => evaluateInterview({
      config: state.config,
      transcript: state.transcript,
      brief: state.brief,
      department: state.department,
      jobDescription: state.jobDescription,
    }), { label: "interview.finalizeEval" });
    state.evaluation = evaluation;
    state.phase = "complete";

    await prisma.documentContent.update({ where: { documentId: docId }, data: { data: state as unknown as object } });
    return state;
  } finally {
    await prisma.document.update({ where: { id: docId }, data: { status: "READY" } }).catch(() => {});
  }
}

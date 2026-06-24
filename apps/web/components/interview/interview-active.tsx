"use client";

import { useState } from "react";
import type { QuestionItem } from "@studentos/ai";
import { InterviewAnswerPanel } from "@/components/interview/answer-panel";
import { InterviewCodePanel } from "@/components/interview/code-panel";
import { InterviewLiveSession } from "@/components/interview/live-session";

/** What the TYPED fallback panels need to render the current turn. */
export type InterviewView = {
  question: string;
  kind: "question" | "coding" | "answer";
  runnable: boolean;
};

/** What the LIVE VAPI session needs (resume-grounded questions injected via variableValues). */
export type InterviewLive = {
  role: string;
  candidateName: string;
  questions: QuestionItem[];
};

/**
 * The active-answer area. Two modes that share the SAME interview doc:
 *  - Live voice (default when VAPI is configured): an inline VAPI assistant conducts the whole
 *    interview from the pre-generated grounded questions; the transcript is evaluated on End.
 *  - Typed fallback (always works): the existing per-turn server-action panels.
 * "Cancel" in the lobby (or no VAPI key) drops to the verified typed flow.
 */
export function InterviewActive({ docId, view, live, isLast }: { docId: string; view: InterviewView; live: InterviewLive; isLast: boolean }) {
  const hasVoice = !!process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
  const [isLive, setIsLive] = useState(hasVoice);

  if (isLive) {
    return (
      <InterviewLiveSession
        docId={docId}
        role={live.role}
        candidateName={live.candidateName}
        questions={live.questions}
        onExit={() => setIsLive(false)}
      />
    );
  }

  const isCoding = view.kind === "coding";
  return (
    <div className="mt-5">
      {hasVoice ? (
        <button
          type="button"
          onClick={() => setIsLive(true)}
          className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl border border-cyan/30 bg-cyan/[0.06] py-2.5 text-[13px] font-semibold text-cyan transition-colors hover:bg-cyan/[0.12]"
        >
          🎥 Resume live voice interview <span className="font-normal text-faint">— camera &amp; mic required</span>
        </button>
      ) : null}

      {isCoding ? (
        <InterviewCodePanel docId={docId} question={view.question} runnable={view.runnable} isLast={isLast} />
      ) : (
        <InterviewAnswerPanel docId={docId} question={view.question} isCoding={false} isLast={isLast} />
      )}
    </div>
  );
}

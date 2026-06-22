"use client";

import { useState } from "react";
import { InterviewAnswerPanel } from "@/components/interview/answer-panel";
import { InterviewCodePanel } from "@/components/interview/code-panel";
import { InterviewLiveSession, type InterviewView } from "@/components/interview/live-session";

/**
 * The active-answer area. Two modes that share the SAME backend:
 *  - Typed (default, always works): the existing server-action panels.
 *  - Live voice (Phase D): a continuous VAPI call that speaks questions + hears answers, advancing
 *    via the JSON route without page reloads. Offered only when a VAPI key is configured.
 * Voice is never a hard dependency — "Type instead" / exit always falls back to the verified flow.
 */
export function InterviewActive({ docId, view, isLast }: { docId: string; view: InterviewView; isLast: boolean }) {
  const hasVoice = !!process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
  // When voice is configured, the camera-gated live interview is the DEFAULT path — the
  // interview should not proceed without camera + mic. The typed flow is only a fallback the
  // user reaches explicitly (Cancel in the lobby) or when voice isn't configured at all.
  const [live, setLive] = useState(hasVoice);

  if (live) {
    return <InterviewLiveSession docId={docId} initialView={view} onExit={() => setLive(false)} />;
  }

  const isCoding = view.kind === "coding";
  return (
    <div className="mt-5">
      {hasVoice ? (
        <button
          type="button"
          onClick={() => setLive(true)}
          className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl border border-cyan/30 bg-cyan/[0.06] py-2.5 text-[13px] font-semibold text-cyan transition-colors hover:bg-cyan/[0.12]"
        >
          🎥 Resume live voice interview <span className="font-normal text-faint">— camera &amp; mic required</span>
        </button>
      ) : null}

      {isCoding ? (
        <InterviewCodePanel docId={docId} runnable={view.runnable} isLast={isLast} />
      ) : (
        <InterviewAnswerPanel docId={docId} question={view.question} isCoding={false} isLast={isLast} />
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { submitAnswerAction } from "@/lib/actions/interview";
import { InterviewVoiceProbe } from "@/components/interview/voice-probe";
import { SubmitButton } from "@/components/ui/button";

const STUCK_MS = 150_000; // ~2.5 min with no activity → offer a nudge

export function InterviewAnswerPanel({ docId, question, isLast }: { docId: string; question: string; isLast: boolean }) {
  const [answer, setAnswer] = useState("");
  const [stuck, setStuck] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [hintLoading, setHintLoading] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Stuck-detection: reset a countdown on any activity; fire a nudge when idle too long.
  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setStuck(false);
    timerRef.current = setTimeout(() => setStuck(true), STUCK_MS);
  }, []);

  useEffect(() => {
    // Arms the idle-nudge countdown (an external setTimeout, not React state) whenever the
    // question changes — resetTimer's setStuck(false) call is syncing with that timer, not a
    // stale re-render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    resetTimer();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [resetTimer]);

  // Optional camera — local preview only; nothing is recorded or uploaded.
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function toggleCamera() {
    setCamError(null);
    if (camOn) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setCamOn(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCamOn(true);
    } catch {
      setCamError("Couldn't access the camera (permission denied or no device).");
    }
  }

  async function getHint() {
    setHintLoading(true);
    try {
      const res = await fetch("/api/interview/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docId }),
      });
      const data = (await res.json()) as { hint?: string; error?: string };
      setHint(data.hint ?? data.error ?? "No hint available.");
    } catch {
      setHint("Couldn't fetch a nudge right now.");
    } finally {
      setHintLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-3 rounded-2xl border border-line bg-card px-4 py-3">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-cyan">Interviewer asks</p>
        <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-soft">{question}</p>
      </div>

      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={toggleCamera}
          className="rounded-lg border border-line-strong bg-surface px-3 py-1.5 text-[12px] font-semibold text-soft transition-colors hover:border-cyan/40 hover:text-cyan"
        >
          {camOn ? "Turn off camera" : "📷 Practice with camera"}
        </button>
        {camOn ? <span className="text-[11px] text-faint">Local preview only — nothing is recorded.</span> : null}
      </div>

      {camOn ? (
        <video ref={videoRef} autoPlay muted playsInline className="mb-3 w-40 rounded-xl border border-line-strong" />
      ) : null}
      {camError ? <p className="mb-2 text-[11.5px] text-danger">{camError}</p> : null}

      {/* Stuck nudge */}
      {stuck ? (
        <div className="mb-3 rounded-xl border border-cyan/25 bg-cyan/[0.06] p-3.5">
          <p className="text-[12.5px] font-semibold text-cyan">Taking a while — want a nudge?</p>
          <p className="mt-0.5 text-[12px] text-muted">I&apos;ll help you structure your thinking, without giving the answer away.</p>
          {hint ? (
            <p className="mt-2 rounded-lg bg-surface/60 p-2.5 text-[12.5px] leading-relaxed text-soft">{hint}</p>
          ) : (
            <button
              type="button"
              onClick={getHint}
              disabled={hintLoading}
              className="mt-2 rounded-lg border border-cyan/35 bg-cyan/10 px-3 py-1.5 text-[12px] font-semibold text-cyan transition-colors hover:bg-cyan/20 disabled:opacity-60"
            >
              {hintLoading ? "Thinking…" : "Get a nudge →"}
            </button>
          )}
        </div>
      ) : null}

      <form action={submitAnswerAction} className="rounded-2xl border border-line bg-card p-4">
        <input type="hidden" name="docId" value={docId} />
        <label className="mb-1.5 block text-[12.5px] font-semibold text-muted">Your answer</label>
        <InterviewVoiceProbe question={question} onUseTranscript={(t) => { setAnswer((a) => (a ? `${a} ${t}` : t)); resetTimer(); }} />
        <textarea
          name="answer"
          required
          value={answer}
          onChange={(e) => { setAnswer(e.target.value); resetTimer(); }}
          rows={4}
          placeholder="Answer as you would out loud — be specific and structured…"
          className="w-full resize-none rounded-xl border border-line-strong bg-surface px-3.5 py-2.5 text-[13.5px] text-ink outline-none transition-colors focus:border-cyan/50 placeholder:text-faint"
        />
        <SubmitButton
          loadingText="Submitting…"
          className="mt-3 w-full rounded-xl bg-accent-gradient py-2.5 text-[13.5px] font-semibold text-on-accent shadow-[0_6px_18px_rgba(254,127,45,0.3)] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
        >
          {isLast ? "Submit & finish →" : "Submit answer →"}
        </SubmitButton>
      </form>
    </div>
  );
}

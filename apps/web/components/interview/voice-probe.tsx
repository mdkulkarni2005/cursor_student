"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Phase D — Stage 1 (voice probe). Validates the VAPI foundation before we build the continuous
 * flow: keys load, the SDK works in our bundle, audio in/out works, and the candidate's speech is
 * transcribed. It speaks the CURRENT question once and captures what the candidate says, which they
 * can drop into the normal answer box. It does NOT advance the interview (that's Stage 2).
 *
 * Option A: VAPI is voice transport only. The inline assistant is told to speak the question then
 * stay silent — our Claude state machine still owns the interview.
 *
 * Fully optional: no key / denied mic / SDK error → a calm message, the typed flow keeps working.
 */
type VapiMsg = { type?: string; role?: string; transcript?: string; transcriptType?: string };
type Status = "idle" | "connecting" | "live" | "ended" | "error";

const MAX_CALL_MS = 180_000; // auto-stop after 3 min so an open mic can't burn VAPI credits

export function InterviewVoiceProbe({ question, onUseTranscript }: { question: string; onUseTranscript: (text: string) => void }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vapiRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;

  function cleanup() {
    if (timerRef.current) clearTimeout(timerRef.current);
    try { vapiRef.current?.stop?.(); } catch { /* ignore */ }
    vapiRef.current = null;
  }
  useEffect(() => cleanup, []);

  async function start() {
    setError(null);
    setTranscript("");
    if (!publicKey) {
      setError("Voice isn't configured yet (missing VAPI key). You can still type your answer.");
      setStatus("error");
      return;
    }
    setStatus("connecting");
    try {
      const Vapi = (await import("@vapi-ai/web")).default;
      const vapi = new Vapi(publicKey);
      vapiRef.current = vapi;

      vapi.on("call-start", () => {
        setStatus("live");
        timerRef.current = setTimeout(() => stop(), MAX_CALL_MS);
      });
      vapi.on("call-end", () => { setStatus("ended"); if (timerRef.current) clearTimeout(timerRef.current); });
      vapi.on("error", (e: unknown) => {
        setError("Couldn't start the voice call — check mic permission, or just type your answer.");
        setStatus("error");
        console.warn("[vapi] error", e);
      });
      vapi.on("message", (msg: VapiMsg) => {
        // Capture only the candidate's FINAL speech transcript.
        if (msg.type === "transcript" && msg.role === "user" && msg.transcriptType === "final" && msg.transcript) {
          setTranscript((prev) => (prev ? `${prev} ${msg.transcript}` : msg.transcript!));
        }
      });

      // Inline (transient) assistant — speak the question, then stay silent (Option A).
      await vapi.start({
        firstMessage: question,
        model: {
          provider: "openai",
          model: "gpt-4o-mini",
          messages: [{
            role: "system",
            content: "You are the voice of an interview app. Speak ONLY the first message (the interview question) aloud, then stay COMPLETELY silent and just listen. Never ask follow-ups, never comment, never speak again.",
          }],
        },
        // Vapi's SDK types don't cover this transient-assistant shape.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
    } catch (e) {
      setError("Voice is unavailable right now — you can still type your answer.");
      setStatus("error");
      console.warn("[vapi] start failed", e);
    }
  }

  function stop() {
    if (timerRef.current) clearTimeout(timerRef.current);
    try { vapiRef.current?.stop?.(); } catch { /* ignore */ }
    setStatus((s) => (s === "live" || s === "connecting" ? "ended" : s));
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-2 rounded-lg border border-line-strong bg-surface px-3 py-1.5 text-[12px] font-semibold text-soft transition-colors hover:border-cyan/40 hover:text-cyan"
      >
        🎙️ Answer by voice <span className="font-normal text-faint">(beta)</span>
      </button>
    );
  }

  return (
    <div className="mb-3 rounded-xl border border-cyan/25 bg-cyan/[0.05] p-3.5">
      <div className="flex items-center justify-between">
        <p className="text-[12.5px] font-semibold text-cyan">Voice answer <span className="font-normal text-faint">(beta)</span></p>
        <button type="button" onClick={() => { stop(); setOpen(false); }} className="text-[11px] text-faint hover:text-soft">close</button>
      </div>

      <div className="mt-2 flex items-center gap-2">
        {status === "live" ? (
          <button type="button" onClick={stop} className="rounded-lg border border-danger/35 bg-danger/10 px-3 py-1.5 text-[12px] font-semibold text-danger">■ Stop</button>
        ) : (
          <button
            type="button"
            onClick={start}
            disabled={status === "connecting"}
            className="rounded-lg border border-cyan/35 bg-cyan/10 px-3 py-1.5 text-[12px] font-semibold text-cyan transition-colors hover:bg-cyan/20 disabled:opacity-60"
          >
            {status === "connecting" ? "Connecting…" : status === "ended" ? "🎙️ Speak again" : "🎙️ Start speaking"}
          </button>
        )}
        {status === "live" ? <span className="flex items-center gap-1.5 text-[11px] text-cyan"><span className="size-2 animate-pulse rounded-full bg-cyan" /> Listening — the question is being read aloud</span> : null}
      </div>

      {error ? <p className="mt-2 text-[11.5px] text-warning">{error}</p> : null}

      {transcript ? (
        <div className="mt-2.5">
          <p className="rounded-lg bg-surface/60 p-2.5 text-[12.5px] leading-relaxed text-soft">{transcript}</p>
          <button
            type="button"
            onClick={() => { onUseTranscript(transcript); stop(); setOpen(false); }}
            className="mt-2 rounded-lg bg-accent-gradient px-3 py-1.5 text-[12px] font-semibold text-on-accent"
          >
            Use this as my answer ↓
          </button>
        </div>
      ) : status === "live" ? (
        <p className="mt-2 text-[11.5px] text-faint">Speak your answer — your words will appear here.</p>
      ) : null}
    </div>
  );
}

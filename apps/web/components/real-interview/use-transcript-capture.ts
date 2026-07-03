"use client";

import { useEffect, useRef } from "react";

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: unknown) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechResultEvent = {
  resultIndex: number;
  results: {
    length: number;
    [i: number]: { isFinal: boolean; [j: number]: { transcript: string } };
  };
};

/**
 * Captures the LOCAL user's own speech only (Web Speech API) — never the remote participant's, and
 * never audio itself, only the resulting text. Each finalized utterance is POSTed as one transcript
 * line. Best-effort: unsupported browsers just don't capture, no error surfaced to the user.
 */
export function useTranscriptCapture(opts: { scheduleId: string; speaker: "candidate" | "recruiter"; active: boolean }) {
  const { scheduleId, speaker, active } = opts;
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    if (!active) return;

    const w = window as typeof window & {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return; // Unsupported browser — silently skip, never block the interview.

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-IN";

    recognition.onresult = (event) => {
      const e = event as SpeechResultEvent;
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        if (!result.isFinal) continue;
        const text = result[0]?.transcript?.trim();
        if (!text) continue;
        void fetch("/api/interview-room/transcript", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scheduleId, speaker, text }),
        }).catch(() => {});
      }
    };
    // Some browsers stop recognition after a pause — restart while the session is still active.
    recognition.onend = () => {
      if (active) recognition.start();
    };
    recognition.onerror = () => {};

    recognitionRef.current = recognition;
    recognition.start();

    return () => {
      recognition.onend = null;
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [active, scheduleId, speaker]);
}

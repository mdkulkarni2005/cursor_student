"use client";

import { useEffect } from "react";

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
 * Recruiter-side twin of apps/web's use-transcript-capture.ts. Small enough (~50 lines) that
 * duplicating beats sharing across the app boundary — see the plan's isolation note. Captures the
 * recruiter's OWN mic only, never the candidate's, and only text, never audio.
 */
export function useTranscriptCapture(opts: { scheduleId: string; active: boolean }) {
  const { scheduleId, active } = opts;

  useEffect(() => {
    if (!active) return;

    const w = window as typeof window & {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return;

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
          body: JSON.stringify({ scheduleId, text }),
        }).catch(() => {});
      }
    };
    recognition.onend = () => {
      if (active) recognition.start();
    };
    recognition.onerror = () => {};

    recognition.start();

    return () => {
      recognition.onend = null;
      recognition.stop();
    };
  }, [active, scheduleId]);
}

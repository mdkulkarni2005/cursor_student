"use client";

import { AnimationPanel, type CardAnimationProps } from "./animation-shell";

/**
 * Always-on centerpiece animations for the working-professionals ladder — same shell, panel
 * size, and "no static icon" rule as the branch ladder (`branch-effects.tsx`), themed to the
 * features professionals actually get: `requireStudentRoute` (apps/web/lib/user.ts) restricts
 * PROFESSIONAL users to mock interviews + DSA practice plus recruiter-driven messaging/live
 * rooms, so those four are exactly what's shown here — nothing aspirational.
 */

/* ---------------------------------------------------------------------------------------------
 * Mock Interviews: a mic with voice rings pulsing outward and a small audio-level equalizer —
 * reads as "someone is speaking and being heard," not a decorative pulse.
 * ------------------------------------------------------------------------------------------- */

export function MockInterviewAnimation({ rgb, className }: CardAnimationProps) {
  return (
    <AnimationPanel rgb={rgb} className={className}>
      <div className="relative flex flex-col items-center gap-7">
        <div className="relative flex size-16 items-center justify-center">
          {[0, 0.6, 1.2].map((delay) => (
            <span
              key={delay}
              className="voice-pulse absolute inset-0 rounded-full border-2"
              style={{ borderColor: `rgb(${rgb})`, animation: "voicePulse 1.8s ease-out infinite", animationDelay: `${delay}s` }}
            />
          ))}
          <svg viewBox="0 0 24 24" className="relative size-7" fill="none" stroke={`rgb(${rgb})`} strokeWidth={1.8}>
            <rect x="9" y="2" width="6" height="11" rx="3" />
            <path d="M5 11a7 7 0 0 0 14 0" strokeLinecap="round" />
            <path d="M12 18v3M9 21h6" strokeLinecap="round" />
          </svg>
        </div>
        <div className="flex items-end gap-1.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bar-bounce w-1.5 origin-bottom rounded-full"
              style={{
                height: 22,
                background: `rgb(${rgb})`,
                animation: `barBounce ${0.8 + (i % 3) * 0.15}s ease-in-out infinite`,
                animationDelay: `${i * 0.12}s`,
              }}
            />
          ))}
        </div>
      </div>
    </AnimationPanel>
  );
}

/* ---------------------------------------------------------------------------------------------
 * DSA Practice: a terminal running test cases to completion, on loop — the same "real execution,
 * not a streak counter" claim the copy makes, shown rather than just stated.
 * ------------------------------------------------------------------------------------------- */

const DSA_LINES = [
  "> Running test cases...",
  "> Test 1/5 ✓",
  "> Test 2/5 ✓",
  "> Test 3/5 ✓",
  "> Test 4/5 ✓",
  "> Test 5/5 ✓  All passed",
];
const DSA_LOOP_LINES = [...DSA_LINES, ...DSA_LINES];

export function DsaPracticeAnimation({ rgb, className }: CardAnimationProps) {
  return (
    <AnimationPanel rgb={rgb} className={className}>
      <div
        className="relative w-full max-w-[240px] overflow-hidden rounded-xl border p-3 font-mono text-[11px] leading-[1.9]"
        style={{ borderColor: `rgba(${rgb}, 0.35)`, background: `rgba(${rgb}, 0.06)`, height: 132 }}
      >
        <div className="mb-1.5 flex gap-1.5">
          <span className="size-2 rounded-full" style={{ background: `rgba(${rgb}, 0.5)` }} />
          <span className="size-2 rounded-full" style={{ background: `rgba(${rgb}, 0.35)` }} />
          <span className="size-2 rounded-full" style={{ background: `rgba(${rgb}, 0.25)` }} />
        </div>
        <div className="code-scroll" style={{ animation: "codeScroll 8s linear infinite", color: `rgba(${rgb}, 0.9)` }}>
          {DSA_LOOP_LINES.map((line, i) => (
            <div key={i} className="whitespace-nowrap">
              {line}
            </div>
          ))}
        </div>
      </div>
    </AnimationPanel>
  );
}

/* ---------------------------------------------------------------------------------------------
 * Recruiter Messaging: a direct chat thread scrolling by — a real conversation, not a "spam
 * inbox" or a generic bell icon.
 * ------------------------------------------------------------------------------------------- */

const MESSAGES: { from: "them" | "you"; text: string }[] = [
  { from: "them", text: "Loved your DSA score — open to a quick chat?" },
  { from: "you", text: "Yes, happy to talk this week." },
  { from: "them", text: "Great — sending an interview slot." },
  { from: "you", text: "Looking forward to it." },
];
const MESSAGE_LOOP = [...MESSAGES, ...MESSAGES];

export function RecruiterMessagingAnimation({ rgb, className }: CardAnimationProps) {
  return (
    <AnimationPanel rgb={rgb} className={className}>
      <div
        className="relative w-full max-w-[240px] overflow-hidden rounded-xl border p-3"
        style={{ borderColor: `rgba(${rgb}, 0.35)`, background: `rgba(${rgb}, 0.06)`, height: 150 }}
      >
        <div className="code-scroll flex flex-col gap-2" style={{ animation: "codeScroll 11s linear infinite" }}>
          {MESSAGE_LOOP.map((m, i) => (
            <div
              key={i}
              className={`max-w-[80%] rounded-2xl px-3 py-1.5 text-[11px] leading-snug ${m.from === "you" ? "ml-auto text-right" : ""}`}
              style={{
                background: m.from === "you" ? `rgba(${rgb}, 0.9)` : `rgba(${rgb}, 0.14)`,
                color: m.from === "you" ? "#fff" : `rgb(${rgb})`,
              }}
            >
              {m.text}
            </div>
          ))}
        </div>
      </div>
    </AnimationPanel>
  );
}

/* ---------------------------------------------------------------------------------------------
 * Live Interview Rooms: a code panel with a LIVE badge and two independently blinking carets —
 * two people editing the same file at once, not a video-call stock photo.
 * ------------------------------------------------------------------------------------------- */

const LIVE_CODE_LINES = ["function twoSum(nums, target) {", "  const seen = new Map();", "  for (let i = 0; i < nums.length; i++) {", "    ", "  }", "}"];

export function LiveInterviewAnimation({ rgb, className }: CardAnimationProps) {
  return (
    <AnimationPanel rgb={rgb} className={className}>
      <div
        className="relative w-full max-w-[240px] overflow-hidden rounded-xl border p-3 font-mono text-[11px] leading-[1.9]"
        style={{ borderColor: `rgba(${rgb}, 0.35)`, background: `rgba(${rgb}, 0.06)` }}
      >
        <div className="mb-2 flex items-center justify-between">
          <div className="flex gap-1.5">
            <span className="size-2 rounded-full" style={{ background: `rgba(${rgb}, 0.5)` }} />
            <span className="size-2 rounded-full" style={{ background: `rgba(${rgb}, 0.35)` }} />
            <span className="size-2 rounded-full" style={{ background: `rgba(${rgb}, 0.25)` }} />
          </div>
          <span
            className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold"
            style={{ color: `rgb(${rgb})`, background: `rgba(${rgb}, 0.14)` }}
          >
            <span className="chip-pulse inline-block size-1.5 rounded-full" style={{ background: `rgb(${rgb})`, animation: "chipPulse 1.4s ease-in-out infinite" }} />
            LIVE
          </span>
        </div>
        <div style={{ color: `rgba(${rgb}, 0.9)` }}>
          {LIVE_CODE_LINES.map((line, i) => (
            <div key={i} className="whitespace-pre">
              {line}
              {i === 1 && (
                <span className="caret-blink" style={{ animation: "caretBlink 1s step-end infinite", color: `rgb(${rgb})` }}>
                  ▌
                </span>
              )}
              {i === 3 && (
                <span className="caret-blink" style={{ animation: "caretBlink 1s step-end infinite", animationDelay: "0.5s", color: "#fff" }}>
                  ▌
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </AnimationPanel>
  );
}

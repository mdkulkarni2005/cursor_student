"use client";

import { useState, useEffect } from "react";
import { AnimationPanel, type CardAnimationProps } from "./animation-shell";

const M_MUTED = "#64748b";
const M_BG = "#0f172a";
const M_WHITE = "#e2e8f0";
const M_PURPLE = "#c084fc";
const M_BLUE = "#60a5fa";
const M_GREEN = "#86efac";
const M_YELLOW = "#fbbf24";
const M_ORANGE = "#fb923c";
const M_CYAN = "#22d3ee";
const M_RED = "#f87171";

/* ---------------------------------------------------------------------------------------------
 * Code-editor window shell with three dots and centered filename
 * ------------------------------------------------------------------------------------------- */

function WindowShell({ filename, children }: { filename: string; children: React.ReactNode }) {
  return (
    <div className="relative w-full rounded-xl p-2 font-mono text-[11px] leading-[1.7]" style={{ background: M_BG }}>
      <div className="relative flex items-center">
        <div className="flex pl-3 pt-3">
          <span className="mr-1.5 h-3 w-3 rounded-full" style={{ background: "#ef4444" }} />
          <span className="mr-1.5 h-3 w-3 rounded-full" style={{ background: "#a3a329" }} />
          <span className="h-3 w-3 rounded-full" style={{ background: "#22c55e" }} />
        </div>
        <span className="absolute inset-x-0 top-2.5 text-center text-[9px]" style={{ color: M_MUTED }}>
          {filename}
        </span>
      </div>
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------------------------------------
 * MockInterview: 3D animated person with mic, voice rings, equalizer — no code
 * ------------------------------------------------------------------------------------------- */

export function MockInterviewAnimation({ rgb, className }: CardAnimationProps) {
  return (
    <AnimationPanel rgb={rgb} className={className}>
      <div className="flex flex-col items-center gap-3">
        {/* Person with headset — pushed up */}
        <svg width="120" height="105" viewBox="0 0 100 90" fill="none" style={{ marginTop: -6 }}>
          {/* Head */}
          <ellipse cx="50" cy="28" rx="18" ry="20" fill={`rgba(${rgb}, 0.3)`} stroke={`rgb(${rgb})`} strokeWidth="2" />
          {/* Eyes */}
          <ellipse cx="43" cy="26" rx="2.5" ry="3" fill={`rgb(${rgb})`} />
          <ellipse cx="57" cy="26" rx="2.5" ry="3" fill={`rgb(${rgb})`} />
          {/* Headset band */}
          <path d="M32 24 Q32 6 50 6 Q68 6 68 24" fill="none" stroke={`rgb(${rgb})`} strokeWidth="2.5" strokeLinecap="round" />
          {/* Headset ear cups */}
          <rect x="28" y="22" width="7" height="12" rx="3.5" fill={`rgb(${rgb})`} />
          <rect x="65" y="22" width="7" height="12" rx="3.5" fill={`rgb(${rgb})`} />
          {/* Microphone arm + mic */}
          <path d="M30 30 Q22 34 24 44" fill="none" stroke={`rgb(${rgb})`} strokeWidth="2" strokeLinecap="round" />
          <ellipse cx="24" cy="47" rx="4" ry="5.5" fill={`rgb(${rgb})`} />
          {/* Body */}
          <path d="M36 48 Q36 42 50 42 Q64 42 64 48 L68 78 Q68 85 50 85 Q32 85 32 78 Z" fill={`rgba(${rgb}, 0.2)`} stroke={`rgb(${rgb})`} strokeWidth="1.5" />
          {/* Shoulders */}
          <path d="M36 48 Q24 50 18 60" fill="none" stroke={`rgb(${rgb})`} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M64 48 Q76 50 82 60" fill="none" stroke={`rgb(${rgb})`} strokeWidth="1.5" strokeLinecap="round" />
          {/* Speaking mouth */}
          <ellipse cx="50" cy="34" rx="3" ry="1.5" fill={`rgb(${rgb})`} opacity="0.5">
            <animate attributeName="ry" values="1.5;2.5;1.5" dur="0.8s" repeatCount="indefinite" />
          </ellipse>
        </svg>
        {/* Sound animations */}
        <div className="relative flex flex-col items-center gap-1.5">
          {/* Voice rings */}
          <div className="relative" style={{ width: 100, height: 28 }}>
            {[0, 0.5, 1].map((delay) => (
              <span key={delay} className="voice-pulse absolute left-1/2 top-0 -translate-x-1/2 rounded-full border-2" style={{ width: 24, height: 24, borderColor: `rgb(${rgb})`, animation: `voicePulse 1.8s ease-out infinite`, animationDelay: `${delay}s` }} />
            ))}
          </div>
          {/* Equalizer bars */}
          <div className="flex items-end gap-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="bar-bounce w-2 origin-bottom rounded-full" style={{ height: 20, background: `rgb(${rgb})`, animation: `barBounce ${0.8 + (i % 3) * 0.15}s ease-in-out infinite`, animationDelay: `${i * 0.12}s` }} />
            ))}
          </div>
        </div>
      </div>
    </AnimationPanel>
  );
}

/* ---------------------------------------------------------------------------------------------
 * DsaPractice: code-editor with typing animation, green checkmarks
 * ------------------------------------------------------------------------------------------- */

const DSA_LINES = [
  "const proof = build();",
  "run(tests) // 12 passed",
  'git commit -m "ship"',
  "score: 98/100",
];
const DSA_TOTAL_CHARS = DSA_LINES.reduce((s, l) => s + l.length + 1, 0);
const DSA_TYPE_SPEED = 40;
const DSA_PAUSE = 2000;
const DSA_ERASE = 12;

export function DsaPracticeAnimation({ rgb, className }: CardAnimationProps) {
  const [typed, setTyped] = useState(0);
  const [typing, setTyping] = useState(true);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    if (typing) {
      if (typed < DSA_TOTAL_CHARS) {
        t = setTimeout(() => setTyped((c) => c + 1), DSA_TYPE_SPEED);
      } else {
        t = setTimeout(() => setTyping(false), DSA_PAUSE);
      }
    } else {
      if (typed > 0) {
        t = setTimeout(() => setTyped((c) => c - 1), DSA_ERASE);
      } else {
        t = setTimeout(() => setTyping(true), 400);
      }
    }
    return () => clearTimeout(t);
  }, [typed, typing]);

  const flat: { char: string; color: string }[] = [];
  for (const line of DSA_LINES) {
    for (const ch of line) flat.push({ char: ch, color: M_WHITE });
    flat.push({ char: "\n", color: "" });
  }

  const visible = flat.slice(0, typed);
  const lines: string[] = [""];
  for (const s of visible) {
    if (s.char === "\n") lines.push("");
    else lines[lines.length - 1] += s.char;
  }
  const onLine = lines.length - 1;

  return (
    <AnimationPanel rgb={rgb} className={className}>
      <WindowShell filename="dsa-practice.ts">
        <div className="mt-4 px-4 pb-5" style={{ height: 180, overflow: "hidden" }}>
          <div style={{ color: M_GREEN }}>
            {lines.map((line, i) => (
              <div key={i} className="whitespace-pre">
                <span style={{ color: M_MUTED }}>{"> "}</span>
                <span>{line}</span>
                {i === onLine && (
                  <span className="caret-blink" style={{ animation: "caretBlink 1s step-end infinite", color: "#fff" }}>▌</span>
                )}
              </div>
            ))}
          </div>
          {/* Green checkmarks */}
          <div className="absolute right-3 top-10 flex flex-col gap-1">
            {[0, 1, 2].map((i) => (
              <span key={i} className="check-pop flex size-4 items-center justify-center rounded-full" style={{ background: `rgb(${rgb})`, animation: "checkPop 3s ease-in-out infinite", animationDelay: `${i * 0.8}s` }}>
                <svg viewBox="0 0 24 24" className="size-2.5" fill="none" stroke="#fff" strokeWidth={3}><polyline points="20 6 9 17 4 12" /></svg>
              </span>
            ))}
          </div>
        </div>
      </WindowShell>
    </AnimationPanel>
  );
}

/* ---------------------------------------------------------------------------------------------
 * RecruiterMessaging: code-editor with scrolling chat (cyan=recruiter, purple=student)
 * ------------------------------------------------------------------------------------------- */

const CHAT_MESSAGES = [
  { from: "recruiter", text: "Loved your DSA score — open to chat?" },
  { from: "student", text: "Yes, happy to talk this week." },
  { from: "recruiter", text: "Great — sending an interview slot." },
  { from: "student", text: "Looking forward to it." },
];
const CHAT_LOOP = [...CHAT_MESSAGES, ...CHAT_MESSAGES];

export function RecruiterMessagingAnimation({ rgb, className }: CardAnimationProps) {
  return (
    <AnimationPanel rgb={rgb} className={className}>
      <WindowShell filename="messages.chat">
        <div className="mt-4 px-4 pb-5" style={{ height: 180, overflow: "hidden" }}>
          <div className="code-scroll flex flex-col gap-2" style={{ animation: "codeScroll 10s linear infinite" }}>
            {CHAT_LOOP.map((m, i) => (
              <div key={i} className={`flex ${m.from === "student" ? "justify-end" : "justify-start"}`}>
                <div
                  className="max-w-[75%] rounded-xl px-2.5 py-1 text-[10px] leading-snug"
                  style={{
                    background: m.from === "recruiter" ? `rgba(${rgb}, 0.2)` : `rgba(139, 92, 246, 0.2)`,
                    color: m.from === "recruiter" ? `rgb(${rgb})` : M_PURPLE,
                  }}
                >
                  {m.text}
                </div>
              </div>
            ))}
          </div>
        </div>
      </WindowShell>
    </AnimationPanel>
  );
}

/* ---------------------------------------------------------------------------------------------
 * LiveInterview: code-editor with typing animation, VS Code colors, LIVE badge
 * ------------------------------------------------------------------------------------------- */

const LIVE_LINES = ["function twoSum(nums, target) {", "  const seen = new Map();", "  for (let i = 0; i < nums.length; i++) {", "    ", "  }", "}"];
const LIVE_TOTAL_CHARS = LIVE_LINES.reduce((s, l) => s + l.length + 1, 0);
const LIVE_TYPE_SPEED = 35;
const LIVE_PAUSE = 2500;
const LIVE_ERASE = 10;

export function LiveInterviewAnimation({ rgb, className }: CardAnimationProps) {
  const [typed, setTyped] = useState(0);
  const [typing, setTyping] = useState(true);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    if (typing) {
      if (typed < LIVE_TOTAL_CHARS) {
        t = setTimeout(() => setTyped((c) => c + 1), LIVE_TYPE_SPEED);
      } else {
        t = setTimeout(() => setTyping(false), LIVE_PAUSE);
      }
    } else {
      if (typed > 0) {
        t = setTimeout(() => setTyped((c) => c - 1), LIVE_ERASE);
      } else {
        t = setTimeout(() => setTyping(true), 400);
      }
    }
    return () => clearTimeout(t);
  }, [typed, typing]);

  const flat: { char: string; color: string }[] = [];
  for (const line of LIVE_LINES) {
    for (let j = 0; j < line.length; j++) {
      const ch = line[j]!;
      let color = M_WHITE;
      if (j < 2 && line.startsWith("fn")) color = M_PURPLE;
      else if (j < 10 && line.startsWith("function")) color = M_PURPLE;
      else if (line.includes("const")) color = M_PURPLE;
      else if (line.includes("new Map")) color = M_YELLOW;
      flat.push({ char: ch, color });
    }
    flat.push({ char: "\n", color: "" });
  }

  const visible = flat.slice(0, typed);
  const lines: string[] = [""];
  for (const s of visible) {
    if (s.char === "\n") lines.push("");
    else lines[lines.length - 1] += s.char;
  }
  const onLine = lines.length - 1;

  return (
    <AnimationPanel rgb={rgb} className={className}>
      <WindowShell filename="LiveInterview.tsx">
        <div className="mt-4 px-4 pb-5" style={{ height: 180, overflow: "hidden" }}>
          <div className="mb-2 flex items-center justify-end">
            <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold" style={{ color: `rgb(${rgb})`, background: `rgba(${rgb}, 0.14)` }}>
              <span className="chip-pulse inline-block size-1.5 rounded-full" style={{ background: `rgb(${rgb})`, animation: "chipPulse 1.4s ease-in-out infinite" }} />
              LIVE
            </span>
          </div>
          <div style={{ color: M_WHITE }}>
            {lines.map((line, i) => (
              <div key={i} className="whitespace-pre">
                <span style={{ color: M_PURPLE }}>{line.slice(0, line.indexOf("(") > 0 ? line.indexOf("(") : 0)}</span>
                <span>{line.slice(line.indexOf("(") > 0 ? line.indexOf("(") : 0)}</span>
                {i === onLine && (
                  <span className="caret-blink" style={{ animation: "caretBlink 1s step-end infinite", color: "#fff" }}>▌</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </WindowShell>
    </AnimationPanel>
  );
}

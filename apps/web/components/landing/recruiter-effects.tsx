"use client";

import { useState, useEffect } from "react";
import { AnimationPanel, type CardAnimationProps } from "./animation-shell";

const R_MUTED = "#64748b";
const R_BG = "#0f172a";
const R_WHITE = "#e2e8f0";
const R_PURPLE = "#c084fc";
const R_BLUE = "#60a5fa";
const R_GREEN = "#86efac";
const R_YELLOW = "#fbbf24";
const R_ORANGE = "#fb923c";
const R_CYAN = "#22d3ee";
const R_RED = "#f87171";

/* ---------------------------------------------------------------------------------------------
 * Code-editor window shell with three dots and centered filename
 * ------------------------------------------------------------------------------------------- */

function WindowShell({ filename, children }: { filename: string; children: React.ReactNode }) {
  return (
    <div className="relative w-full rounded-xl p-2 font-mono text-[11px] leading-[1.7]" style={{ background: R_BG }}>
      <div className="relative flex items-center">
        <div className="flex pl-3 pt-3">
          <span className="mr-1.5 h-3 w-3 rounded-full" style={{ background: "#ef4444" }} />
          <span className="mr-1.5 h-3 w-3 rounded-full" style={{ background: "#a3a329" }} />
          <span className="h-3 w-3 rounded-full" style={{ background: "#22c55e" }} />
        </div>
        <span className="absolute inset-x-0 top-2.5 text-center text-[9px]" style={{ color: R_MUTED }}>
          {filename}
        </span>
      </div>
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------------------------------------
 * CandidateSearch: code-editor with search bar + scrolling candidate rows
 * ------------------------------------------------------------------------------------------- */

const CANDIDATES = [
  { name: "A. Sharma", dept: "Computer Engg", dsa: 61 },
  { name: "R. Iyer", dept: "Electronics", dsa: 34 },
  { name: "K. Verma", dept: "Mechanical", dsa: 18 },
  { name: "S. Nair", dept: "Computer Engg", dsa: 47 },
];
const CANDIDATES_LOOP = [...CANDIDATES, ...CANDIDATES];

export function CandidateSearchAnimation({ rgb, className }: CardAnimationProps) {
  return (
    <AnimationPanel rgb={rgb} className={className}>
      <WindowShell filename="candidate-search.ts">
        <div className="mt-4 px-4 pb-5" style={{ height: 130, overflow: "hidden" }}>
          {/* Search bar */}
          <div className="mb-2 flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px]" style={{ borderColor: `rgba(${rgb}, 0.3)`, color: `rgba(${rgb}, 0.8)` }}>
            <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth={2.2}>
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
            </svg>
            <span style={{ color: R_MUTED }}>Department, DSA activity...</span>
          </div>
          {/* Scrolling candidates */}
          <div className="code-scroll flex flex-col gap-1.5" style={{ animation: "codeScroll 9s linear infinite" }}>
            {CANDIDATES_LOOP.map((c, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[10px]" style={{ background: `rgba(${rgb}, 0.1)` }}>
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full text-[8px] font-bold" style={{ background: `rgba(${rgb}, 0.85)`, color: "#fff" }}>
                  {c.name[0]}
                </span>
                <span className="flex-1 truncate font-semibold" style={{ color: `rgb(${rgb})` }}>{c.name}</span>
                <span className="truncate" style={{ color: R_MUTED }}>{c.dept}</span>
                <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold" style={{ background: `rgba(${rgb}, 0.18)`, color: `rgb(${rgb})` }}>
                  {c.dsa} DSA
                </span>
              </div>
            ))}
          </div>
        </div>
      </WindowShell>
    </AnimationPanel>
  );
}

/* ---------------------------------------------------------------------------------------------
 * VerifiedProfile: code-editor with profile rows + green checkmark pop animation
 * ------------------------------------------------------------------------------------------- */

const PROFILE_ROWS = [
  { label: "DSA problems solved", value: "61" },
  { label: "Verified projects", value: "3" },
  { label: "Resume", value: "ATS-ready" },
  { label: "Avg. interview score", value: "8.2 / 10" },
];

export function VerifiedProfileAnimation({ rgb, className }: CardAnimationProps) {
  return (
    <AnimationPanel rgb={rgb} className={className}>
      <WindowShell filename="verified-profile.ts">
        <div className="mt-4 px-4 pb-5" style={{ height: 130, overflow: "hidden" }}>
          <div className="mb-3 flex items-center gap-2">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold" style={{ background: `rgba(${rgb}, 0.85)`, color: "#fff" }}>
              AS
            </span>
            <span className="text-[12px] font-semibold" style={{ color: `rgb(${rgb})` }}>A. Sharma</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {PROFILE_ROWS.map((row, i) => (
              <div key={row.label} className="flex items-center justify-between text-[10px]">
                <span className="flex items-center gap-1.5" style={{ color: R_MUTED }}>
                  <span className="check-pop flex size-3.5 shrink-0 items-center justify-center rounded-full" style={{ background: `rgb(${rgb})`, animation: "checkPop 4s ease-in-out infinite", animationDelay: `${i * 0.5}s` }}>
                    <svg viewBox="0 0 24 24" className="size-2" fill="none" stroke="#fff" strokeWidth={4}><polyline points="20 6 9 17 4 12" /></svg>
                  </span>
                  {row.label}
                </span>
                <span className="font-semibold" style={{ color: `rgb(${rgb})` }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </WindowShell>
    </AnimationPanel>
  );
}

/* ---------------------------------------------------------------------------------------------
 * RecruiterDirectMessage: code-editor with scrolling chat (cyan/purple)
 * ------------------------------------------------------------------------------------------- */

const DM_MESSAGES = [
  { from: "recruiter", text: "Loved your DSA score — open to chat?" },
  { from: "student", text: "Yes, happy to talk this week." },
  { from: "recruiter", text: "Great — sending an interview slot." },
  { from: "student", text: "Looking forward to it." },
];
const DM_LOOP = [...DM_MESSAGES, ...DM_MESSAGES];

export function RecruiterDirectMessageAnimation({ rgb, className }: CardAnimationProps) {
  return (
    <AnimationPanel rgb={rgb} className={className}>
      <WindowShell filename="messages.chat">
        <div className="mt-4 px-4 pb-5" style={{ height: 130, overflow: "hidden" }}>
          <div className="code-scroll flex flex-col gap-2" style={{ animation: "codeScroll 10s linear infinite" }}>
            {DM_LOOP.map((m, i) => (
              <div key={i} className={`flex ${m.from === "student" ? "justify-end" : "justify-start"}`}>
                <div
                  className="max-w-[75%] rounded-xl px-2.5 py-1 text-[10px] leading-snug"
                  style={{
                    background: m.from === "recruiter" ? `rgba(${rgb}, 0.2)` : `rgba(139, 92, 246, 0.2)`,
                    color: m.from === "recruiter" ? `rgb(${rgb})` : R_PURPLE,
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
 * LiveInterviewRecruiter: code-editor with typing animation + AI insight chip
 * ------------------------------------------------------------------------------------------- */

const REC_LIVE_LINES = ["function twoSum(nums, target) {", "  const seen = new Map();", "  for (let i = 0; i < nums.length; i++) {", "    ", "  }", "}"];
const REC_LIVE_TOTAL_CHARS = REC_LIVE_LINES.reduce((s, l) => s + l.length + 1, 0);
const REC_LIVE_TYPE_SPEED = 35;
const REC_LIVE_PAUSE = 2500;
const REC_LIVE_ERASE = 10;

export function LiveInterviewRecruiterAnimation({ rgb, className }: CardAnimationProps) {
  const [typed, setTyped] = useState(0);
  const [typing, setTyping] = useState(true);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    if (typing) {
      if (typed < REC_LIVE_TOTAL_CHARS) {
        t = setTimeout(() => setTyped((c) => c + 1), REC_LIVE_TYPE_SPEED);
      } else {
        t = setTimeout(() => setTyping(false), REC_LIVE_PAUSE);
      }
    } else {
      if (typed > 0) {
        t = setTimeout(() => setTyped((c) => c - 1), REC_LIVE_ERASE);
      } else {
        t = setTimeout(() => setTyping(true), 400);
      }
    }
    return () => clearTimeout(t);
  }, [typed, typing]);

  const flat: { char: string; color: string }[] = [];
  for (const line of REC_LIVE_LINES) {
    for (const ch of line) flat.push({ char: ch, color: R_WHITE });
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
        <div className="mt-4 px-4 pb-5" style={{ height: 130, overflow: "hidden" }}>
          <div className="mb-2 flex items-center justify-end">
            <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold" style={{ color: `rgb(${rgb})`, background: `rgba(${rgb}, 0.14)` }}>
              <span className="chip-pulse inline-block size-1.5 rounded-full" style={{ background: `rgb(${rgb})`, animation: "chipPulse 1.4s ease-in-out infinite" }} />
              LIVE
            </span>
          </div>
          <div style={{ color: R_WHITE }}>
            {lines.map((line, i) => (
              <div key={i} className="whitespace-pre">
                <span>{line}</span>
                {i === onLine && (
                  <span className="caret-blink" style={{ animation: "caretBlink 1s step-end infinite", color: "#fff" }}>▌</span>
                )}
              </div>
            ))}
          </div>
          {/* AI insight chip */}
          <div className="check-pop mt-2 rounded-lg px-2 py-1 text-[9px] font-medium" style={{ background: `rgba(${rgb}, 0.14)`, color: `rgb(${rgb})`, animation: "checkPop 5s ease-in-out infinite", animationDelay: "1.5s" }}>
            AI: strong problem decomposition ✓
          </div>
        </div>
      </WindowShell>
    </AnimationPanel>
  );
}

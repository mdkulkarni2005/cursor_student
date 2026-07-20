"use client";

import { AnimationPanel, type CardAnimationProps } from "./animation-shell";

/**
 * Always-on centerpiece animations for the recruiter ladder — same shell/rules as
 * `branch-effects.tsx` and `professional-effects.tsx`. Themed to what `apps/recruiter` actually
 * ships: candidate search (`/students`, `listVisibleStudents`), verified profiles
 * (`getStudentDetail`: DSA count, projects, resume, interview score), direct messaging
 * (`RecruiterMessage`), and live interview rooms (`/interviews/[id]`, LiveKit). Nothing here is
 * aspirational — no dashboard/analytics or DSA-score-threshold filters are shown because those
 * aren't shipped.
 */

/* ---------------------------------------------------------------------------------------------
 * Candidate Search & Discovery: a search bar with a scrolling feed of matching candidates — the
 * department/name filtering that actually exists, not a fabricated "smart match" score.
 * ------------------------------------------------------------------------------------------- */

const CANDIDATE_ROWS = [
  { name: "A. Sharma", dept: "Computer Engg", dsa: 61 },
  { name: "R. Iyer", dept: "Electronics", dsa: 34 },
  { name: "K. Verma", dept: "Mechanical", dsa: 18 },
  { name: "S. Nair", dept: "Computer Engg", dsa: 47 },
];
const CANDIDATE_ROWS_LOOP = [...CANDIDATE_ROWS, ...CANDIDATE_ROWS];

export function CandidateSearchAnimation({ rgb, className }: CardAnimationProps) {
  return (
    <AnimationPanel rgb={rgb} className={className}>
      <div
        className="relative w-full max-w-[240px] overflow-hidden rounded-xl border p-3"
        style={{ borderColor: `rgba(${rgb}, 0.35)`, background: `rgba(${rgb}, 0.06)`, height: 150 }}
      >
        <div
          className="mb-2 flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[10.5px]"
          style={{ borderColor: `rgba(${rgb}, 0.3)`, color: `rgba(${rgb}, 0.8)` }}
        >
          <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth={2.2}>
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
          </svg>
          Department, DSA activity...
        </div>
        <div className="code-scroll flex flex-col gap-1.5" style={{ animation: "codeScroll 9s linear infinite" }}>
          {CANDIDATE_ROWS_LOOP.map((c, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[10.5px]"
              style={{ background: `rgba(${rgb}, 0.1)` }}
            >
              <span
                className="flex size-5 shrink-0 items-center justify-center rounded-full text-[8px] font-bold"
                style={{ background: `rgba(${rgb}, 0.85)`, color: "#fff" }}
              >
                {c.name[0]}
              </span>
              <span className="flex-1 truncate font-semibold" style={{ color: `rgb(${rgb})` }}>
                {c.name}
              </span>
              <span className="truncate text-faint">{c.dept}</span>
              <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold" style={{ background: `rgba(${rgb}, 0.18)`, color: `rgb(${rgb})` }}>
                {c.dsa} DSA
              </span>
            </div>
          ))}
        </div>
      </div>
    </AnimationPanel>
  );
}

/* ---------------------------------------------------------------------------------------------
 * Verified Profiles: a candidate card whose proof-of-work rows check off one by one — DSA count,
 * verified projects, resume, interview score — exactly what `getStudentDetail` returns.
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
      <div
        className="relative w-full max-w-[240px] rounded-xl border p-3.5"
        style={{ borderColor: `rgba(${rgb}, 0.35)`, background: `rgba(${rgb}, 0.06)` }}
      >
        <div className="mb-3 flex items-center gap-2">
          <span
            className="flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
            style={{ background: `rgba(${rgb}, 0.85)`, color: "#fff" }}
          >
            AS
          </span>
          <span className="text-[12px] font-semibold" style={{ color: `rgb(${rgb})` }}>
            A. Sharma
          </span>
        </div>
        <div className="flex flex-col gap-1.5">
          {PROFILE_ROWS.map((row, i) => (
            <div key={row.label} className="flex items-center justify-between text-[10.5px]">
              <span className="flex items-center gap-1.5 text-faint">
                <span
                  className="check-pop flex size-3.5 shrink-0 items-center justify-center rounded-full"
                  style={{
                    background: `rgb(${rgb})`,
                    animation: "checkPop 4s ease-in-out infinite",
                    animationDelay: `${i * 0.5}s`,
                  }}
                >
                  <svg viewBox="0 0 24 24" className="size-2" fill="none" stroke="#fff" strokeWidth={4}>
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                {row.label}
              </span>
              <span className="font-semibold" style={{ color: `rgb(${rgb})` }}>
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </AnimationPanel>
  );
}

/* ---------------------------------------------------------------------------------------------
 * Direct Messaging: the recruiter side of the same conversation shown on the professional
 * ladder — proof this is one real thread, not two different products.
 * ------------------------------------------------------------------------------------------- */

const RECRUITER_MESSAGES: { from: "you" | "them"; text: string }[] = [
  { from: "you", text: "Loved your DSA score — open to a quick chat?" },
  { from: "them", text: "Yes, happy to talk this week." },
  { from: "you", text: "Great — sending an interview slot." },
  { from: "them", text: "Looking forward to it." },
];
const RECRUITER_MESSAGE_LOOP = [...RECRUITER_MESSAGES, ...RECRUITER_MESSAGES];

export function RecruiterDirectMessageAnimation({ rgb, className }: CardAnimationProps) {
  return (
    <AnimationPanel rgb={rgb} className={className}>
      <div
        className="relative w-full max-w-[240px] overflow-hidden rounded-xl border p-3"
        style={{ borderColor: `rgba(${rgb}, 0.35)`, background: `rgba(${rgb}, 0.06)`, height: 150 }}
      >
        <div className="code-scroll flex flex-col gap-2" style={{ animation: "codeScroll 11s linear infinite" }}>
          {RECRUITER_MESSAGE_LOOP.map((m, i) => (
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
 * Live Interview Rooms: the recruiter's view of the same room — a LIVE code panel plus an AI
 * insight chip fading in, reflecting the AI-assisted judgment recruiters get post-interview.
 * ------------------------------------------------------------------------------------------- */

const RECRUITER_LIVE_LINES = ["function twoSum(nums, target) {", "  const seen = new Map();", "  for (let i = 0; i < nums.length; i++) {", "    ", "  }", "}"];

export function LiveInterviewRecruiterAnimation({ rgb, className }: CardAnimationProps) {
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
          {RECRUITER_LIVE_LINES.map((line, i) => (
            <div key={i} className="whitespace-pre">
              {line}
              {i === 1 && (
                <span className="caret-blink" style={{ animation: "caretBlink 1s step-end infinite", color: `rgb(${rgb})` }}>
                  ▌
                </span>
              )}
            </div>
          ))}
        </div>
        <div
          className="check-pop mt-2 rounded-lg px-2 py-1 text-[9.5px] font-medium"
          style={{
            background: `rgba(${rgb}, 0.14)`,
            color: `rgb(${rgb})`,
            animation: "checkPop 5s ease-in-out infinite",
            animationDelay: "1.5s",
          }}
        >
          AI: strong problem decomposition ✓
        </div>
      </div>
    </AnimationPanel>
  );
}

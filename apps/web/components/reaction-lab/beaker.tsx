"use client";

import type { ReactionEffect } from "@/lib/reaction-lab/types";

/** The animated glass beaker — liquid color transitions instantly (color-change), rising bubbles
 *  (gas), settling particles (precipitate), or a shaking/smoking blast overlay (explosive). */
export function Beaker({ liquidColor, effect, active }: { liquidColor: string; effect: ReactionEffect | null; active: boolean }) {
  return (
    <div className={`relative flex h-64 w-48 items-end justify-center ${active && effect === "explosive" ? "animate-screen-shake" : ""}`}>
      {/* Glass beaker outline */}
      <svg viewBox="0 0 120 160" className="absolute inset-0 h-full w-full">
        <path d="M30 8 H90 V40 L104 140 A10 10 0 01 94 152 H26 A10 10 0 01 16 140 L30 40 Z" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={3} />
        <path d="M24 6 H96" stroke="rgba(255,255,255,0.35)" strokeWidth={3} strokeLinecap="round" />
      </svg>

      {/* Liquid fill */}
      <div
        className="absolute bottom-[8px] left-[18px] right-[18px] rounded-b-[14px] transition-colors duration-700"
        style={{ height: "58%", background: liquidColor, opacity: 0.88 }}
      >
        {active && effect === "gas" ? (
          <>
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className="animate-bubble-rise absolute rounded-full bg-white/70"
                style={{ left: `${12 + i * 16}%`, bottom: 4, width: 6 + (i % 3) * 3, height: 6 + (i % 3) * 3, animationDelay: `${i * 0.25}s` }}
              />
            ))}
          </>
        ) : null}

        {active && effect === "precipitate" ? (
          <>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <span
                key={i}
                className="animate-precipitate-fall absolute rounded-full bg-white/80"
                style={{ left: `${10 + i * 14}%`, top: 6, width: 5, height: 5, animationDelay: `${i * 0.08}s` }}
              />
            ))}
          </>
        ) : null}
      </div>

      {active && effect === "explosive" ? (
        <>
          <div className="pointer-events-none absolute inset-0 rounded-full bg-danger/40 blur-2xl" />
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="animate-smoke-puff pointer-events-none absolute bottom-16 left-1/2 h-16 w-16 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(120,120,120,0.9),transparent_70%)]"
              style={{ animationDelay: `${i * 0.35}s` }}
            />
          ))}
        </>
      ) : null}
    </div>
  );
}

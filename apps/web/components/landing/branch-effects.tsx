"use client";

import { useState, useEffect } from "react";
import { usePrefersReducedMotion, AnimationPanel, type CardAnimationProps } from "./animation-shell";

type BranchAnimationProps = CardAnimationProps;

const B_MUTED = "#64748b";
const B_BG = "#0f172a";

/* ---------------------------------------------------------------------------------------------
 * Code-editor window shell with three dots and centered filename
 * ------------------------------------------------------------------------------------------- */

function WindowShell({ filename, children }: { filename: string; children: React.ReactNode }) {
  return (
    <div className="relative w-full rounded-xl p-2 font-mono text-[11px] leading-[1.7]" style={{ background: B_BG }}>
      <div className="relative flex items-center">
        <div className="flex pl-3 pt-3">
          <span className="mr-1.5 h-3 w-3 rounded-full" style={{ background: "#ef4444" }} />
          <span className="mr-1.5 h-3 w-3 rounded-full" style={{ background: "#a3a329" }} />
          <span className="h-3 w-3 rounded-full" style={{ background: "#22c55e" }} />
        </div>
        <span className="absolute inset-x-0 top-2.5 text-center text-[9px]" style={{ color: B_MUTED }}>
          {filename}
        </span>
      </div>
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------------------------------------
 * Mechanical: animated gears only
 * ------------------------------------------------------------------------------------------- */

type Point = { x: number; y: number };

function polar(cx: number, cy: number, r: number, angle: number): Point {
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

function gearPath(cx: number, cy: number, teeth: number, outerR: number, innerR: number, toothWidthRatio = 0.46) {
  const step = (Math.PI * 2) / teeth;
  const halfTooth = (step * toothWidthRatio) / 2;
  const points: Point[] = [];
  for (let i = 0; i < teeth; i++) {
    const center = i * step;
    points.push(polar(cx, cy, outerR, center - halfTooth));
    points.push(polar(cx, cy, outerR, center + halfTooth));
    points.push(polar(cx, cy, innerR, center + step / 2));
  }
  const [first, ...rest] = points;
  return `M ${first!.x.toFixed(2)} ${first!.y.toFixed(2)} ` + rest.map((p) => `L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ") + " Z";
}

type GearSpec = { cx: number; cy: number; teeth: number; outerR: number; innerR: number; speed: 1 | -1 };

const MECHANICAL_GEARS: GearSpec[] = [
  { cx: 76, cy: 116, teeth: 13, outerR: 42, innerR: 33, speed: 1 },
  { cx: 126, cy: 74, teeth: 9, outerR: 27, innerR: 20.5, speed: -1 },
  { cx: 100, cy: 158, teeth: 7, outerR: 17, innerR: 12.5, speed: -1 },
];

function Gear({ spec, rgb, baseDuration, opacity }: { spec: GearSpec; rgb: string; baseDuration: number; opacity: number }) {
  const duration = (baseDuration * 42) / spec.outerR;
  return (
    <g
      className="gear-rotor"
      style={{ transformBox: "fill-box", transformOrigin: "center", animation: `gearSpin ${duration.toFixed(2)}s linear infinite ${spec.speed < 0 ? "reverse" : "normal"}` }}
    >
      <path d={gearPath(spec.cx, spec.cy, spec.teeth, spec.outerR, spec.innerR)} fill={`rgba(${rgb}, ${opacity})`} stroke={`rgba(${rgb}, 1)`} strokeWidth={1.4} strokeLinejoin="round" />
      <circle cx={spec.cx} cy={spec.cy} r={spec.innerR * 0.42} fill="none" stroke={`rgba(${rgb}, 0.9)`} strokeWidth={2.5} />
    </g>
  );
}

export function MechanicalAnimation({ rgb, className }: BranchAnimationProps) {
  return (
    <AnimationPanel rgb={rgb} className={className}>
      <WindowShell filename="gear-sim.ts">
        <div className="mt-4 flex items-center justify-center px-4 pb-5" style={{ height: 130, overflow: "hidden" }}>
          <svg viewBox="20 20 160 160" className="opacity-30" style={{ width: "100%", height: "100%" }}>
            <Gear spec={MECHANICAL_GEARS[0]!} rgb={rgb} baseDuration={18} opacity={0.6} />
            <Gear spec={MECHANICAL_GEARS[1]!} rgb={rgb} baseDuration={18} opacity={0.6} />
            <Gear spec={MECHANICAL_GEARS[2]!} rgb={rgb} baseDuration={18} opacity={0.6} />
          </svg>
        </div>
      </WindowShell>
    </AnimationPanel>
  );
}

/* ---------------------------------------------------------------------------------------------
 * Civil: blueprint drawing only
 * ------------------------------------------------------------------------------------------- */

const CIVIL_PATHS = [
  { d: "M40 165 H160", delay: 0 },
  { d: "M60 165 V95", delay: 0.15 },
  { d: "M100 165 V80", delay: 0.25 },
  { d: "M140 165 V95", delay: 0.35 },
  { d: "M55 130 H145", delay: 0.55 },
  { d: "M55 95 H145", delay: 0.7 },
  { d: "M60 80 L100 55 L140 80", delay: 0.95 },
];

export function CivilAnimation({ rgb, className }: BranchAnimationProps) {
  return (
    <AnimationPanel rgb={rgb} className={className}>
      <WindowShell filename="structural.py">
        <div className="mt-4 flex items-center justify-center px-4 pb-5" style={{ height: 130, overflow: "hidden" }}>
          <svg viewBox="20 30 160 150" className="opacity-25" style={{ width: "100%", height: "100%" }}>
            {CIVIL_PATHS.map((p, i) => (
              <path key={i} d={p.d} className="blueprint-path" fill="none" stroke={`rgb(${rgb})`} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"
                style={{ strokeDasharray: 220, animation: `blueprintDraw 5.2s ease-in-out infinite`, animationDelay: `${p.delay}s` }} />
            ))}
          </svg>
        </div>
      </WindowShell>
    </AnimationPanel>
  );
}

/* ---------------------------------------------------------------------------------------------
 * Electrical: circuit with current flow only
 * ------------------------------------------------------------------------------------------- */

const ELECTRICAL_WIRE = "M20 130 C 55 60, 85 200, 120 100 S 165 40, 190 90";

export function ElectricalAnimation({ rgb, className }: BranchAnimationProps) {
  const reducedMotion = usePrefersReducedMotion();
  return (
    <AnimationPanel rgb={rgb} className={className}>
      <WindowShell filename="circuit.js">
        <div className="mt-4 flex items-center justify-center px-4 pb-5" style={{ height: 130, overflow: "hidden" }}>
          <svg viewBox="10 20 190 160" className="opacity-25" style={{ width: "100%", height: "100%" }}>
            <path d={ELECTRICAL_WIRE} fill="none" stroke={`rgb(${rgb})`} strokeWidth={3} strokeLinecap="round"
              style={{ strokeDasharray: "10 8", animation: "currentFlow 0.7s linear infinite" }} />
            {!reducedMotion && [0, 0.9].map((offset, i) => (
              <circle key={i} r={4} fill={`rgb(${rgb})`}>
                <animateMotion dur="2.4s" begin={`${offset}s`} repeatCount="indefinite" path={ELECTRICAL_WIRE} />
              </circle>
            ))}
          </svg>
        </div>
      </WindowShell>
    </AnimationPanel>
  );
}

/* ---------------------------------------------------------------------------------------------
 * Electronics: PCB traces with signal dots only
 * ------------------------------------------------------------------------------------------- */

const CIRCUIT_TRACES = [
  "M20 40 H80 V90",
  "M180 30 H120 V90",
  "M20 170 H70 V120",
  "M185 160 H130 V120",
];

export function ElectronicsAnimation({ rgb, className }: BranchAnimationProps) {
  const reducedMotion = usePrefersReducedMotion();
  return (
    <AnimationPanel rgb={rgb} className={className}>
      <WindowShell filename="firmware.c">
        <div className="mt-4 flex items-center justify-center px-4 pb-5" style={{ height: 130, overflow: "hidden" }}>
          <svg viewBox="10 20 190 160" className="opacity-25" style={{ width: "100%", height: "100%" }}>
            {CIRCUIT_TRACES.map((d, i) => (
              <path key={i} d={d} fill="none" stroke={`rgb(${rgb})`} strokeWidth={2.5} strokeLinecap="round" />
            ))}
            {!reducedMotion && CIRCUIT_TRACES.map((d, i) => (
              <circle key={i} r={3.5} fill={`rgb(${rgb})`}>
                <animateMotion dur="2.2s" begin={`${i * 0.35}s`} repeatCount="indefinite" path={d} />
              </circle>
            ))}
          </svg>
        </div>
      </WindowShell>
    </AnimationPanel>
  );
}

/* ---------------------------------------------------------------------------------------------
 * Chemical: flask with bubbles only
 * ------------------------------------------------------------------------------------------- */

const CHEMICAL_BUBBLES = [
  { x: 88, delay: 0, duration: 3.4 },
  { x: 104, delay: 0.8, duration: 3.0 },
  { x: 96, delay: 1.6, duration: 3.8 },
  { x: 112, delay: 2.2, duration: 3.2 },
];

export function ChemicalAnimation({ rgb, className }: BranchAnimationProps) {
  return (
    <AnimationPanel rgb={rgb} className={className}>
      <WindowShell filename="reaction.py">
        <div className="mt-4 flex items-center justify-center px-4 pb-5" style={{ height: 130, overflow: "hidden" }}>
          <svg viewBox="20 20 160 160" className="opacity-25" style={{ width: "100%", height: "100%" }}>
            <path d="M92 40 H108 V78 L138 148 Q142 165 124 165 H76 Q58 165 62 148 L92 78 Z" fill={`rgba(${rgb}, 0.06)`} stroke={`rgb(${rgb})`} strokeWidth={3} strokeLinejoin="round" />
            <path d="M84 38 H116" stroke={`rgb(${rgb})`} strokeWidth={3} strokeLinecap="round" />
            <rect x={55} y={110} width={90} height={60} fill={`rgba(${rgb}, 0.28)`} className="liquid-sway" style={{ animation: "liquidSway 2.4s ease-in-out infinite" }} />
            {CHEMICAL_BUBBLES.map((b, i) => (
              <circle key={i} cx={b.x} cy={155} r={4} fill={`rgba(${rgb}, 0.8)`} className="bubble"
                style={{ animation: `bubbleRise ${b.duration}s ease-in infinite`, animationDelay: `${b.delay}s` }} />
            ))}
          </svg>
        </div>
      </WindowShell>
    </AnimationPanel>
  );
}

/* ---------------------------------------------------------------------------------------------
 * Computer: terminal output only
 * ------------------------------------------------------------------------------------------- */

const COMP_LINES = [
  "const proof = build();",
  "run(tests) // 12 passed",
  'git commit -m "ship"',
  "score: 98/100",
];
const COMP_TOTAL_CHARS = COMP_LINES.reduce((s, l) => s + l.length + 1, 0);
const COMP_TYPE_SPEED = 40;
const COMP_PAUSE = 2000;
const COMP_ERASE = 12;

export function ComputerAnimation({ rgb, className }: BranchAnimationProps) {
  const [typed, setTyped] = useState(0);
  const [typing, setTyping] = useState(true);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    if (typing) {
      if (typed < COMP_TOTAL_CHARS) {
        t = setTimeout(() => setTyped((c) => c + 1), COMP_TYPE_SPEED);
      } else {
        t = setTimeout(() => setTyping(false), COMP_PAUSE);
      }
    } else {
      if (typed > 0) {
        t = setTimeout(() => setTyped((c) => c - 1), COMP_ERASE);
      } else {
        t = setTimeout(() => setTyping(true), 400);
      }
    }
    return () => clearTimeout(t);
  }, [typed, typing]);

  const flat: { char: string; color: string }[] = [];
  for (const line of COMP_LINES) {
    for (const ch of line) flat.push({ char: ch, color: "#86efac" });
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
      <WindowShell filename="terminal.sh">
        <div className="mt-4 px-4 pb-5" style={{ height: 130, overflow: "hidden" }}>
          <div style={{ color: "#86efac" }}>
            {lines.map((line, i) => (
              <div key={i} className="whitespace-pre">
                <span style={{ color: B_MUTED }}>{"> "}</span>
                <span>{line}</span>
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

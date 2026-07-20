"use client";

import { usePrefersReducedMotion, AnimationPanel, type CardAnimationProps } from "./animation-shell";

/**
 * Always-on, per-branch centerpiece animations for the branch ladder — these REPLACE the
 * static department icon entirely, not decorate it. Each one fills the same panel the icon used
 * to occupy, so swapping branches in `root-landing.tsx` is a drop-in. Built as inline SVG driven
 * by CSS transforms/SMIL wherever the effect is a clean geometric motion — crisper at any size,
 * and cheap enough to run continuously rather than only on hover. Shares `AnimationPanel` (see
 * `animation-shell.tsx`) with the professional-ladder animations so both sections read as one
 * coherent system.
 */

type BranchAnimationProps = CardAnimationProps;

/* ---------------------------------------------------------------------------------------------
 * Mechanical: three interlocking gears turning at matched relative speed — the big one slow and
 * deliberate, the small ones quick — reads as machinery under load, not decoration for its own sake.
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
      style={{
        transformBox: "fill-box",
        transformOrigin: "center",
        animation: `gearSpin ${duration.toFixed(2)}s linear infinite ${spec.speed < 0 ? "reverse" : "normal"}`,
      }}
    >
      <path
        d={gearPath(spec.cx, spec.cy, spec.teeth, spec.outerR, spec.innerR)}
        fill={`rgba(${rgb}, ${opacity})`}
        stroke={`rgba(${rgb}, 1)`}
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
      <circle cx={spec.cx} cy={spec.cy} r={spec.innerR * 0.42} fill="none" stroke={`rgba(${rgb}, 0.9)`} strokeWidth={2.5} />
    </g>
  );
}

export function MechanicalAnimation({ rgb, className }: BranchAnimationProps) {
  return (
    <AnimationPanel rgb={rgb} className={className}>
      <svg viewBox="20 20 160 160" className="relative size-full max-w-[220px]" aria-hidden="true">
        <Gear spec={MECHANICAL_GEARS[0]!} rgb={rgb} baseDuration={18} opacity={0.22} />
        <Gear spec={MECHANICAL_GEARS[1]!} rgb={rgb} baseDuration={18} opacity={0.9} />
        <Gear spec={MECHANICAL_GEARS[2]!} rgb={rgb} baseDuration={18} opacity={0.9} />
      </svg>
    </AnimationPanel>
  );
}

/* ---------------------------------------------------------------------------------------------
 * Civil: a wireframe structure (foundation → columns → slabs → roof truss) that draws itself in,
 * holds, then erases and redraws — a blueprint under continuous construction.
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
      <svg viewBox="20 30 160 150" className="relative size-full max-w-[220px]" aria-hidden="true">
        {CIVIL_PATHS.map((p, i) => (
          <path
            key={i}
            d={p.d}
            className="blueprint-path"
            fill="none"
            stroke={`rgba(${rgb}, 1)`}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              strokeDasharray: 220,
              animation: `blueprintDraw 5.2s ease-in-out infinite`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </svg>
    </AnimationPanel>
  );
}

/* ---------------------------------------------------------------------------------------------
 * Electrical: current flowing through a wire (marching dashes) into a bulb that glows on the
 * same rhythm, plus pulse-dots physically travelling the wire — power flowing, not sparking.
 * ------------------------------------------------------------------------------------------- */

const ELECTRICAL_WIRE = "M20 130 C 55 60, 85 200, 120 100 S 165 40, 190 90";

export function ElectricalAnimation({ rgb, className }: BranchAnimationProps) {
  const reducedMotion = usePrefersReducedMotion();
  return (
    <AnimationPanel rgb={rgb} className={className}>
      <svg viewBox="10 20 190 160" className="relative size-full max-w-[220px]" aria-hidden="true">
        <path
          d={ELECTRICAL_WIRE}
          className="current-flow"
          fill="none"
          stroke={`rgba(${rgb}, 0.9)`}
          strokeWidth={3}
          strokeLinecap="round"
          style={{ strokeDasharray: "10 8", animation: "currentFlow 0.7s linear infinite" }}
        />
        {!reducedMotion &&
          [0, 0.9].map((offset, i) => (
            <circle key={i} r={4} fill={`rgba(${rgb}, 1)`}>
              <animateMotion dur="2.4s" begin={`${offset}s`} repeatCount="indefinite" path={ELECTRICAL_WIRE} />
            </circle>
          ))}
        <g transform="translate(150, 118)" className="bulb-glow" style={{ color: `rgb(${rgb})`, animation: "bulbGlow 1.8s ease-in-out infinite" }}>
          <circle r={16} fill="none" stroke="currentColor" strokeWidth={2.5} />
          <path d="M-6 -8 L-2 -2 L2 -8 L6 -2" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M-2 -2 V6" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
          <path d="M-5 16 L5 16 M-4 21 L4 21" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
        </g>
      </svg>
    </AnimationPanel>
  );
}

/* ---------------------------------------------------------------------------------------------
 * Electronics & Telecom: right-angle PCB traces carrying pulses inward to a central chip, which
 * pulses in turn — a live circuit board rather than a lightning motif.
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
      <svg viewBox="10 20 190 160" className="relative size-full max-w-[220px]" aria-hidden="true">
        {CIRCUIT_TRACES.map((d, i) => (
          <path key={i} d={d} fill="none" stroke={`rgba(${rgb}, 0.35)`} strokeWidth={2.5} strokeLinecap="round" />
        ))}
        {!reducedMotion &&
          CIRCUIT_TRACES.map((d, i) => (
            <circle key={i} r={3.5} fill={`rgba(${rgb}, 1)`}>
              <animateMotion dur="2.2s" begin={`${i * 0.35}s`} repeatCount="indefinite" path={d} />
            </circle>
          ))}
        <g transform="translate(100, 100)">
          <rect x={-24} y={-24} width={48} height={48} rx={6} fill={`rgba(${rgb}, 0.16)`} stroke={`rgba(${rgb}, 1)`} strokeWidth={2} className="chip-pulse" style={{ animation: "chipPulse 2.2s ease-in-out infinite" }} />
          {[-14, 0, 14].map((o) => (
            <g key={o}>
              <line x1={-24} y1={o} x2={-30} y2={o} stroke={`rgba(${rgb}, 0.7)`} strokeWidth={2} />
              <line x1={24} y1={o} x2={30} y2={o} stroke={`rgba(${rgb}, 0.7)`} strokeWidth={2} />
            </g>
          ))}
        </g>
      </svg>
    </AnimationPanel>
  );
}

/* ---------------------------------------------------------------------------------------------
 * Chemical: a flask with a gently swaying liquid line and bubbles rising and popping through it —
 * a reaction in progress.
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
      <svg viewBox="20 20 160 160" className="relative size-full max-w-[220px]" aria-hidden="true">
        <clipPath id="flask-clip">
          <path d="M92 40 H108 V78 L138 148 Q142 165 124 165 H76 Q58 165 62 148 L92 78 Z" />
        </clipPath>
        <path
          d="M92 40 H108 V78 L138 148 Q142 165 124 165 H76 Q58 165 62 148 L92 78 Z"
          fill={`rgba(${rgb}, 0.06)`}
          stroke={`rgba(${rgb}, 1)`}
          strokeWidth={3}
          strokeLinejoin="round"
        />
        <path d="M84 38 H116" stroke={`rgba(${rgb}, 1)`} strokeWidth={3} strokeLinecap="round" />
        <g clipPath="url(#flask-clip)">
          <rect x={55} y={110} width={90} height={60} fill={`rgba(${rgb}, 0.28)`} className="liquid-sway" style={{ animation: "liquidSway 2.4s ease-in-out infinite" }} />
          {CHEMICAL_BUBBLES.map((b, i) => (
            <circle
              key={i}
              cx={b.x}
              cy={155}
              r={4}
              fill={`rgba(${rgb}, 0.8)`}
              className="bubble"
              style={{ animation: `bubbleRise ${b.duration}s ease-in infinite`, animationDelay: `${b.delay}s` }}
            />
          ))}
        </g>
      </svg>
    </AnimationPanel>
  );
}

/* ---------------------------------------------------------------------------------------------
 * Computer Engineering & IT: a terminal window with code lines scrolling past and a blinking
 * caret — the one motif that's genuinely clearer as styled text than as an SVG illustration.
 * ------------------------------------------------------------------------------------------- */

const CODE_LINES = [
  "> const proof = build();",
  "> run(tests) // 12 passed",
  "> git commit -m \"ship\"",
  "> score: 98/100",
  "> const proof = build();",
  "> run(tests) // 12 passed",
  "> git commit -m \"ship\"",
  "> score: 98/100",
];

export function ComputerAnimation({ rgb, className }: BranchAnimationProps) {
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
        <div className="code-scroll" style={{ animation: "codeScroll 9s linear infinite", color: `rgba(${rgb}, 0.9)` }}>
          {CODE_LINES.map((line, i) => (
            <div key={i} className="whitespace-nowrap">
              {line}
              {i === 3 && <span className="caret-blink" style={{ animation: "caretBlink 1s step-end infinite" }}>▌</span>}
            </div>
          ))}
        </div>
      </div>
    </AnimationPanel>
  );
}

"use client";

import { useState, useEffect } from "react";
import { usePrefersReducedMotion, AnimationPanel, type CardAnimationProps } from "./animation-shell";

type BranchAnimationProps = CardAnimationProps;

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
      <div className="flex size-full items-center justify-center" style={{ maxWidth: 120, maxHeight: 120, marginTop: -50 }}>
        <svg viewBox="20 20 160 160" className="opacity-70" style={{ width: "100%", height: "100%" }}>
          <Gear spec={MECHANICAL_GEARS[0]!} rgb="226,232,240" baseDuration={18} opacity={0.7} />
          <Gear spec={MECHANICAL_GEARS[1]!} rgb="226,232,240" baseDuration={18} opacity={0.7} />
          <Gear spec={MECHANICAL_GEARS[2]!} rgb="226,232,240" baseDuration={18} opacity={0.7} />
        </svg>
      </div>
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
      <div className="flex size-full items-center justify-center" style={{ maxWidth: 120, maxHeight: 120, marginTop: -50 }}>
        <svg viewBox="20 30 160 150" className="opacity-60" style={{ width: "100%", height: "100%" }}>
          {CIVIL_PATHS.map((p, i) => (
            <path key={i} d={p.d} className="blueprint-path" fill="none" stroke="#e2e8f0" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"
              style={{ strokeDasharray: 220, animation: `blueprintDraw 5.2s ease-in-out infinite`, animationDelay: `${p.delay}s` }} />
          ))}
        </svg>
      </div>
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
      <div className="flex size-full items-center justify-center" style={{ maxWidth: 120, maxHeight: 120, marginTop: -50 }}>
        <svg viewBox="10 20 190 160" className="opacity-60" style={{ width: "100%", height: "100%" }}>
          <path d={ELECTRICAL_WIRE} fill="none" stroke="#e2e8f0" strokeWidth={3} strokeLinecap="round"
            style={{ strokeDasharray: "10 8", animation: "currentFlow 0.7s linear infinite" }} />
          {!reducedMotion && [0, 0.9].map((offset, i) => (
            <circle key={i} r={4} fill="#e2e8f0">
              <animateMotion dur="2.4s" begin={`${offset}s`} repeatCount="indefinite" path={ELECTRICAL_WIRE} />
            </circle>
          ))}
        </svg>
      </div>
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
      <div className="flex size-full items-center justify-center" style={{ maxWidth: 120, maxHeight: 120, marginTop: -50 }}>
        <svg viewBox="10 20 190 160" className="opacity-60" style={{ width: "100%", height: "100%" }}>
          {CIRCUIT_TRACES.map((d, i) => (
            <path key={i} d={d} fill="none" stroke="#e2e8f0" strokeWidth={2.5} strokeLinecap="round" />
          ))}
          {!reducedMotion && CIRCUIT_TRACES.map((d, i) => (
            <circle key={i} r={3.5} fill="#e2e8f0">
              <animateMotion dur="2.2s" begin={`${i * 0.35}s`} repeatCount="indefinite" path={d} />
            </circle>
          ))}
        </svg>
      </div>
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
      <div className="flex size-full items-center justify-center" style={{ maxWidth: 120, maxHeight: 120, marginTop: -50 }}>
        <svg viewBox="20 20 160 160" className="opacity-60" style={{ width: "100%", height: "100%" }}>
          <path d="M92 40 H108 V78 L138 148 Q142 165 124 165 H76 Q58 165 62 148 L92 78 Z" fill={`rgba(${rgb}, 0.06)`} stroke="#e2e8f0" strokeWidth={3} strokeLinejoin="round" />
          <path d="M84 38 H116" stroke="#e2e8f0" strokeWidth={3} strokeLinecap="round" />
          <rect x={55} y={110} width={90} height={60} fill={`rgba(${rgb}, 0.28)`} className="liquid-sway" style={{ animation: "liquidSway 2.4s ease-in-out infinite" }} />
          {CHEMICAL_BUBBLES.map((b, i) => (
            <circle key={i} cx={b.x} cy={155} r={4} fill="#e2e8f0" className="bubble"
              style={{ animation: `bubbleRise ${b.duration}s ease-in infinite`, animationDelay: `${b.delay}s` }} />
          ))}
        </svg>
      </div>
    </AnimationPanel>
  );
}

/* ---------------------------------------------------------------------------------------------
 * Computer: algorithm visualization with nodes and edges
 * ------------------------------------------------------------------------------------------- */

export function ComputerAnimation({ rgb, className }: BranchAnimationProps) {
  const [activeNode, setActiveNode] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActiveNode((c) => (c + 1) % 6), 1500);
    return () => clearInterval(t);
  }, []);

  const nodes = [
    { x: 70, y: 20 },
    { x: 35, y: 50 },
    { x: 105, y: 50 },
    { x: 20, y: 85 },
    { x: 55, y: 85 },
    { x: 90, y: 85 },
  ];

  const edges = [
    [0, 1], [0, 2], [1, 3], [1, 4], [2, 5],
  ];

  return (
    <AnimationPanel rgb={rgb} className={className}>
      <div className="flex size-full items-center justify-center" style={{ maxWidth: 120, maxHeight: 120, marginTop: -50 }}>
        <svg viewBox="0 0 125 105" className="opacity-70" style={{ width: "100%", height: "100%" }}>
          {edges.map(([a, b], i) => (
            <line
              key={i}
              x1={nodes[a]!.x} y1={nodes[a]!.y}
              x2={nodes[b]!.x} y2={nodes[b]!.y}
              stroke="#e2e8f0"
              strokeWidth="1.5"
              opacity={i === activeNode ? "0.8" : "0.3"}
              style={{ transition: "opacity 0.3s ease" }}
            />
          ))}
          {nodes.map((n, i) => (
            <g key={i}>
              <circle
                cx={n.x} cy={n.y} r="10"
                fill={i === activeNode ? `rgb(${rgb})` : "rgba(226,232,240,0.2)"}
                stroke={i === activeNode ? `rgb(${rgb})` : "#e2e8f0"}
                strokeWidth="1.5"
                style={{ transition: "fill 0.3s ease" }}
              />
              <text x={n.x} y={n.y + 3} textAnchor="middle" fill={i === activeNode ? "#fff" : "#e2e8f0"} fontSize="8" fontWeight="700">
                {String.fromCharCode(65 + i)}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </AnimationPanel>
  );
}

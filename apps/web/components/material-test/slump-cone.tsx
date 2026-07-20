"use client";

import { useMemo } from "react";
import type { SlumpShape } from "@/lib/material-test/slump";

const W = 200;
const H = 220;
const FILLED_POINTS = `${20},${H} ${W - 20},${H} ${W - 60},20 60,20`;

function settledPoints(slumpMm: number, shape: SlumpShape): string {
  if (shape === "collapse" || slumpMm > 150) {
    return `0,${H} ${W},${H} ${W},${H - 20} 0,${H - 20}`;
  }
  const drop = Math.min(slumpMm, 150);
  if (shape === "shear") {
    const leftTopY = 20 + drop * 0.4;
    const rightTopY = 20 + drop * 1.7;
    return `${20},${H} ${W - 20},${H} ${W - 55},${rightTopY} 65,${leftTopY}`;
  }
  const spread = (drop / 150) * 30;
  const topY = 20 + drop;
  return `${20},${H} ${W - 20},${H} ${W - 60 + spread / 2},${topY} ${60 - spread / 2},${topY}`;
}

/** Animated slump-cone test rig — a dashed mould outline (lifts away on "run") over a solid concrete mass whose clip-path morphs from the full mould shape to the settled shape. */
export function SlumpCone({ slumpMm, shape, phase }: { slumpMm: number; shape: SlumpShape; phase: "idle" | "settled" }) {
  const points = useMemo(() => (phase === "settled" ? settledPoints(slumpMm, shape) : FILLED_POINTS), [phase, slumpMm, shape]);

  return (
    <div className="relative" style={{ width: W, height: H }}>
      <div
        className="absolute inset-0 transition-[clip-path] duration-700 ease-out"
        style={{ clipPath: `polygon(${points})`, background: "linear-gradient(180deg, #9a9a9a, #6b6b6b)" }}
      />
      <svg
        viewBox={`0 0 ${W} ${H + 20}`}
        className={`absolute inset-0 transition-transform duration-500 ease-in ${phase === "settled" ? "-translate-y-6 opacity-40" : ""}`}
        style={{ width: W, height: H + 20 }}
      >
        <path d={`M20 ${H} L${W - 20} ${H} L${W - 60} 20 L60 20 Z`} fill="none" stroke="var(--color-blueprint)" strokeWidth={2} strokeDasharray="5 4" />
      </svg>
    </div>
  );
}

"use client";

import { useMemo } from "react";

/** Generic dynamic-curve chart — samples `fn` over [xMin,xMax] and marks the current point.
 *  Shared across all four Property Lookup graphs (boiling point, density, molarity, dilution),
 *  the same "one primitive, many uses" pattern as ScopeTrace. */
export function PropertyChart({
  fn,
  xMin,
  xMax,
  xCurrent,
  xLabel,
  yLabel,
  color = "#ff7a45",
}: {
  fn: (x: number) => number;
  xMin: number;
  xMax: number;
  xCurrent: number;
  xLabel: string;
  yLabel: string;
  color?: string;
}) {
  const width = 400;
  const height = 140;
  const pad = 8;

  const { points, markerX, markerY, yCurrent } = useMemo(() => {
    const N = 60;
    const xs = Array.from({ length: N + 1 }, (_, i) => xMin + ((xMax - xMin) * i) / N);
    const ys = xs.map(fn);
    const yMin = Math.min(...ys);
    const yMax = Math.max(...ys);
    const yRange = yMax - yMin || 1;

    const toX = (x: number) => pad + ((x - xMin) / (xMax - xMin)) * (width - 2 * pad);
    const toY = (y: number) => height - pad - ((y - yMin) / yRange) * (height - 2 * pad);

    const pts = xs.map((x, i) => `${toX(x).toFixed(1)},${toY(ys[i]!).toFixed(1)}`).join(" ");
    const yc = fn(xCurrent);
    return { points: pts, markerX: toX(xCurrent), markerY: toY(yc), yCurrent: yc };
  }, [fn, xMin, xMax, xCurrent]);

  return (
    <div className="rounded-lg border border-line/70 bg-surface p-2.5">
      <div className="mb-1 flex items-center justify-between text-[10.5px] text-faint">
        <span>{xLabel}</span>
        <span className="font-mono font-bold" style={{ color }}>
          {yLabel} = {yCurrent.toFixed(3)}
        </span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
        <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="rgba(255,122,69,0.15)" strokeWidth={1} />
        <polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" opacity={0.85} />
        <circle cx={markerX} cy={markerY} r={4.5} fill={color} stroke="#170d06" strokeWidth={1.5} />
      </svg>
    </div>
  );
}

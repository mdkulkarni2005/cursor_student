"use client";

import type { TracePoint } from "@/lib/load-diagram/beam";

const WIDTH = 800;
const HEIGHT = 200;
const PAD_X = 36;
const PAD_TOP = 14;
const PAD_BOTTOM = 26;

/** SFD/BMD trace — a filled line chart with an auto-scaled y domain (values, unlike a scope trace, aren't bounded to [-1,1]) and a marker on the peak. */
export function DiagramTrace({
  data,
  span,
  peak,
  label,
  unit,
  color,
}: {
  data: TracePoint[];
  span: number;
  peak: TracePoint;
  label: string;
  unit: string;
  color: string;
}) {
  const values = data.map((d) => d.y);
  const rawMax = Math.max(...values, 0);
  const rawMin = Math.min(...values, 0);
  const range = rawMax - rawMin || 1;
  const yMax = rawMax + range * 0.12;
  const yMin = rawMin - range * 0.12;

  const plotW = WIDTH - PAD_X * 2;
  const plotH = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const scaleX = (x: number) => PAD_X + (span > 0 ? (x / span) * plotW : 0);
  const scaleY = (y: number) => PAD_TOP + ((yMax - y) / (yMax - yMin)) * plotH;
  const zeroY = scaleY(0);

  const linePoints = data.map((d) => `${scaleX(d.x).toFixed(1)},${scaleY(d.y).toFixed(1)}`).join(" ");
  const fillPoints = `${scaleX(0).toFixed(1)},${zeroY.toFixed(1)} ${linePoints} ${scaleX(span).toFixed(1)},${zeroY.toFixed(1)}`;

  const peakX = scaleX(peak.x);
  const peakY = scaleY(peak.y);

  return (
    <div className="rounded-lg border border-line bg-card p-2">
      <div className="mb-1 flex items-center justify-between">
        <p className="font-mono text-[10.5px] font-bold uppercase tracking-wide text-muted">{label}</p>
        <p className="font-mono text-[11px] font-bold" style={{ color }}>
          peak {peak.y >= 0 ? "+" : ""}
          {peak.y.toFixed(2)} {unit} @ {peak.x.toFixed(2)}m
        </p>
      </div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" preserveAspectRatio="none">
        {Array.from({ length: 9 }, (_, i) => (
          <line key={i} x1={PAD_X + (i / 8) * plotW} y1={PAD_TOP} x2={PAD_X + (i / 8) * plotW} y2={HEIGHT - PAD_BOTTOM} stroke="var(--color-line)" strokeWidth={1} />
        ))}
        <line x1={PAD_X} y1={zeroY} x2={WIDTH - PAD_X} y2={zeroY} stroke="var(--color-dim)" strokeWidth={1.2} strokeDasharray="3 3" />
        <polygon points={fillPoints} fill={color} opacity={0.14} stroke="none" />
        <polyline points={linePoints} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={peakX} cy={peakY} r={3.5} fill={color} stroke="var(--color-card)" strokeWidth={1.5} />
        <text x={PAD_X} y={HEIGHT - 8} fill="var(--color-faint)" stroke="none" fontSize={9.5}>
          0m
        </text>
        <text x={WIDTH - PAD_X} y={HEIGHT - 8} textAnchor="end" fill="var(--color-faint)" stroke="none" fontSize={9.5}>
          {span.toFixed(1)}m
        </text>
      </svg>
    </div>
  );
}

"use client";

/** Oscilloscope-style trace — a single polyline over a phosphor-green scanline grid. */
export function ScopeTrace({ samples, label, color = "#7cff6b" }: { samples: number[]; label: string; color?: string }) {
  const width = 800;
  const height = 160;
  const points = samples
    .map((v, i) => {
      const x = (i / (samples.length - 1)) * width;
      const y = height / 2 - v * (height / 2 - 8);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <div className="rounded-lg border-2 border-line/80 bg-[#050f08] p-2">
      <p className="mb-1 font-mono text-[10.5px] font-bold uppercase tracking-wide text-scope/80">{label}</p>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="none">
        <line x1={0} y1={height / 2} x2={width} y2={height / 2} stroke="rgba(124,255,107,0.15)" strokeWidth={1} />
        {Array.from({ length: 9 }, (_, i) => (
          <line key={i} x1={(i / 8) * width} y1={0} x2={(i / 8) * width} y2={height} stroke="rgba(124,255,107,0.06)" strokeWidth={1} />
        ))}
        <polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    </div>
  );
}

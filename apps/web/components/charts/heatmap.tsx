"use client";

import { Fragment } from "react";

/** Generic labeled grid heatmap — cell color/label are fully caller-supplied so it works for both attention weights (0..1) and correlation matrices (-1..1). */
export function Heatmap({
  rowLabels,
  colLabels,
  values,
  cellColor,
  cellLabel,
  title,
}: {
  rowLabels: string[];
  colLabels: string[];
  values: number[][];
  cellColor: (value: number) => string;
  cellLabel?: (value: number) => string;
  title?: string;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-surface/40 p-3">
      {title ? <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">{title}</p> : null}
      <div className="inline-grid" style={{ gridTemplateColumns: `auto repeat(${colLabels.length}, minmax(44px, 1fr))` }}>
        <div />
        {colLabels.map((label, i) => (
          <div key={i} className="flex items-end justify-center px-1 pb-1 text-[10.5px] font-semibold text-muted">
            <span className="max-w-[64px] truncate" title={label}>{label}</span>
          </div>
        ))}
        {rowLabels.map((rowLabel, r) => (
          <Fragment key={`row-${r}`}>
            <div className="flex items-center justify-end pr-2 text-[10.5px] font-semibold text-muted">
              <span className="max-w-[100px] truncate" title={rowLabel}>{rowLabel}</span>
            </div>
            {values[r].map((v, c) => (
              <div
                key={`cell-${r}-${c}`}
                className="m-[1px] flex aspect-square min-h-[32px] items-center justify-center rounded-[3px] text-[10px] font-semibold"
                style={{ backgroundColor: cellColor(v), color: Math.abs(v) > 0.55 ? "#fff" : "var(--color-ink, #0f172a)" }}
                title={`${rowLabel} → ${colLabels[c]}: ${v.toFixed(2)}`}
              >
                {cellLabel ? cellLabel(v) : v.toFixed(2)}
              </div>
            ))}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

"use client";

import { REAGENTS } from "@/lib/reaction-lab/catalog";
import type { ReagentId } from "@/lib/reaction-lab/types";

export function Shelf({ selected, onToggle }: { selected: ReagentId[]; onToggle: (id: ReagentId) => void }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-3">
      <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wide text-muted">Reagent Shelf</p>
      <div className="grid grid-cols-2 gap-2">
        {REAGENTS.map((r) => {
          const isSelected = selected.includes(r.id);
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => onToggle(r.id)}
              className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-[12px] font-medium transition-colors ${
                isSelected ? "border-flask bg-flask/10 text-ink" : "border-line bg-surface text-ink hover:border-flask/40"
              }`}
            >
              <span className="size-4 shrink-0 rounded-full border border-line/60" style={{ background: r.color }} />
              <span className="flex flex-col leading-tight">
                <span>{r.name}</span>
                <span className="text-[10px] text-faint">{r.formula}</span>
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 px-1 text-[11px] leading-relaxed text-faint">Select two reagents, then click Mix.</p>
    </div>
  );
}

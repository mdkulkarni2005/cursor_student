"use client";

import { CIRCUIT_COMPONENT_TYPES } from "@/lib/circuits/component-defaults";
import { CircuitSymbol } from "@/components/circuits/circuit-symbol";

export function Palette() {
  function onDragStart(e: React.DragEvent, kind: string) {
    e.dataTransfer.setData("application/x-circuit-kind", kind);
    e.dataTransfer.effectAllowed = "move";
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-line bg-card p-3">
      <p className="px-1 text-[11px] font-bold uppercase tracking-wide text-muted">Components</p>
      {CIRCUIT_COMPONENT_TYPES.map((c) => (
        <div
          key={c.kind}
          draggable
          onDragStart={(e) => onDragStart(e, c.kind)}
          className="flex cursor-grab items-center gap-2.5 rounded-xl border border-line bg-surface px-3 py-2.5 text-[13px] font-medium text-ink transition-colors hover:border-cyan/40 active:cursor-grabbing"
        >
          <span className="flex w-10 shrink-0 items-center justify-center text-muted">
            <CircuitSymbol kind={c.kind} />
          </span>
          {c.label}
        </div>
      ))}
      <p className="mt-1 px-1 text-[11.5px] leading-relaxed text-faint">
        Drag components onto the grid, wire terminals together, set values, then click Run.
      </p>
    </div>
  );
}

"use client";

import { GATE_COMPONENT_TYPES } from "@/lib/logic-sim/gate-defaults";
import { GateSymbol } from "@/components/logic-sim/gate-symbol";

export function Palette() {
  function onDragStart(e: React.DragEvent, kind: string) {
    e.dataTransfer.setData("application/x-logic-kind", kind);
    e.dataTransfer.effectAllowed = "move";
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-line bg-card p-3">
      <p className="px-1 text-[11px] font-bold uppercase tracking-wide text-muted">Gates</p>
      {GATE_COMPONENT_TYPES.map((g) => (
        <div
          key={g.kind}
          draggable
          onDragStart={(e) => onDragStart(e, g.kind)}
          className="flex cursor-grab items-center gap-2.5 rounded-xl border border-line bg-surface px-3 py-2.5 text-[13px] font-medium text-ink transition-colors hover:border-scope/40 active:cursor-grabbing"
        >
          <span className="flex w-9 shrink-0 items-center justify-center text-muted">
            <GateSymbol kind={g.kind} />
          </span>
          {g.label}
        </div>
      ))}
      <p className="mt-1 px-1 text-[11.5px] leading-relaxed text-faint">
        Drag gates onto the bench, wire terminals together, toggle switches, then click Run.
      </p>
    </div>
  );
}

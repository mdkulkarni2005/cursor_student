"use client";

import { SYSTEM_DESIGN_COMPONENT_TYPES } from "@/components/system-design/component-types";

/** Drag a component onto the canvas — sets the dataTransfer payload the canvas reads on drop. */
export function Palette() {
  function onDragStart(e: React.DragEvent, kind: string) {
    e.dataTransfer.setData("application/x-system-design-kind", kind);
    e.dataTransfer.effectAllowed = "move";
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-line bg-card p-3">
      <p className="px-1 text-[11px] font-bold uppercase tracking-wide text-muted">Components</p>
      {SYSTEM_DESIGN_COMPONENT_TYPES.map((c) => (
        <div
          key={c.kind}
          draggable
          onDragStart={(e) => onDragStart(e, c.kind)}
          className="flex cursor-grab items-center gap-2.5 rounded-xl border border-line bg-surface px-3 py-2.5 text-[13px] font-medium text-ink transition-colors hover:border-cyan/40 active:cursor-grabbing"
        >
          <span className="text-[16px]">{c.emoji}</span>
          {c.label}
        </div>
      ))}
      <p className="mt-1 px-1 text-[11.5px] leading-relaxed text-faint">
        Drag a component onto the canvas, then drag from one component&apos;s edge to another to connect them.
      </p>
    </div>
  );
}

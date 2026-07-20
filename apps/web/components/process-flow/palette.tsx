"use client";

import { EQUIPMENT_TYPES } from "@/lib/process-flow/equipment-defaults";
import { EquipmentSymbol } from "@/components/process-flow/equipment-symbol";

export function Palette() {
  function onDragStart(e: React.DragEvent, kind: string) {
    e.dataTransfer.setData("application/x-equipment-kind", kind);
    e.dataTransfer.effectAllowed = "move";
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-line bg-card p-3">
      <p className="px-1 text-[11px] font-bold uppercase tracking-wide text-muted">Equipment</p>
      {EQUIPMENT_TYPES.map((e) => (
        <div
          key={e.kind}
          draggable
          onDragStart={(ev) => onDragStart(ev, e.kind)}
          className="flex cursor-grab items-center gap-2.5 rounded-xl border border-line bg-surface px-3 py-2.5 text-[13px] font-medium text-ink transition-colors hover:border-flask/40 active:cursor-grabbing"
        >
          <span className="flex w-9 shrink-0 items-center justify-center text-muted">
            <EquipmentSymbol kind={e.kind} />
          </span>
          {e.label}
        </div>
      ))}
      <p className="mt-1 px-1 text-[11.5px] leading-relaxed text-faint">
        Drag equipment onto the sheet, wire streams between them, set flow rates, then Check Balance.
      </p>
    </div>
  );
}

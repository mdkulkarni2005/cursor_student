"use client";

import type { Node } from "@xyflow/react";
import { CircuitSymbol } from "@/components/circuits/circuit-symbol";
import { COMPONENT_META, HAS_EDITABLE_VALUE } from "@/lib/circuits/component-defaults";
import type { CircuitNodeData } from "@/components/circuits/circuit-node";

export function PropertiesPanel({ selected, onDelete }: { selected: Node | null; onDelete: (id: string) => void }) {
  if (!selected) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-card p-4 text-[12px] leading-relaxed text-muted">
        Select a component on the sheet to view and edit its properties.
      </div>
    );
  }

  const d = selected.data as unknown as CircuitNodeData;
  const meta = COMPONENT_META[d.kind];

  return (
    <div className="rounded-2xl border border-line bg-card p-4">
      <p className="text-[10.5px] font-bold uppercase tracking-wide text-muted">Properties</p>

      <div className="mt-3 flex items-center gap-3 rounded-xl bg-surface p-3">
        <span className="text-soft">
          <CircuitSymbol kind={d.kind} />
        </span>
        <div>
          <p className="font-mono text-[13px] font-bold text-cyan">{d.label}</p>
          <p className="text-[11.5px] text-muted">{meta.label}</p>
        </div>
      </div>

      {HAS_EDITABLE_VALUE[d.kind] ? (
        <label className="mt-3 block">
          <span className="mb-1 block text-[11px] font-semibold text-ink">Value ({d.unit || meta.unit})</span>
          <input
            type="number"
            className="w-full rounded-lg border border-line bg-surface px-2.5 py-2 text-[13px] text-ink"
            value={d.value}
            onChange={(e) => d.onValueChange?.(Number(e.target.value))}
          />
        </label>
      ) : null}

      {d.kind === "switch" ? (
        <button
          type="button"
          onClick={d.onToggleSwitch}
          className={`mt-3 w-full rounded-lg py-2 text-[12px] font-bold ${d.closed !== false ? "bg-success/15 text-success" : "bg-danger/15 text-danger"}`}
        >
          {d.closed !== false ? "CLOSED — click to open" : "OPEN — click to close"}
        </button>
      ) : null}

      <button
        type="button"
        onClick={() => onDelete(selected.id)}
        className="mt-4 w-full rounded-lg border border-danger/30 py-2 text-[12px] font-semibold text-danger transition-colors hover:bg-danger/10"
      >
        Delete component
      </button>
    </div>
  );
}

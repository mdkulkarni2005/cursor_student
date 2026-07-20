"use client";

import type { Node } from "@xyflow/react";
import { GateSymbol } from "@/components/logic-sim/gate-symbol";
import { GATE_META } from "@/lib/logic-sim/gate-defaults";
import type { LogicNodeData } from "@/components/logic-sim/logic-node";

export function PropertiesPanel({ selected, onDelete }: { selected: Node | null; onDelete: (id: string) => void }) {
  if (!selected) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-card p-4 text-[12px] leading-relaxed text-muted">
        Select a gate on the bench to view and edit its properties.
      </div>
    );
  }

  const d = selected.data as unknown as LogicNodeData;
  const meta = GATE_META[d.kind];

  return (
    <div className="rounded-2xl border border-line bg-card p-4">
      <p className="text-[10.5px] font-bold uppercase tracking-wide text-muted">Properties</p>

      <div className="mt-3 flex items-center gap-3 rounded-xl bg-surface p-3">
        <span className="text-soft">
          <GateSymbol kind={d.kind} />
        </span>
        <div>
          <p className="font-mono text-[13px] font-bold text-scope">{d.label}</p>
          <p className="text-[11.5px] text-muted">{meta.label}</p>
        </div>
      </div>

      {d.kind === "input" ? (
        <button
          type="button"
          onClick={d.onToggle}
          className={`mt-3 w-full rounded-lg py-2 text-[12px] font-bold ${d.state ? "bg-success/15 text-success" : "bg-danger/15 text-danger"}`}
        >
          {d.state ? "ON — click to switch off" : "OFF — click to switch on"}
        </button>
      ) : null}

      {d.kind === "dff" ? <p className="mt-3 text-[11.5px] text-muted">Latched Q = {d.state ? "1" : "0"}. Advances on Clock Pulse.</p> : null}

      <button
        type="button"
        onClick={() => onDelete(selected.id)}
        className="mt-4 w-full rounded-lg border border-danger/30 py-2 text-[12px] font-semibold text-danger transition-colors hover:bg-danger/10"
      >
        Delete gate
      </button>
    </div>
  );
}

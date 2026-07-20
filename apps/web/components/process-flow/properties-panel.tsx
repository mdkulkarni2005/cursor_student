"use client";

import type { Node, Edge } from "@xyflow/react";
import { EquipmentSymbol } from "@/components/process-flow/equipment-symbol";
import { EQUIPMENT_META } from "@/lib/process-flow/equipment-defaults";
import type { EquipmentNodeData } from "@/components/process-flow/equipment-node";

export function PropertiesPanel({
  selectedNode,
  selectedEdge,
  onDeleteNode,
  onDeleteEdge,
  onFlowRateChange,
}: {
  selectedNode: Node | null;
  selectedEdge: Edge | null;
  onDeleteNode: (id: string) => void;
  onDeleteEdge: (id: string) => void;
  onFlowRateChange: (id: string, value: number) => void;
}) {
  if (selectedEdge) {
    const flowRate = (selectedEdge.data as { flowRate?: number } | undefined)?.flowRate ?? 0;
    return (
      <div className="rounded-2xl border border-line bg-card p-4">
        <p className="text-[10.5px] font-bold uppercase tracking-wide text-muted">Stream</p>
        <label className="mt-3 block">
          <span className="mb-1 block text-[11px] font-semibold text-ink">Flow Rate (kg/h)</span>
          <input
            type="number"
            className="w-full rounded-lg border border-line bg-surface px-2.5 py-2 text-[13px] text-ink"
            value={flowRate}
            onChange={(e) => onFlowRateChange(selectedEdge.id, Number(e.target.value))}
          />
        </label>
        <button
          type="button"
          onClick={() => onDeleteEdge(selectedEdge.id)}
          className="mt-4 w-full rounded-lg border border-danger/30 py-2 text-[12px] font-semibold text-danger transition-colors hover:bg-danger/10"
        >
          Delete stream
        </button>
      </div>
    );
  }

  if (!selectedNode) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-card p-4 text-[12px] leading-relaxed text-muted">
        Select equipment or a stream to view and edit its properties.
      </div>
    );
  }

  const d = selectedNode.data as unknown as EquipmentNodeData;
  const meta = EQUIPMENT_META[d.kind];

  return (
    <div className="rounded-2xl border border-line bg-card p-4">
      <p className="text-[10.5px] font-bold uppercase tracking-wide text-muted">Properties</p>
      <div className="mt-3 flex items-center gap-3 rounded-xl bg-surface p-3">
        <span className="text-soft">
          <EquipmentSymbol kind={d.kind} />
        </span>
        <div>
          <p className="font-mono text-[13px] font-bold text-flask">{d.label}</p>
          <p className="text-[11.5px] text-muted">{meta.label}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onDeleteNode(selectedNode.id)}
        className="mt-4 w-full rounded-lg border border-danger/30 py-2 text-[12px] font-semibold text-danger transition-colors hover:bg-danger/10"
      >
        Delete equipment
      </button>
    </div>
  );
}

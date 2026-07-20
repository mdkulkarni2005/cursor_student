"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { COMPONENT_EMOJI } from "@/components/system-design/component-types";

export function CanvasNode({ data, selected }: NodeProps) {
  const kind = String(data.kind ?? "");
  const label = String(data.label ?? kind);
  return (
    <div
      className={`flex min-w-[140px] items-center gap-2 rounded-xl border bg-card px-3 py-2.5 text-[12.5px] font-semibold text-ink shadow-sm ${selected ? "border-cyan" : "border-line"}`}
    >
      <Handle type="target" position={Position.Top} className="!bg-cyan" />
      <span className="text-[16px]">{COMPONENT_EMOJI[kind] ?? "🔷"}</span>
      {label}
      <Handle type="source" position={Position.Bottom} className="!bg-cyan" />
    </div>
  );
}

export const SYSTEM_DESIGN_NODE_TYPES = { component: CanvasNode };

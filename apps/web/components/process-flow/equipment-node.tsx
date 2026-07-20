"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { INPUT_PORTS, OUTPUT_PORTS } from "@/lib/process-flow/equipment-defaults";
import { EquipmentSymbol } from "@/components/process-flow/equipment-symbol";
import type { EquipmentKind } from "@/lib/process-flow/types";

export type EquipmentNodeData = { kind: EquipmentKind; label: string; imbalanced?: boolean };

const IN_OFFSET: Record<string, string> = { in0: "35%", in1: "70%" };
const OUT_OFFSET: Record<string, string> = { out0: "35%", out1: "70%" };

export function EquipmentNode({ data, selected }: NodeProps) {
  const d = data as unknown as EquipmentNodeData;
  const inputs = INPUT_PORTS[d.kind];
  const outputs = OUTPUT_PORTS[d.kind];

  return (
    <div
      className={`relative flex min-w-[110px] flex-col items-center gap-1 rounded-md border bg-[#170d06] px-3 pb-2 pt-5 font-mono shadow-[0_1px_0_rgba(255,255,255,0.04)_inset] ${
        d.imbalanced ? "border-danger ring-1 ring-danger/50" : selected ? "border-flask ring-1 ring-flask/40" : "border-line/70"
      }`}
    >
      <span className="absolute left-2 top-1 text-[10px] font-bold tracking-wide text-flask/80">{d.label}</span>
      {d.imbalanced ? <span className="absolute right-2 top-1 text-[11px] text-danger">⚠</span> : null}

      {inputs.map((pin) => (
        <Handle key={pin} type="target" position={Position.Left} id={pin} style={{ top: IN_OFFSET[pin] }} className="!size-2 !border-2 !border-canvas !bg-flask" />
      ))}

      <span className="text-soft">
        <EquipmentSymbol kind={d.kind} />
      </span>

      {outputs.map((pin) => (
        <Handle key={pin} type="source" position={Position.Right} id={pin} style={{ top: OUT_OFFSET[pin] }} className="!size-2 !border-2 !border-canvas !bg-flask" />
      ))}
    </div>
  );
}

export const PROCESS_NODE_TYPES = { equipment: EquipmentNode };

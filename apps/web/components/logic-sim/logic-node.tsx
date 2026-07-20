"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { INPUT_PINS, HAS_OUTPUT } from "@/lib/logic-sim/gate-defaults";
import { GateSymbol } from "@/components/logic-sim/gate-symbol";
import type { GateKind } from "@/lib/logic-sim/types";

export type LogicNodeData = {
  kind: GateKind;
  /** Reference designator, e.g. "U1", "SW1", "FF1" — same convention as the Circuit Builder. */
  label: string;
  /** Switch on/off, or flip-flop's latched Q — irrelevant for pure combinational gates. */
  state?: boolean;
  onToggle?: () => void;
  reading?: { value?: boolean; connected: boolean };
};

const PIN_OFFSET: Record<string, string> = { in0: "34%", in1: "66%", d: "30%", clk: "78%" };

export function LogicNode({ data, selected }: NodeProps) {
  const d = data as unknown as LogicNodeData;
  const pins = INPUT_PINS[d.kind];
  const value = d.kind === "input" ? d.state ?? false : d.kind === "dff" ? d.state ?? false : d.reading?.value;
  const active = d.kind === "input" || d.kind === "led" ? Boolean(value) : Boolean(d.reading?.connected && value);

  return (
    <div
      className={`group relative flex min-w-[84px] flex-col items-center gap-1 rounded-md border bg-[#0a1a10] px-3 pb-2 pt-5 font-mono shadow-[0_1px_0_rgba(255,255,255,0.04)_inset] ${
        selected ? "border-scope ring-1 ring-scope/40" : "border-line/70"
      } ${active && (d.kind === "led" || d.kind === "input") ? "drop-shadow-[0_0_10px_rgba(124,255,107,0.55)]" : ""}`}
    >
      <span className="absolute left-2 top-1 text-[10px] font-bold tracking-wide text-scope/80">{d.label}</span>

      {pins.map((pin) => (
        <Handle key={pin} type="target" position={Position.Left} id={pin} style={{ top: PIN_OFFSET[pin] }} className="!size-2 !border-2 !border-canvas !bg-scope" />
      ))}

      <span className={`text-soft ${d.kind === "led" && active ? "text-warning" : ""}`}>
        <GateSymbol kind={d.kind} active={active} />
      </span>

      {d.kind === "input" ? (
        <button
          type="button"
          onClick={d.onToggle}
          className={`nodrag rounded px-1.5 py-0.5 text-[9.5px] font-bold tracking-wide ${d.state ? "bg-success/15 text-success" : "bg-danger/15 text-danger"}`}
        >
          {d.state ? "ON" : "OFF"}
        </button>
      ) : d.kind === "dff" ? (
        <span className={`text-[9.5px] font-bold ${d.state ? "text-success" : "text-faint"}`}>Q={d.state ? "1" : "0"}</span>
      ) : d.reading ? (
        <span className={`text-[9.5px] font-bold ${!d.reading.connected ? "text-faint" : d.reading.value ? "text-success" : "text-muted"}`}>
          {!d.reading.connected ? "—" : d.reading.value ? "1" : "0"}
        </span>
      ) : null}

      {HAS_OUTPUT[d.kind] ? <Handle type="source" position={Position.Right} id="out" className="!size-2 !border-2 !border-canvas !bg-scope" /> : null}
    </div>
  );
}

export const LOGIC_NODE_TYPES = { gate: LogicNode };

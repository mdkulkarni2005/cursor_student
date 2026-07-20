"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { HAS_EDITABLE_VALUE } from "@/lib/circuits/component-defaults";
import { CircuitSymbol } from "@/components/circuits/circuit-symbol";
import type { CircuitComponentKind } from "@/lib/circuits/types";

export type CircuitNodeData = {
  kind: CircuitComponentKind;
  /** Reference designator, e.g. "R1", "V1" — IEEE 315 convention, same as a real schematic. */
  label: string;
  value: number;
  unit: string;
  closed?: boolean;
  onValueChange?: (value: number) => void;
  onToggleSwitch?: () => void;
  /** Fault Finder mode: values aren't editable, clicking probes the component instead. */
  readOnly?: boolean;
  onProbe?: () => void;
  probing?: boolean;
  reading?: {
    connected: boolean;
    currentA?: number;
    voltageV?: number;
    active?: boolean;
    warning?: string;
  };
};

function formatCurrent(a: number): string {
  const abs = Math.abs(a);
  if (abs < 1) return `${(a * 1000).toFixed(abs < 0.001 ? 2 : 1)} mA`;
  return `${a.toFixed(3)} A`;
}

export function CircuitNode({ data, selected }: NodeProps) {
  const d = data as unknown as CircuitNodeData;
  const reading = d.reading;
  const glow = d.kind === "led" && reading?.active;
  const spin = d.kind === "motor" && reading?.active;
  const symbolActive = d.kind === "switch" ? d.closed !== false : Boolean(glow || spin);

  return (
    <div
      onClick={d.readOnly ? d.onProbe : undefined}
      onKeyDown={
        d.readOnly
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                d.onProbe?.();
              }
            }
          : undefined
      }
      tabIndex={d.readOnly ? 0 : undefined}
      role={d.readOnly ? "button" : undefined}
      aria-label={d.readOnly ? `Probe ${d.label}` : undefined}
      className={`group relative flex min-w-[92px] flex-col items-center gap-1 rounded-md border bg-[#0d1420] px-3 pb-2 pt-5 font-mono shadow-[0_1px_0_rgba(255,255,255,0.04)_inset] ${
        selected ? "border-cyan ring-1 ring-cyan/40" : "border-line/70"
      } ${glow ? "drop-shadow-[0_0_10px_rgba(250,204,21,0.55)]" : ""} ${
        d.readOnly ? "nodrag cursor-crosshair hover:border-cyan/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0f18]" : ""
      } ${d.probing ? "border-cyan ring-2 ring-cyan/40" : ""}`}
    >
      {/* Reference designator — top-left, like a real schematic sheet. */}
      <span className="absolute left-2 top-1 text-[10px] font-bold tracking-wide text-cyan/80">{d.label}</span>

      {/* Both terminals accept wires in either direction — a wire is just a zero-resistance
          connection, there's no electrical "flow direction" to a drag gesture. Stacking a
          source+target handle pair at each terminal is React Flow's standard way to allow
          starting OR ending a connection at the same point. */}
      <Handle type="target" position={Position.Top} id="a" className="!size-2 !border-2 !border-canvas !bg-cyan" />
      <Handle type="source" position={Position.Top} id="a" className="!size-2 !border-2 !border-canvas !bg-cyan" />

      <span className={`text-soft ${spin ? "animate-spin" : ""} ${glow ? "text-warning" : ""}`}>
        <CircuitSymbol kind={d.kind} active={symbolActive} />
      </span>

      {d.kind === "switch" && !d.readOnly ? (
        <button
          type="button"
          onClick={d.onToggleSwitch}
          className={`nodrag rounded px-1.5 py-0.5 text-[9.5px] font-bold tracking-wide ${d.closed !== false ? "bg-success/15 text-success" : "bg-danger/15 text-danger"}`}
        >
          {d.closed !== false ? "CLOSED" : "OPEN"}
        </button>
      ) : HAS_EDITABLE_VALUE[d.kind] ? (
        <span className="text-[10.5px] text-faint">
          {d.readOnly ? "rated " : ""}
          {d.value}
          {d.unit}
        </span>
      ) : null}

      {d.probing ? <span className="text-[10px] font-normal text-cyan">probing…</span> : null}

      {d.readOnly && !d.probing && !reading ? (
        <span className="text-[9.5px] font-normal text-faint opacity-0 transition-opacity group-hover:opacity-100">click to probe</span>
      ) : null}

      {reading ? (
        <div className="mt-0.5 border-t border-line/60 pt-1 text-center text-[10px] leading-tight text-muted">
          {d.readOnly ? <div className="mb-0.5 text-[8.5px] uppercase tracking-wide text-cyan/70">measured</div> : null}
          {!reading.connected ? (
            <span className="text-faint">open</span>
          ) : (
            <>
              {reading.currentA !== undefined ? <div>{formatCurrent(reading.currentA)}</div> : null}
              {reading.voltageV !== undefined ? <div>{reading.voltageV.toFixed(2)}V</div> : null}
              {reading.warning ? <div className="font-semibold text-danger">⚠ short</div> : null}
            </>
          )}
        </div>
      ) : null}

      <Handle type="target" position={Position.Bottom} id="b" className="!size-2 !border-2 !border-canvas !bg-cyan" />
      <Handle type="source" position={Position.Bottom} id="b" className="!size-2 !border-2 !border-canvas !bg-cyan" />
    </div>
  );
}

export const CIRCUIT_NODE_TYPES = { component: CircuitNode };

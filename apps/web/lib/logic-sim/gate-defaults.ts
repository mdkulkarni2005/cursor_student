import type { GateKind } from "@/lib/logic-sim/types";

export const GATE_COMPONENT_TYPES: { kind: GateKind; label: string }[] = [
  { kind: "input", label: "Switch" },
  { kind: "and", label: "AND" },
  { kind: "or", label: "OR" },
  { kind: "not", label: "NOT" },
  { kind: "nand", label: "NAND" },
  { kind: "nor", label: "NOR" },
  { kind: "xor", label: "XOR" },
  { kind: "dff", label: "D Flip-Flop" },
  { kind: "led", label: "LED" },
] as const;

export const GATE_META: Record<GateKind, { label: string }> = Object.fromEntries(
  GATE_COMPONENT_TYPES.map((g) => [g.kind, { label: g.label }]),
) as Record<GateKind, { label: string }>;

/** Reference-designator prefixes, mirroring the circuit builder's R1/V1 convention. */
export const REFERENCE_PREFIX: Record<GateKind, string> = {
  input: "SW",
  and: "U",
  or: "U",
  not: "U",
  nand: "U",
  nor: "U",
  xor: "U",
  dff: "FF",
  led: "D",
};

/** Fixed input-pin count per gate kind — drives handle layout on the node and truth-table wiring. */
export const INPUT_PINS: Record<GateKind, string[]> = {
  input: [],
  and: ["in0", "in1"],
  or: ["in0", "in1"],
  not: ["in0"],
  nand: ["in0", "in1"],
  nor: ["in0", "in1"],
  xor: ["in0", "in1"],
  dff: ["d", "clk"],
  led: ["in0"],
};

export const HAS_OUTPUT: Record<GateKind, boolean> = {
  input: true,
  and: true,
  or: true,
  not: true,
  nand: true,
  nor: true,
  xor: true,
  dff: true,
  led: false,
};

export const WIRE_STYLE = { type: "smoothstep" as const, style: { stroke: "#7CFF6B", strokeWidth: 2 }, pathOptions: { borderRadius: 2 } };

import type { CircuitComponentKind } from "@/lib/circuits/types";

export const CIRCUIT_COMPONENT_TYPES: { kind: CircuitComponentKind; label: string; defaultValue: number; unit: string }[] = [
  { kind: "voltage-source", label: "Voltage Source", defaultValue: 12, unit: "V" },
  { kind: "resistor", label: "Resistor", defaultValue: 100, unit: "Ω" },
  { kind: "switch", label: "Switch", defaultValue: 0, unit: "" },
  { kind: "motor", label: "Motor", defaultValue: 24, unit: "Ω" },
  { kind: "ammeter", label: "Ammeter", defaultValue: 0, unit: "" },
  { kind: "voltmeter", label: "Voltmeter", defaultValue: 0, unit: "" },
  { kind: "led", label: "LED", defaultValue: 50, unit: "Ω" },
] as const;

export const COMPONENT_META: Record<CircuitComponentKind, { label: string; defaultValue: number; unit: string }> = Object.fromEntries(
  CIRCUIT_COMPONENT_TYPES.map((c) => [c.kind, { label: c.label, defaultValue: c.defaultValue, unit: c.unit }]),
) as Record<CircuitComponentKind, { label: string; defaultValue: number; unit: string }>;

/** Which component kinds expose an editable numeric value (resistance/voltage) in the UI. */
export const HAS_EDITABLE_VALUE: Record<CircuitComponentKind, boolean> = {
  "voltage-source": true,
  resistor: true,
  switch: false,
  motor: true,
  ammeter: false,
  voltmeter: false,
  led: true,
};

/** Real schematic reference-designator prefixes (R1, V1, SW1, M1, A1, VM1, D1 — IEEE 315 convention). */
export const REFERENCE_PREFIX: Record<CircuitComponentKind, string> = {
  "voltage-source": "V",
  resistor: "R",
  switch: "SW",
  motor: "M",
  ammeter: "A",
  voltmeter: "VM",
  led: "D",
};

/** Real schematic/PCB wires are routed at right angles (horizontal + vertical segments only) —
 *  never a diagonal straight line, and never React Flow's default bezier curve (which loops
 *  outward unnaturally when two terminals of the same "direction", e.g. two top handles, are
 *  wired together, since it assumes directional flow). "smoothstep" gives that orthogonal routing.
 *  A bright color also reads far more like an actual live wire than the default washed-out gray.
 *  Applied wherever an Edge is constructed (new connections AND edges loaded from a saved
 *  draft/scenario) so it's never left to defaultEdgeOptions' merge semantics alone. */
export const WIRE_STYLE = { type: "smoothstep" as const, style: { stroke: "#4ade80", strokeWidth: 2 }, pathOptions: { borderRadius: 2 } };

import type { EquipmentKind } from "@/lib/process-flow/types";

export const EQUIPMENT_TYPES: { kind: EquipmentKind; label: string }[] = [
  { kind: "feed", label: "External Feed" },
  { kind: "reactor", label: "Reactor" },
  { kind: "distillation-column", label: "Distillation Column" },
  { kind: "heat-exchanger", label: "Heat Exchanger" },
  { kind: "pump", label: "Pump" },
  { kind: "product", label: "External Product" },
];

export const EQUIPMENT_META: Record<EquipmentKind, { label: string }> = Object.fromEntries(
  EQUIPMENT_TYPES.map((e) => [e.kind, { label: e.label }]),
) as Record<EquipmentKind, { label: string }>;

export const REFERENCE_PREFIX: Record<EquipmentKind, string> = {
  reactor: "R",
  "distillation-column": "DC",
  "heat-exchanger": "HX",
  pump: "P",
  feed: "F",
  product: "PR",
};

/** Inlet port ids per equipment kind — drives handle layout and mass-balance wiring. */
export const INPUT_PORTS: Record<EquipmentKind, string[]> = {
  reactor: ["in0", "in1"],
  "distillation-column": ["in0"],
  "heat-exchanger": ["in0", "in1"],
  pump: ["in0"],
  feed: [],
  product: ["in0"],
};

/** Outlet port ids per equipment kind. */
export const OUTPUT_PORTS: Record<EquipmentKind, string[]> = {
  reactor: ["out0"],
  "distillation-column": ["out0", "out1"],
  "heat-exchanger": ["out0", "out1"],
  pump: ["out0"],
  feed: ["out0"],
  product: [],
};

/** Boundary units (external feed/product streams) are the system's edge — they're exempt from
 *  the inflow=outflow check since, by definition, mass crosses the flowsheet boundary there. */
export const IS_BOUNDARY: Record<EquipmentKind, boolean> = {
  reactor: false,
  "distillation-column": false,
  "heat-exchanger": false,
  pump: false,
  feed: true,
  product: true,
};

export const STREAM_STYLE = { type: "smoothstep" as const, style: { stroke: "#ff9f6b", strokeWidth: 2 }, pathOptions: { borderRadius: 2 } };

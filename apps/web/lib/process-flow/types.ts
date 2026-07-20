export type EquipmentKind = "reactor" | "distillation-column" | "heat-exchanger" | "pump" | "feed" | "product";

/** What we persist/exchange — a plain graph, framework-agnostic (no React Flow types here). */
export type ProcessNode = {
  id: string;
  kind: EquipmentKind;
  label: string;
  position: { x: number; y: number };
};

/** A process stream between two pieces of equipment, carrying a flow rate in kg/h. */
export type ProcessEdge = { id: string; source: string; target: string; sourceHandle?: string | null; targetHandle?: string | null; flowRate: number };

export type BalanceIssue = { nodeId: string; message: string };

export type BalanceResult = { issues: BalanceIssue[]; balanced: boolean };

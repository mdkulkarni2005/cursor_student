export type GateKind = "input" | "and" | "or" | "not" | "nand" | "nor" | "xor" | "dff" | "led";

/** What we persist/exchange — a plain graph, framework-agnostic (no React Flow types here). */
export type LogicNode = {
  id: string;
  kind: GateKind;
  label: string;
  /** Switch on/off for "input"; latched Q for "dff". Ignored for pure combinational gates. */
  state?: boolean;
  position: { x: number; y: number };
};

/** targetHandle picks which input pin of the gate this wire lands on — "in0"/"in1" for 2-input
 *  gates, "in0" for NOT/LED, "d"/"clk" for the flip-flop. sourceHandle is always "out". */
export type LogicEdge = { id: string; source: string; target: string; sourceHandle?: string | null; targetHandle?: string | null };

export type LogicReading = { nodeId: string; value?: boolean; connected: boolean };

export type LogicSolveResult = { ok: true; readings: Record<string, LogicReading> };
export type LogicSolveError = { ok: false; error: string };

export type TruthTableRow = { inputs: boolean[]; outputs: (boolean | undefined)[] };
export type TruthTable = { ok: true; inputLabels: string[]; outputLabels: string[]; rows: TruthTableRow[] };
export type TruthTableError = { ok: false; error: string };

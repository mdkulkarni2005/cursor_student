export type CircuitComponentKind =
  | "resistor"
  | "voltage-source"
  | "switch"
  | "motor"
  | "ammeter"
  | "voltmeter"
  | "led";

/** What we persist/exchange — a plain graph, framework-agnostic (no React Flow types here). */
export type CircuitNode = {
  id: string;
  kind: CircuitComponentKind;
  label: string;
  /** Resistance (Ω) for resistor/motor/led/ammeter; volts for voltage-source. Ignored for switch/voltmeter. */
  value: number;
  /** Only meaningful for "switch" — open breaks the branch entirely. */
  closed?: boolean;
  position: { x: number; y: number };
};

/** sourceHandle/targetHandle are "a" (top terminal) or "b" (bottom terminal) — which pin of each
 *  component this wire actually connects to. Defaults to "a" if omitted. */
export type CircuitEdge = { id: string; source: string; target: string; sourceHandle?: "a" | "b" | null; targetHandle?: "a" | "b" | null };

export type CircuitReading = {
  nodeId: string;
  /** Current flowing through the component, in amps. Undefined if not electrically connected. */
  currentA?: number;
  /** Voltage across the component's two terminals, in volts. Undefined if not connected. */
  voltageV?: number;
  /** LED/motor only — whether it's actively lit/spinning this run. */
  active?: boolean;
  connected: boolean;
  /** Set when current through this component is abnormally high — the signature of a short. */
  warning?: string;
};

export type CircuitSolveResult = {
  ok: true;
  readings: Record<string, CircuitReading>;
};

export type CircuitSolveError = {
  ok: false;
  error: string;
};

/** Per-scenario override used by Fault Finder to simulate a failed component without changing its authored value. */
export type ComponentFault = { componentId: string; type: "open" | "short" };

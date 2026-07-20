import type { LogicNode, LogicEdge, LogicReading, LogicSolveResult, LogicSolveError, TruthTable, TruthTableError } from "@/lib/logic-sim/types";

const MAX_TRUTH_TABLE_INPUTS = 6;

function inputsByHandle(nodeId: string, edges: LogicEdge[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const e of edges) {
    if (e.target !== nodeId) continue;
    map.set(e.targetHandle ?? "in0", e.source);
  }
  return map;
}

function gateOp(kind: string, a: boolean, b?: boolean): boolean {
  switch (kind) {
    case "and":
      return a && (b ?? false);
    case "or":
      return a || (b ?? false);
    case "not":
      return !a;
    case "nand":
      return !(a && (b ?? false));
    case "nor":
      return !(a || (b ?? false));
    case "xor":
      return a !== (b ?? false);
    default:
      return false;
  }
}

/**
 * Evaluate every node's output value given the current switch/flip-flop state. `overrides` lets
 * the truth-table generator try switch combinations without mutating persisted node state.
 * Flip-flops are treated as latches: their output is whatever was captured at the last clock
 * pulse, not recomputed from D on every eval — that's what makes them "memory" rather than a
 * combinational gate, and is also what breaks feedback loops through a flip-flop from being cycles.
 */
export function evaluateLogic(nodes: LogicNode[], edges: LogicEdge[], overrides?: Record<string, boolean>): LogicSolveResult | LogicSolveError {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const memo = new Map<string, boolean | undefined>();
  const visiting = new Set<string>();
  let cycleError = false;

  function evalNode(nodeId: string): boolean | undefined {
    if (memo.has(nodeId)) return memo.get(nodeId);
    if (visiting.has(nodeId)) {
      cycleError = true;
      return undefined;
    }
    const node = byId.get(nodeId);
    if (!node) return undefined;

    if (node.kind === "input") {
      const value = overrides?.[nodeId] ?? node.state ?? false;
      memo.set(nodeId, value);
      return value;
    }
    if (node.kind === "dff") {
      const value = node.state ?? false;
      memo.set(nodeId, value);
      return value;
    }

    visiting.add(nodeId);
    const inputs = inputsByHandle(nodeId, edges);
    let value: boolean | undefined;
    if (node.kind === "led" || node.kind === "not") {
      const srcId = inputs.get("in0");
      value = srcId ? evalNode(srcId) : undefined;
    } else {
      const aId = inputs.get("in0");
      const bId = inputs.get("in1");
      const a = aId ? evalNode(aId) : undefined;
      const b = bId ? evalNode(bId) : undefined;
      value = a === undefined ? undefined : gateOp(node.kind, a, b);
    }
    visiting.delete(nodeId);
    memo.set(nodeId, value);
    return value;
  }

  for (const n of nodes) evalNode(n.id);
  if (cycleError) {
    return { ok: false, error: "Feedback loop detected — combinational gates can't wire back into their own input (a flip-flop is needed for memory)." };
  }

  const readings: Record<string, LogicReading> = {};
  for (const n of nodes) {
    const value = memo.get(n.id);
    readings[n.id] = { nodeId: n.id, value, connected: value !== undefined };
  }
  return { ok: true, readings };
}

/** D input value for every flip-flop, evaluated against current state — captured synchronously
 *  into each flip-flop's Q on "Clock Pulse" so multi-flip-flop chains advance one stage at a time. */
export function nextFlipFlopStates(nodes: LogicNode[], edges: LogicEdge[]): Map<string, boolean> {
  const result = evaluateLogic(nodes, edges);
  const next = new Map<string, boolean>();
  if (!result.ok) return next;
  for (const n of nodes) {
    if (n.kind !== "dff") continue;
    const dSourceId = inputsByHandle(n.id, edges).get("d");
    const dValue = dSourceId ? result.readings[dSourceId]?.value : undefined;
    next.set(n.id, dValue ?? false);
  }
  return next;
}

/** Enumerate every switch combination and report each LED's output — the auto-generated truth
 *  table. Flip-flop outputs are held at their current latched state (toggling switches alone
 *  never advances a flip-flop, matching real hardware), so the table reflects the combinational
 *  behavior for the circuit's present clock state. */
export function generateTruthTable(nodes: LogicNode[], edges: LogicEdge[]): TruthTable | TruthTableError {
  const switches = nodes.filter((n) => n.kind === "input");
  const leds = nodes.filter((n) => n.kind === "led");
  if (switches.length === 0) return { ok: false, error: "Add at least one Switch to generate a truth table." };
  if (leds.length === 0) return { ok: false, error: "Add at least one LED to generate a truth table." };
  if (switches.length > MAX_TRUTH_TABLE_INPUTS) {
    return { ok: false, error: `Truth table supports up to ${MAX_TRUTH_TABLE_INPUTS} switches (2^n rows) — remove some switches.` };
  }

  const rows = [];
  const combinations = 1 << switches.length;
  for (let mask = 0; mask < combinations; mask++) {
    const overrides: Record<string, boolean> = {};
    const inputs: boolean[] = [];
    switches.forEach((sw, i) => {
      const bit = Boolean((mask >> (switches.length - 1 - i)) & 1);
      overrides[sw.id] = bit;
      inputs.push(bit);
    });
    const result = evaluateLogic(nodes, edges, overrides);
    const outputs = leds.map((led) => (result.ok ? result.readings[led.id]?.value : undefined));
    rows.push({ inputs, outputs });
  }

  return {
    ok: true,
    inputLabels: switches.map((s) => s.label),
    outputLabels: leds.map((l) => l.label),
    rows,
  };
}

import type { CircuitNode, CircuitEdge, CircuitReading, CircuitSolveResult, CircuitSolveError, ComponentFault } from "@/lib/circuits/types";

/** Ideal-ammeter series resistance and "ideal wire" resistance — small enough to be negligible
 *  against typical teaching-circuit values (1Ω–10kΩ, 1–24V) without making the matrix singular. */
const AMMETER_RESISTANCE = 1e-6;
const SHORT_FAULT_RESISTANCE = 1e-6;
const ACTIVE_CURRENT_THRESHOLD_A = 1e-4;
const OVER_CURRENT_WARNING_A = 500;

class UnionFind {
  private parent = new Map<string, string>();
  find(x: string): string {
    if (!this.parent.has(x)) this.parent.set(x, x);
    let root = x;
    while (this.parent.get(root) !== root) root = this.parent.get(root)!;
    // path compression
    let cur = x;
    while (this.parent.get(cur) !== root) {
      const next = this.parent.get(cur)!;
      this.parent.set(cur, root);
      cur = next;
    }
    return root;
  }
  union(a: string, b: string): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(ra, rb);
  }
}

const terminal = (nodeId: string, handle: "a" | "b") => `${nodeId}:${handle}`;

type Branch = { componentId: string; p: string; q: string; resistance: number };
type Source = { componentId: string; p: string; q: string; voltage: number };

/**
 * Solve a DC-steady-state resistive network via Modified Nodal Analysis. Voltmeters are ideal
 * (infinite resistance, no branch); ammeters/closed switches are near-ideal (tiny series
 * resistance / direct union respectively). `faults` lets Fault Finder override a component's
 * effective behavior (open = removed branch, short = ~0Ω) without touching its authored value.
 */
export function solveDcCircuit(nodes: CircuitNode[], edges: CircuitEdge[], faults: ComponentFault[] = []): CircuitSolveResult | CircuitSolveError {
  const faultByComponent = new Map(faults.map((f) => [f.componentId, f.type]));
  const byId = new Map(nodes.map((n) => [n.id, n]));

  const uf = new UnionFind();
  for (const n of nodes) {
    uf.find(terminal(n.id, "a"));
    uf.find(terminal(n.id, "b"));
  }
  for (const e of edges) {
    const sourceNode = byId.get(e.source);
    const targetNode = byId.get(e.target);
    if (!sourceNode || !targetNode) continue;
    uf.union(terminal(e.source, e.sourceHandle ?? "a"), terminal(e.target, e.targetHandle ?? "a"));
  }
  for (const n of nodes) {
    if (n.kind !== "switch") continue;
    const fault = faultByComponent.get(n.id);
    const closed = fault === "short" ? true : fault === "open" ? false : n.closed !== false;
    if (closed) uf.union(terminal(n.id, "a"), terminal(n.id, "b"));
  }

  const branches: Branch[] = [];
  const sources: Source[] = [];
  for (const n of nodes) {
    const fault = faultByComponent.get(n.id);
    if (n.kind === "voltmeter" || n.kind === "switch") continue;
    if (n.kind === "voltage-source") {
      sources.push({ componentId: n.id, p: uf.find(terminal(n.id, "a")), q: uf.find(terminal(n.id, "b")), voltage: n.value });
      continue;
    }
    let resistance = n.kind === "ammeter" ? AMMETER_RESISTANCE : Math.max(n.value, 1e-6);
    if (fault === "open") resistance = Number.POSITIVE_INFINITY;
    if (fault === "short") resistance = SHORT_FAULT_RESISTANCE;
    if (!Number.isFinite(resistance)) continue; // open fault — branch simply doesn't exist
    branches.push({ componentId: n.id, p: uf.find(terminal(n.id, "a")), q: uf.find(terminal(n.id, "b")), resistance });
  }

  if (sources.length === 0) {
    return { ok: false, error: "Circuit has no power source — add a Voltage Source and wire it in." };
  }
  for (const s of sources) {
    if (s.p === s.q) {
      return { ok: false, error: "Short circuit — a wire connects the voltage source directly to itself." };
    }
  }

  // Reachability from ground (the first source's negative terminal) through branches + sources —
  // islands not touching ground would make the matrix singular, so they're solved as "not connected" instead.
  const ground = sources[0]!.q;
  const adjacency = new Map<string, Set<string>>();
  const link = (a: string, b: string) => {
    if (!adjacency.has(a)) adjacency.set(a, new Set());
    if (!adjacency.has(b)) adjacency.set(b, new Set());
    adjacency.get(a)!.add(b);
    adjacency.get(b)!.add(a);
  };
  for (const b of branches) link(b.p, b.q);
  for (const s of sources) link(s.p, s.q);

  const reachable = new Set<string>([ground]);
  const queue = [ground];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const next of adjacency.get(cur) ?? []) {
      if (!reachable.has(next)) {
        reachable.add(next);
        queue.push(next);
      }
    }
  }

  const usedBranches = branches.filter((b) => reachable.has(b.p) && reachable.has(b.q));
  const usedSources = sources.filter((s) => reachable.has(s.p) && reachable.has(s.q));

  const nodeIndex = new Map<string, number>();
  for (const id of reachable) nodeIndex.set(id, nodeIndex.size);
  const N = nodeIndex.size;
  const M = usedSources.length;
  const size = N + M;

  const A: number[][] = Array.from({ length: size }, () => Array(size).fill(0));
  const z: number[] = Array(size).fill(0);

  for (const b of usedBranches) {
    const g = 1 / b.resistance;
    const p = nodeIndex.get(b.p)!;
    const q = nodeIndex.get(b.q)!;
    A[p]![p]! += g;
    A[q]![q]! += g;
    A[p]![q]! -= g;
    A[q]![p]! -= g;
  }
  usedSources.forEach((s, k) => {
    const p = nodeIndex.get(s.p)!;
    const q = nodeIndex.get(s.q)!;
    const col = N + k;
    A[p]![col]! += 1;
    A[q]![col]! -= 1;
    A[col]![p]! += 1;
    A[col]![q]! -= 1;
    z[col] = s.voltage;
  });

  const groundIdx = nodeIndex.get(ground)!;
  const keep = Array.from({ length: size }, (_, i) => i).filter((i) => i !== groundIdx);
  const reducedSize = keep.length;
  const Ar: number[][] = keep.map((r) => keep.map((c) => A[r]![c]!));
  const zr: number[] = keep.map((r) => z[r]!);

  const solved = gaussianEliminate(Ar, zr);
  if (!solved) {
    return { ok: false, error: "This circuit can't be solved — check for a short circuit or a floating loop." };
  }

  const x = Array(size).fill(0);
  keep.forEach((originalIdx, j) => {
    x[originalIdx] = solved[j];
  });

  const voltageOf = (canonicalId: string): number | undefined => {
    const idx = nodeIndex.get(canonicalId);
    return idx === undefined ? undefined : x[idx];
  };

  const readings: Record<string, CircuitReading> = {};
  for (const n of nodes) {
    const fault = faultByComponent.get(n.id);
    if (n.kind === "voltmeter") {
      const va = voltageOf(uf.find(terminal(n.id, "a")));
      const vb = voltageOf(uf.find(terminal(n.id, "b")));
      const connected = va !== undefined && vb !== undefined;
      readings[n.id] = { nodeId: n.id, connected, voltageV: connected ? va! - vb! : undefined };
      continue;
    }
    if (n.kind === "switch") {
      readings[n.id] = { nodeId: n.id, connected: true };
      continue;
    }
    if (n.kind === "voltage-source") {
      const branch = usedSources.find((s) => s.componentId === n.id);
      readings[n.id] = { nodeId: n.id, connected: Boolean(branch) };
      continue;
    }
    const branch = usedBranches.find((b) => b.componentId === n.id);
    if (!branch || fault === "open") {
      readings[n.id] = { nodeId: n.id, connected: false };
      continue;
    }
    const va = voltageOf(branch.p)!;
    const vb = voltageOf(branch.q)!;
    const voltage = va - vb;
    const current = voltage / branch.resistance;
    const active = n.kind === "led" ? current > ACTIVE_CURRENT_THRESHOLD_A : Math.abs(current) > ACTIVE_CURRENT_THRESHOLD_A;
    readings[n.id] = {
      nodeId: n.id,
      connected: true,
      voltageV: voltage,
      currentA: current,
      active: n.kind === "led" || n.kind === "motor" ? active : undefined,
      warning: Math.abs(current) > OVER_CURRENT_WARNING_A ? "Abnormally high current — likely a short." : undefined,
    };
  }

  return { ok: true, readings };
}

/** Gaussian elimination with partial pivoting. Returns null if the system is singular. */
function gaussianEliminate(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  if (n === 0) return [];
  const M = A.map((row, i) => [...row, b[i]!]);

  for (let col = 0; col < n; col++) {
    let pivotRow = col;
    let maxAbs = Math.abs(M[col]![col]!);
    for (let r = col + 1; r < n; r++) {
      const abs = Math.abs(M[r]![col]!);
      if (abs > maxAbs) {
        maxAbs = abs;
        pivotRow = r;
      }
    }
    if (maxAbs < 1e-12) return null;
    [M[col], M[pivotRow]] = [M[pivotRow]!, M[col]!];

    const pivot = M[col]![col]!;
    for (let c = col; c <= n; c++) M[col]![c]! /= pivot;

    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = M[r]![col]!;
      if (factor === 0) continue;
      for (let c = col; c <= n; c++) M[r]![c]! -= factor * M[col]![c]!;
    }
  }

  return M.map((row) => row[n]!);
}

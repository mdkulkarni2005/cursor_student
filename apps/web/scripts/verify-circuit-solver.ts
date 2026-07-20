/**
 * Proves the DC circuit solver (lib/circuits/solve.ts) against hand-calculable textbook circuits
 * — never trust a solver's own math without an independent expected value, same policy as the DSA
 * catalog (scripts/dsa-verify). Run: pnpm --filter web verify:circuit-solver
 */
import { solveDcCircuit } from "../lib/circuits/solve.js";
import type { CircuitNode, CircuitEdge } from "../lib/circuits/types.js";

const results: string[] = [];
let failures = 0;

function approx(a: number, b: number, tol = 1e-3): boolean {
  return Math.abs(a - b) <= tol;
}

function check(label: string, pass: boolean, detail: string) {
  results.push(`  ${pass ? "✓" : "✗"} ${label} — ${detail}`);
  if (!pass) failures += 1;
}

// 1. Series circuit: 12V source, R1=100Ω, R2=200Ω in series, ammeter in the loop, voltmeter
// across R2. Expected: I = 12/300 = 0.04A, V(R2) = 0.04*200 = 8V, V(R1) = 4V.
{
  const nodes: CircuitNode[] = [
    { id: "src", kind: "voltage-source", label: "V", value: 12, position: { x: 0, y: 0 } },
    { id: "r1", kind: "resistor", label: "R1", value: 100, position: { x: 0, y: 0 } },
    { id: "r2", kind: "resistor", label: "R2", value: 200, position: { x: 0, y: 0 } },
    { id: "amm", kind: "ammeter", label: "A", value: 0, position: { x: 0, y: 0 } },
  ];
  const edges: CircuitEdge[] = [
    { id: "e1", source: "src", sourceHandle: "a", target: "r1", targetHandle: "a" },
    { id: "e2", source: "r1", sourceHandle: "b", target: "r2", targetHandle: "a" },
    { id: "e3", source: "r2", sourceHandle: "b", target: "amm", targetHandle: "a" },
    { id: "e4", source: "amm", sourceHandle: "b", target: "src", targetHandle: "b" },
  ];
  const result = solveDcCircuit(nodes, edges);
  if (result.ok) {
    check("series: current", approx(result.readings.amm!.currentA!, 0.04), `expected 0.04A, got ${result.readings.amm?.currentA}`);
    check("series: V(R2)", approx(Math.abs(result.readings.r2!.voltageV!), 8), `expected 8V, got ${result.readings.r2?.voltageV}`);
    check("series: V(R1)", approx(Math.abs(result.readings.r1!.voltageV!), 4), `expected 4V, got ${result.readings.r1?.voltageV}`);
  } else {
    check("series: solved", false, result.error);
  }
}

// 2. Parallel circuit: 12V source across R1=100Ω and R2=200Ω directly.
// Expected: both see 12V, I(R1)=0.12A, I(R2)=0.06A.
{
  const nodes: CircuitNode[] = [
    { id: "src", kind: "voltage-source", label: "V", value: 12, position: { x: 0, y: 0 } },
    { id: "r1", kind: "resistor", label: "R1", value: 100, position: { x: 0, y: 0 } },
    { id: "r2", kind: "resistor", label: "R2", value: 200, position: { x: 0, y: 0 } },
  ];
  const edges: CircuitEdge[] = [
    { id: "e1", source: "src", sourceHandle: "a", target: "r1", targetHandle: "a" },
    { id: "e2", source: "src", sourceHandle: "a", target: "r2", targetHandle: "a" },
    { id: "e3", source: "src", sourceHandle: "b", target: "r1", targetHandle: "b" },
    { id: "e4", source: "src", sourceHandle: "b", target: "r2", targetHandle: "b" },
  ];
  const result = solveDcCircuit(nodes, edges);
  if (result.ok) {
    check("parallel: I(R1)", approx(Math.abs(result.readings.r1!.currentA!), 0.12), `expected 0.12A, got ${result.readings.r1?.currentA}`);
    check("parallel: I(R2)", approx(Math.abs(result.readings.r2!.currentA!), 0.06), `expected 0.06A, got ${result.readings.r2?.currentA}`);
  } else {
    check("parallel: solved", false, result.error);
  }
}

// 3. Voltage divider: 10V source, R1=100Ω, R2=300Ω in series, voltmeter across R2.
// Expected: Vout = 10 * 300/400 = 7.5V.
{
  const nodes: CircuitNode[] = [
    { id: "src", kind: "voltage-source", label: "V", value: 10, position: { x: 0, y: 0 } },
    { id: "r1", kind: "resistor", label: "R1", value: 100, position: { x: 0, y: 0 } },
    { id: "r2", kind: "resistor", label: "R2", value: 300, position: { x: 0, y: 0 } },
    { id: "volt", kind: "voltmeter", label: "V2", value: 0, position: { x: 0, y: 0 } },
  ];
  const edges: CircuitEdge[] = [
    { id: "e1", source: "src", sourceHandle: "a", target: "r1", targetHandle: "a" },
    { id: "e2", source: "r1", sourceHandle: "b", target: "r2", targetHandle: "a" },
    { id: "e3", source: "r2", sourceHandle: "b", target: "src", targetHandle: "b" },
    { id: "e4", source: "r2", sourceHandle: "a", target: "volt", targetHandle: "a" },
    { id: "e5", source: "r2", sourceHandle: "b", target: "volt", targetHandle: "b" },
  ];
  const result = solveDcCircuit(nodes, edges);
  if (result.ok) {
    check("divider: Vout", approx(Math.abs(result.readings.volt!.voltageV!), 7.5), `expected 7.5V, got ${result.readings.volt?.voltageV}`);
  } else {
    check("divider: solved", false, result.error);
  }
}

// 4. Dead short across the source (plain wire from + straight back to -) — must error, not blow up.
{
  const nodes: CircuitNode[] = [
    { id: "src", kind: "voltage-source", label: "V", value: 12, position: { x: 0, y: 0 } },
  ];
  const edges: CircuitEdge[] = [{ id: "e1", source: "src", sourceHandle: "a", target: "src", targetHandle: "b" }];
  const result = solveDcCircuit(nodes, edges);
  check("dead short: rejected", !result.ok, result.ok ? "expected an error, got a solve" : result.error);
}

// 5. Open switch breaks the loop — R1 is topologically reachable (still wired to the live side)
// but the loop back never closes, so nodal analysis correctly resolves it to exactly 0A — not a
// singular/undefined state. That's the textbook-correct answer for a dead-end branch.
{
  const nodes: CircuitNode[] = [
    { id: "src", kind: "voltage-source", label: "V", value: 12, position: { x: 0, y: 0 } },
    { id: "r1", kind: "resistor", label: "R1", value: 100, position: { x: 0, y: 0 } },
    { id: "sw", kind: "switch", label: "S", value: 0, closed: false, position: { x: 0, y: 0 } },
  ];
  const edges: CircuitEdge[] = [
    { id: "e1", source: "src", sourceHandle: "a", target: "r1", targetHandle: "a" },
    { id: "e2", source: "r1", sourceHandle: "b", target: "sw", targetHandle: "a" },
    { id: "e3", source: "sw", sourceHandle: "b", target: "src", targetHandle: "b" },
  ];
  const result = solveDcCircuit(nodes, edges);
  if (result.ok) {
    const r1 = result.readings.r1!;
    check("open switch: R1 current ≈ 0", r1.currentA === undefined || approx(r1.currentA, 0), `got currentA=${r1.currentA}`);
  } else {
    check("open switch: solved (not an error case)", false, result.error);
  }
}

// 6. "Short" fault override on a resistor produces an abnormally high current (the short's signature).
{
  const nodes: CircuitNode[] = [
    { id: "src", kind: "voltage-source", label: "V", value: 12, position: { x: 0, y: 0 } },
    { id: "r1", kind: "resistor", label: "R1", value: 100, position: { x: 0, y: 0 } },
  ];
  const edges: CircuitEdge[] = [
    { id: "e1", source: "src", sourceHandle: "a", target: "r1", targetHandle: "a" },
    { id: "e2", source: "r1", sourceHandle: "b", target: "src", targetHandle: "b" },
  ];
  const result = solveDcCircuit(nodes, edges, [{ componentId: "r1", type: "short" }]);
  if (result.ok) {
    check("short fault: current is huge", Math.abs(result.readings.r1!.currentA!) > 1000, `got ${result.readings.r1?.currentA}A`);
    check("short fault: warning set", Boolean(result.readings.r1!.warning), "expected a warning string");
  } else {
    check("short fault: solved", false, result.error);
  }
}

// 7. A resistor with NO wires to the rest of the circuit at all (genuinely isolated, not just a
// dead end) — must be excluded, not fed into a singular matrix.
{
  const nodes: CircuitNode[] = [
    { id: "src", kind: "voltage-source", label: "V", value: 12, position: { x: 0, y: 0 } },
    { id: "r1", kind: "resistor", label: "R1", value: 100, position: { x: 0, y: 0 } },
    { id: "floating", kind: "resistor", label: "R2", value: 100, position: { x: 0, y: 0 } },
  ];
  const edges: CircuitEdge[] = [{ id: "e1", source: "src", sourceHandle: "a", target: "r1", targetHandle: "a" }, { id: "e2", source: "r1", sourceHandle: "b", target: "src", targetHandle: "b" }];
  const result = solveDcCircuit(nodes, edges);
  if (result.ok) {
    check("floating component: not connected", result.readings.floating!.connected === false, `got connected=${result.readings.floating?.connected}`);
  } else {
    check("floating component: solved", false, result.error);
  }
}

console.log(results.join("\n"));
console.log(failures === 0 ? `\n✓ PASS — all ${results.length} checks passed.` : `\n✗ FAIL — ${failures}/${results.length} checks failed.`);
if (failures > 0) process.exit(1);

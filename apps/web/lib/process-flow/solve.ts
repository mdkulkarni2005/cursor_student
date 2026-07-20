import { EQUIPMENT_META, IS_BOUNDARY } from "@/lib/process-flow/equipment-defaults";
import type { ProcessNode, ProcessEdge, BalanceResult } from "@/lib/process-flow/types";

const TOLERANCE_KG_H = 0.5;

/**
 * Deterministic mass-balance check — no AI call. For every piece of equipment with at least one
 * connected stream, total inflow must equal total outflow (steady-state conservation of mass).
 * A node with streams on only one side (dangling — feed with no product, or vice versa) is also
 * flagged, since a real process can't lose or create mass at a piece of equipment.
 */
export function checkMassBalance(nodes: ProcessNode[], edges: ProcessEdge[]): BalanceResult {
  const issues: BalanceResult["issues"] = [];

  for (const node of nodes) {
    if (IS_BOUNDARY[node.kind]) continue;
    const inflow = edges.filter((e) => e.target === node.id).reduce((sum, e) => sum + e.flowRate, 0);
    const outflow = edges.filter((e) => e.source === node.id).reduce((sum, e) => sum + e.flowRate, 0);
    const hasIn = edges.some((e) => e.target === node.id);
    const hasOut = edges.some((e) => e.source === node.id);
    if (!hasIn && !hasOut) continue;

    const label = `${node.label} (${EQUIPMENT_META[node.kind].label})`;
    if (hasIn && !hasOut) {
      issues.push({ nodeId: node.id, message: `${label}: ${inflow.toFixed(1)} kg/h flowing in with no outlet stream connected.` });
    } else if (hasOut && !hasIn) {
      issues.push({ nodeId: node.id, message: `${label}: ${outflow.toFixed(1)} kg/h flowing out with no inlet stream connected.` });
    } else if (Math.abs(inflow - outflow) > TOLERANCE_KG_H) {
      issues.push({ nodeId: node.id, message: `${label}: inflow ${inflow.toFixed(1)} kg/h ≠ outflow ${outflow.toFixed(1)} kg/h.` });
    }
  }

  return { issues, balanced: issues.length === 0 };
}

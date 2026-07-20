import { AppShell } from "@/components/app-shell";
import { requireOnboardedUser, shellUserFrom } from "@/lib/user";
import { getCircuitDraft } from "@/lib/circuits/practice";
import { CircuitWorkspace } from "@/components/circuits/circuit-workspace";
import { COMPONENT_META, WIRE_STYLE } from "@/lib/circuits/component-defaults";
import type { Node, Edge } from "@xyflow/react";

export default async function CircuitBuilderPage() {
  const user = await requireOnboardedUser();
  const draft = await getCircuitDraft(user.id);

  const initialCanvas = draft
    ? {
        nodes: draft.nodes.map(
          (n): Node => ({
            id: n.id,
            type: "component",
            position: n.position,
            data: { kind: n.kind, label: n.label || COMPONENT_META[n.kind].label, value: n.value, unit: COMPONENT_META[n.kind].unit, closed: n.closed },
          }),
        ),
        edges: draft.edges.map((e): Edge => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle, targetHandle: e.targetHandle, ...WIRE_STYLE })),
      }
    : undefined;

  return (
    <AppShell user={await shellUserFrom(user)}>
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted">Electrical Engineering</p>
          <h1 className="mt-1 font-display text-[22px] font-bold leading-tight text-ink">Circuit Builder</h1>
          <p className="mt-1 text-[13px] text-soft">
            Drag components onto the grid, wire terminals together, then click Run for a real DC circuit simulation — current, voltage, LED glow, and motor spin.
          </p>
        </div>

        <CircuitWorkspace initialCanvas={initialCanvas} studentName={user.name ?? undefined} />
      </div>
    </AppShell>
  );
}

import { AppShell } from "@/components/app-shell";
import { requireOnboardedUser, shellUserFrom } from "@/lib/user";
import { getLogicSimDraft } from "@/lib/logic-sim/practice";
import { LogicWorkspace } from "@/components/logic-sim/logic-workspace";
import type { Node, Edge } from "@xyflow/react";

export default async function DigitalLogicSimPage() {
  const user = await requireOnboardedUser();
  const draft = await getLogicSimDraft(user.id);

  const initialCanvas = draft
    ? {
        nodes: draft.nodes.map(
          (n): Node => ({
            id: n.id,
            type: "gate",
            position: n.position,
            data: { kind: n.kind, label: n.label, state: n.state },
          }),
        ),
        edges: draft.edges.map((e): Edge => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle, targetHandle: e.targetHandle })),
      }
    : undefined;

  return (
    <AppShell user={await shellUserFrom(user)}>
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted">Electronics & Communication</p>
          <h1 className="mt-1 font-display text-[22px] font-bold leading-tight text-ink">Digital Logic Simulator</h1>
          <p className="mt-1 text-[13px] text-soft">
            Drag AND/OR/NOT/NAND/NOR/XOR gates and a D flip-flop onto the bench, wire them up, flip switches, then click Run for live LED outputs and an auto-generated truth table.
          </p>
        </div>

        <LogicWorkspace initialCanvas={initialCanvas} studentName={user.name ?? undefined} />
      </div>
    </AppShell>
  );
}

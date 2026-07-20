import { AppShell } from "@/components/app-shell";
import { requireOnboardedUser, shellUserFrom } from "@/lib/user";
import { getProcessFlowDraft } from "@/lib/process-flow/practice";
import { ProcessWorkspace } from "@/components/process-flow/process-workspace";
import type { Node, Edge } from "@xyflow/react";

export default async function ProcessFlowBuilderPage() {
  const user = await requireOnboardedUser();
  const draft = await getProcessFlowDraft(user.id);

  const initialCanvas = draft
    ? {
        nodes: draft.nodes.map(
          (n): Node => ({
            id: n.id,
            type: "equipment",
            position: n.position,
            data: { kind: n.kind, label: n.label },
          }),
        ),
        edges: draft.edges.map(
          (e): Edge => ({
            id: e.id,
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle,
            targetHandle: e.targetHandle,
            label: `${e.flowRate} kg/h`,
            data: { flowRate: e.flowRate },
          }),
        ),
      }
    : undefined;

  return (
    <AppShell user={await shellUserFrom(user)}>
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted">Chemical Engineering</p>
          <h1 className="mt-1 font-display text-[22px] font-bold leading-tight text-ink">Process Flow Builder</h1>
          <p className="mt-1 text-[13px] text-soft">
            Drag reactors, distillation columns, heat exchangers, and pumps onto the sheet, wire streams between them, set flow rates, then Check Balance to catch mass-conservation mistakes.
          </p>
        </div>

        <ProcessWorkspace initialCanvas={initialCanvas} studentName={user.name ?? undefined} />
      </div>
    </AppShell>
  );
}

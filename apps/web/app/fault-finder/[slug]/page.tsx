import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { requireOnboardedUser, shellUserFrom } from "@/lib/user";
import { FAULT_FINDER_BY_SLUG, publicNetlist, type FaultFinderDifficulty } from "@/lib/fault-finder/catalog";
import { COMPONENT_META, WIRE_STYLE } from "@/lib/circuits/component-defaults";
import { FaultFinderWorkspace } from "@/components/fault-finder/fault-finder-workspace";
import type { Node, Edge } from "@xyflow/react";

const DIFF_STYLE: Record<FaultFinderDifficulty, string> = {
  easy: "text-success bg-success/12",
  medium: "text-warning bg-warning/12",
  hard: "text-danger bg-danger/12",
};

export default async function FaultFinderScenarioPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireOnboardedUser();
  const scenario = FAULT_FINDER_BY_SLUG[slug];
  if (!scenario) notFound();

  // Only the public netlist (topology + rated values) reaches the client — never the fault itself.
  const netlist = publicNetlist(scenario);
  const nodes: Node[] = netlist.nodes.map((n) => ({
    id: n.id,
    type: "component",
    position: n.position,
    data: { kind: n.kind, label: n.label || COMPONENT_META[n.kind].label, value: n.value, unit: COMPONENT_META[n.kind].unit, closed: n.closed },
  }));
  const edges: Edge[] = netlist.edges.map((e) => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle, targetHandle: e.targetHandle, ...WIRE_STYLE }));

  return (
    <AppShell user={await shellUserFrom(user)}>
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Link href="/fault-finder" className="text-[12.5px] text-muted transition-colors hover:text-cyan">← Scenarios</Link>
          <span className="text-line-strong">·</span>
          <h1 className="font-display text-[22px] font-bold leading-tight text-ink">{scenario.title}</h1>
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${DIFF_STYLE[scenario.difficulty]}`}>{scenario.difficulty}</span>
        </div>

        <div className="mb-4 rounded-xl border border-line bg-card px-4 py-3">
          <p className="text-[13.5px] leading-relaxed text-soft">{scenario.description}</p>
        </div>

        <div className="mb-4 rounded-xl border border-cyan/25 bg-cyan/5 px-4 py-3">
          <p className="text-[12.5px] leading-relaxed text-soft">
            <span className="font-semibold text-cyan">How to find it:</span> the numbers on each component (e.g. "100Ω") are its <em>rated</em> value —
            printed on the part, always correct, never changes. The fault is invisible on the diagram itself. Click (or Tab to, then press Enter on)
            each component to take a <span className="font-semibold text-ink">multimeter reading</span> — that's the <em>actual</em> current/voltage in
            the real circuit right now. Compare readings against what the rated values predict; wherever they disagree is your fault.
          </p>
        </div>

        <FaultFinderWorkspace slug={slug} components={netlist.nodes} initialNodes={nodes} edges={edges} />
      </div>
    </AppShell>
  );
}

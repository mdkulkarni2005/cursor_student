import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { requireOnboardedUser, shellUserFrom } from "@/lib/user";
import { SYSTEM_DESIGN_BY_SLUG, type SystemDesignDifficulty } from "@/lib/system-design/catalog";
import { getOpeningCanvas } from "@/lib/system-design/practice";
import { DesignWorkspace } from "@/components/system-design/design-workspace";
import { COMPONENT_LABEL } from "@/components/system-design/component-types";
import type { Node, Edge } from "@xyflow/react";

const DIFF_STYLE: Record<SystemDesignDifficulty, string> = {
  easy: "text-success bg-success/12",
  medium: "text-warning bg-warning/12",
  hard: "text-danger bg-danger/12",
};

export default async function SystemDesignScenarioPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireOnboardedUser();
  const scenario = SYSTEM_DESIGN_BY_SLUG[slug];
  if (!scenario) notFound();

  const opening = await getOpeningCanvas(user.id, slug);

  const initialCanvas = opening
    ? {
        nodes: opening.canvas.nodes.map(
          (n): Node => ({ id: n.id, type: "component", position: n.position, data: { kind: n.kind, label: n.label || COMPONENT_LABEL[n.kind] } }),
        ),
        edges: opening.canvas.edges.map((e): Edge => ({ id: e.id, source: e.source, target: e.target })),
      }
    : undefined;

  return (
    <AppShell user={await shellUserFrom(user)}>
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Link href="/system-design" className="text-[12.5px] text-muted transition-colors hover:text-cyan">← Scenarios</Link>
          <span className="text-line-strong">·</span>
          <h1 className="font-display text-[22px] font-bold leading-tight text-ink">{scenario.title}</h1>
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${DIFF_STYLE[scenario.difficulty]}`}>{scenario.difficulty}</span>
        </div>

        <div className="mb-4 rounded-xl border border-line bg-card px-4 py-3">
          <p className="text-[13.5px] leading-relaxed text-soft">{scenario.prompt}</p>
          {scenario.hints.length > 0 ? (
            <ul className="mt-2 space-y-1">
              {scenario.hints.map((h, i) => (
                <li key={i} className="text-[12.5px] text-faint">💡 {h}</li>
              ))}
            </ul>
          ) : null}
        </div>

        <DesignWorkspace scenario={scenario} initialCanvas={initialCanvas} initialReview={opening?.review ?? null} />
      </div>
    </AppShell>
  );
}

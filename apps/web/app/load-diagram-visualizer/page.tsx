import { AppShell } from "@/components/app-shell";
import { requireOnboardedUser, shellUserFrom } from "@/lib/user";
import { LoadDiagramWorkspace } from "@/components/load-diagram/load-diagram-workspace";

export default async function LoadDiagramVisualizerPage() {
  const user = await requireOnboardedUser();

  return (
    <AppShell user={await shellUserFrom(user)}>
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted">Civil Engineering</p>
          <h1 className="mt-1 font-display text-[22px] font-bold leading-tight text-ink">Load Diagram Visualizer</h1>
          <p className="mt-1 text-[13px] text-soft">
            Set a beam span, add point loads and UDLs, and watch the shear force and bending moment diagrams update live.
          </p>
        </div>

        <LoadDiagramWorkspace />
      </div>
    </AppShell>
  );
}

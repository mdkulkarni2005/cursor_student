import { AppShell } from "@/components/app-shell";
import { requireOnboardedUser, shellUserFrom } from "@/lib/user";
import { MaterialTestWorkspace } from "@/components/material-test/material-test-workspace";

export default async function MaterialTestSimulatorPage() {
  const user = await requireOnboardedUser();

  return (
    <AppShell user={await shellUserFrom(user)}>
      <div className="mx-auto max-w-[1300px]">
        <div className="mb-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted">Civil Engineering</p>
          <h1 className="mt-1 font-display text-[22px] font-bold leading-tight text-ink">Soil / Material Test Simulator</h1>
          <p className="mt-1 text-[13px] text-soft">
            Run a slump test or a cube compression test, watch the animated procedure, and see a pass/fail verdict against IS code limits.
          </p>
        </div>

        <MaterialTestWorkspace />
      </div>
    </AppShell>
  );
}

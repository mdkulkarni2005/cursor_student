import { AppShell } from "@/components/app-shell";
import { requireOnboardedUser, shellUserFrom } from "@/lib/user";
import { OpAmpWorkspace } from "@/components/opamp-trainer/opamp-workspace";

export default async function OpAmpTrainerPage() {
  const user = await requireOnboardedUser();

  return (
    <AppShell user={await shellUserFrom(user)}>
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted">Electronics & Communication</p>
          <h1 className="mt-1 font-display text-[22px] font-bold leading-tight text-ink">Op-Amp Circuit Trainer</h1>
          <p className="mt-1 text-[13px] text-soft">
            Pick an inverting, non-inverting, or summing configuration, tune the resistors, and watch gain, output voltage, and the output waveform update live.
          </p>
        </div>

        <OpAmpWorkspace />
      </div>
    </AppShell>
  );
}

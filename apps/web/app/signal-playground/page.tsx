import { AppShell } from "@/components/app-shell";
import { requireOnboardedUser, shellUserFrom } from "@/lib/user";
import { SignalWorkspace } from "@/components/signal-playground/signal-workspace";

export default async function SignalPlaygroundPage() {
  const user = await requireOnboardedUser();

  return (
    <AppShell user={await shellUserFrom(user)}>
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted">Electronics & Communication</p>
          <h1 className="mt-1 font-display text-[22px] font-bold leading-tight text-ink">Signal Playground</h1>
          <p className="mt-1 text-[13px] text-soft">
            Shape a sine, square, or triangle wave, run it through a low-pass or high-pass filter, and watch the input and output traces live.
          </p>
        </div>

        <SignalWorkspace />
      </div>
    </AppShell>
  );
}

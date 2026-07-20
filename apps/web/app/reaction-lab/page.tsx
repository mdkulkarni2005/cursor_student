import { AppShell } from "@/components/app-shell";
import { requireOnboardedUser, shellUserFrom } from "@/lib/user";
import { ReactionWorkspace } from "@/components/reaction-lab/reaction-workspace";

export default async function ReactionLabPage() {
  const user = await requireOnboardedUser();

  return (
    <AppShell user={await shellUserFrom(user)}>
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted">Chemical Engineering</p>
          <h1 className="mt-1 font-display text-[22px] font-bold leading-tight text-ink">Virtual Reaction Lab</h1>
          <p className="mt-1 text-[13px] text-soft">
            Pick two reagents from the shelf and mix them — watch color changes, gas bubbles, or a precipitate form, with the equation, product, and reaction type called out. Some combinations aren't safe to mix — expect a blast.
          </p>
        </div>

        <ReactionWorkspace />
      </div>
    </AppShell>
  );
}

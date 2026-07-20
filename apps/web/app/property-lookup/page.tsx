import { AppShell } from "@/components/app-shell";
import { requireOnboardedUser, shellUserFrom } from "@/lib/user";
import { PropertyWorkspace } from "@/components/property-lookup/property-workspace";

export default async function PropertyLookupPage() {
  const user = await requireOnboardedUser();

  return (
    <AppShell user={await shellUserFrom(user)}>
      <div className="mx-auto max-w-[1100px]">
        <div className="mb-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted">Chemical Engineering</p>
          <h1 className="mt-1 font-display text-[22px] font-bold leading-tight text-ink">Property Lookup Tool</h1>
          <p className="mt-1 text-[13px] text-soft">
            Pick a compound and explore boiling point, density, molarity, and concentration on live interactive charts — not static values.
          </p>
        </div>

        <PropertyWorkspace />
      </div>
    </AppShell>
  );
}

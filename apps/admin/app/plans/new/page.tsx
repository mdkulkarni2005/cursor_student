import { requireAdmin } from "@/lib/admin";
import { NotAuthorized } from "@/components/not-authorized";
import { AdminShell } from "@/components/shell";
import { PlanTierForm } from "../plan-tier-form";
import { createPlanTier } from "../actions";

export const metadata = { title: "New plan — Admin" };

export default async function NewPlanTierPage() {
  const guard = await requireAdmin();
  if (!guard.ok) return <NotAuthorized reason={guard.reason} />;

  return (
    <AdminShell>
      <div className="mb-5">
        <h1 className="font-display text-[24px] font-bold text-ink">New plan tier</h1>
        <p className="mt-1 text-[13px] text-muted">Leave a quota unlimited by checking its box — anything unset never blocks a user.</p>
      </div>
      <PlanTierForm action={createPlanTier} />
    </AdminShell>
  );
}

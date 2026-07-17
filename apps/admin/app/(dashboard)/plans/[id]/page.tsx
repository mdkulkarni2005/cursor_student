import { notFound } from "next/navigation";
import { prisma } from "@studentos/db";
import { requireAdmin } from "@/lib/admin";
import { NotAuthorized } from "@/components/not-authorized";
import { PlanTierForm, type PlanLimitsJson } from "../plan-tier-form";
import { updatePlanTier } from "../actions";
import { SetBreadcrumb } from "@/components/set-breadcrumb";

export const metadata = { title: "Edit plan — Admin" };

export default async function EditPlanTierPage({ params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (!guard.ok) return <NotAuthorized reason={guard.reason} />;

  const { id } = await params;
  const tier = await prisma.planTier.findUnique({ where: { id } });
  if (!tier) return notFound();

  const boundUpdate = async (formData: FormData) => {
    "use server";
    await updatePlanTier(id, formData);
  };

  return (
    <>
      <SetBreadcrumb label={tier.name} />
      <div className="mb-5">
        <h1 className="font-display text-[26px] font-bold text-ink">Edit {tier.name}</h1>
        <p className="mt-1 text-[15px] text-muted">
          {tier.audience === "STUDENT" ? "Student" : tier.audience === "PROFESSIONAL" ? "Working professional" : "Recruiter"} plan
          tier — {tier.slug}
        </p>
      </div>
      <PlanTierForm
        action={boundUpdate}
        initial={{
          audience: tier.audience,
          slug: tier.slug,
          name: tier.name,
          description: tier.description,
          priceCents: tier.priceCents,
          currency: tier.currency,
          billingPeriod: tier.billingPeriod,
          trialDays: tier.trialDays,
          isFree: tier.isFree,
          sortOrder: tier.sortOrder,
          limits: tier.limits as PlanLimitsJson,
        }}
      />
    </>
  );
}

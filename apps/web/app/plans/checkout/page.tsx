import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma, type PlanLimits } from "@studentos/db";
import { AppShell } from "@/components/app-shell";
import { requireOnboardedUser, shellUserFrom } from "@/lib/user";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { StarIcon } from "@/components/icons";

export const metadata = { title: "Checkout — krackit" };

const USAGE_LABEL: Record<string, string> = {
  ASSIGNMENT: "Assignments",
  REPORT: "Reports",
  PPT: "PPTs",
  LAB_REPORT: "Lab reports",
  BRANCH_SOLVER: "Branch-solver tools",
};

const FEATURE_LABEL: Record<string, string> = {
  priorityQueue: "Priority generation queue",
  mentorReview: "1:1 mentor reviews",
  earlyAccess: "Early access to new modules",
};

function featuresFor(limits: PlanLimits): string[] {
  const usage = Object.entries(limits.usage)
    .filter(([, v]) => v !== 0)
    .map(([k, v]) => `${v === null || v === undefined ? "Unlimited" : v} ${USAGE_LABEL[k] ?? k} / month`);
  const features = Object.entries(limits.features)
    .filter(([, on]) => on)
    .map(([k]) => FEATURE_LABEL[k] ?? k);
  return [...usage, ...features];
}

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const user = await requireOnboardedUser();
  const { plan } = await searchParams;
  if (!plan) return notFound();

  const tier = await prisma.planTier.findFirst({ where: { id: plan, audience: "STUDENT", active: true } });
  if (!tier || tier.isFree || tier.priceCents <= 0) return notFound();

  const amountLabel = `₹${(tier.priceCents / 100).toLocaleString("en-IN")}`;
  const features = featuresFor(tier.limits as PlanLimits);

  return (
    <AppShell user={await shellUserFrom(user)}>
      <div className="mx-auto max-w-[1080px]">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-[26px] font-semibold tracking-tight text-cyan">Upgrade Your Intelligence</h1>
            <p className="text-[13.5px] text-muted">Secure checkout for krackit</p>
          </div>
          <span className="flex w-fit items-center gap-2 rounded-full border border-line bg-card px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
            <span className="size-2 rounded-full bg-teal" />
            256-Bit SSL Secured
          </span>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Order summary */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-line bg-card p-6">
              <span className="mb-3 inline-block rounded-full bg-cyan/10 px-3 py-1 text-[12px] font-semibold text-cyan">
                Selected Plan
              </span>
              <div className="flex items-end justify-between">
                <h2 className="font-display text-[20px] font-semibold text-ink">{tier.name}</h2>
                <div className="font-display text-[20px] font-semibold text-ink">
                  {amountLabel}
                  <span className="text-[13px] font-normal text-muted">/{tier.billingPeriod === "yearly" ? "yr" : "mo"}</span>
                </div>
              </div>
              <Link href="/plans" className="text-[12px] font-semibold text-cyan hover:underline">
                Change Plan
              </Link>
              <ul className="mt-6 space-y-3 border-t border-line pt-6">
                {features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-[13.5px] text-soft">
                    <StarIcon size={15} className="mt-0.5 shrink-0 text-cyan" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-line bg-surface p-6">
              <h3 className="mb-4 text-[12px] font-bold uppercase tracking-widest text-muted">Order Summary</h3>
              <div className="space-y-2.5 text-[13.5px]">
                <div className="flex justify-between text-soft">
                  <span>{tier.name} ({tier.billingPeriod})</span>
                  <span>{amountLabel}</span>
                </div>
                <div className="mt-3 flex justify-between border-t border-line pt-3 font-display text-[17px] font-bold text-ink">
                  <span>Total Due</span>
                  <span>{amountLabel}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment */}
          <div className="overflow-hidden rounded-2xl border border-line bg-card">
            <div className="flex items-center justify-between bg-cyan/10 px-6 py-4">
              <div>
                <h3 className="font-display text-[17px] font-semibold text-ink">Secure Payment</h3>
                <p className="text-[12px] text-muted">Powered by Razorpay</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-semibold uppercase text-muted">Total Due</p>
                <p className="font-display text-[18px] font-bold text-cyan">{amountLabel}</p>
              </div>
            </div>
            <div className="p-6">
              <CheckoutForm planTierId={tier.id} amountLabel={amountLabel} userEmail={user.email} userName={user.name ?? undefined} />
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

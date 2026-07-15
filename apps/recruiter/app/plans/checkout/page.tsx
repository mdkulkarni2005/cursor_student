import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma, type PlanLimits } from "@studentos/db";
import { requireRecruiter } from "@/lib/recruiter";
import { NotAuthorized } from "@/components/not-authorized";
import { RecruiterShell } from "@/components/shell";
import { CheckoutForm } from "@/components/checkout-form";

export const metadata = { title: "Checkout — Recruiter" };

const USAGE_LABEL: Record<string, string> = {
  JOB_POSTING: "Job postings",
  CANDIDATE_CONTACT: "Candidate contacts",
};

const FEATURE_LABEL: Record<string, string> = {
  priorityQueue: "Priority candidate matching",
  mentorReview: "Dedicated account manager",
  earlyAccess: "Early access to new modules",
};

function featuresFor(limits: PlanLimits): string[] {
  const usage = Object.entries(limits.recruiterUsage)
    .filter(([, v]) => v !== 0)
    .map(([k, v]) => `${v === null || v === undefined ? "Unlimited" : v} ${USAGE_LABEL[k] ?? k} / month`);
  const features = Object.entries(limits.features)
    .filter(([, on]) => on)
    .map(([k]) => FEATURE_LABEL[k] ?? k);
  return [...usage, ...features];
}

export default async function RecruiterCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const guard = await requireRecruiter();
  if (!guard.ok) return <NotAuthorized reason={guard.reason} />;

  const { plan } = await searchParams;
  if (!plan) return notFound();

  const tier = await prisma.planTier.findFirst({ where: { id: plan, audience: "RECRUITER", active: true } });
  if (!tier || tier.isFree || tier.priceCents <= 0) return notFound();

  const amountLabel = `₹${(tier.priceCents / 100).toLocaleString("en-IN")}`;
  const features = featuresFor(tier.limits as PlanLimits);

  return (
    <RecruiterShell>
      <div className="mx-auto max-w-[1080px]">
        <div className="mb-8">
          <h1 className="font-display text-[26px] font-semibold tracking-tight text-cyan">Upgrade your hiring plan</h1>
          <p className="text-[13.5px] text-muted">Secure checkout, powered by Razorpay</p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-line bg-card p-6">
            <span className="mb-3 inline-block rounded-full bg-cyan/10 px-3 py-1 text-[12px] font-semibold text-cyan">Selected Plan</span>
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
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-cyan" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

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
              <CheckoutForm
                planTierId={tier.id}
                amountLabel={amountLabel}
                userEmail={guard.recruiter.email}
                userName={guard.recruiter.name ?? undefined}
              />
            </div>
          </div>
        </div>
      </div>
    </RecruiterShell>
  );
}

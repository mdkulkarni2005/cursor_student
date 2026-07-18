import Link from "next/link";
import { prisma, arePaymentsEnabled, usdCentsToCredits, type PlanLimits } from "@studentos/db";
import { AppShell } from "@/components/app-shell";
import { requireOnboardedUser, shellUserFrom } from "@/lib/user";
import { getActivePlanTier } from "@/lib/entitlements";
import { StarIcon } from "@/components/icons";
import { PromoCodeForm } from "./promo-code-form";

export const metadata = { title: "Plans — krackit" };

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

export default async function PlansPage() {
  const user = await requireOnboardedUser();
  const [tiers, currentTier, paymentsEnabled] = await Promise.all([
    prisma.planTier.findMany({ where: { audience: user.userType, active: true }, orderBy: { sortOrder: "asc" } }),
    getActivePlanTier(user),
    arePaymentsEnabled(),
  ]);
  const isProfessional = user.userType === "PROFESSIONAL";

  return (
    <AppShell user={await shellUserFrom(user)}>
      <div className="mx-auto max-w-[1080px]">
        <header className="mb-10 text-center">
          <h1 className="font-display text-[32px] font-bold tracking-tight text-ink">
            {isProfessional ? "Sharpen Your Interview Edge" : "Elevate Your Academic Intelligence"}
          </h1>
          <p className="mx-auto mt-2 max-w-2xl text-[15px] text-muted">
            {isProfessional
              ? "Choose the plan that fits your prep. Unlock unlimited DSA practice, mock interviews, and priority support."
              : "Choose the plan that fits your study needs. Unlock powerful AI features, unlimited projects, and advanced research tools."}
          </p>
        </header>

        <PromoCodeForm />

        {/* Tier cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {tiers.map((t, i) => {
            const isCurrent = currentTier.id === t.id;
            const highlight = !t.isFree && i === Math.min(1, tiers.length - 1);
            const limits = t.limits as PlanLimits;
            const features = featuresFor(limits);
            const credits = limits.maxMonthlyAiCostCents == null ? null : usdCentsToCredits(limits.maxMonthlyAiCostCents);
            return (
              <div
                key={t.id}
                className={`relative flex flex-col rounded-3xl border p-7 ${
                  highlight
                    ? "border-cyan bg-gradient-to-br from-cyan/8 to-indigo/8 shadow-[0_18px_40px_rgba(246,146,30,0.12)]"
                    : "border-line bg-card"
                }`}
              >
                {highlight && !isCurrent && (
                  <span className="absolute right-4 top-4 rounded-full bg-cyan px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-on-accent">
                    Most Popular
                  </span>
                )}
                {isCurrent && (
                  <span className="absolute right-4 top-4 rounded-full bg-teal/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-teal">
                    Current Plan
                  </span>
                )}
                <h3 className="font-display text-[20px] font-bold text-ink">{t.name}</h3>
                {t.description && <p className="mt-1 text-[13px] text-muted">{t.description}</p>}
                <div className="mt-5 flex items-end gap-1">
                  <span className="font-display text-[36px] font-bold text-ink">₹{(t.priceCents / 100).toLocaleString("en-IN")}</span>
                  {!t.isFree && <span className="mb-1.5 text-[13px] text-muted">/{t.billingPeriod === "yearly" ? "year" : "month"}</span>}
                </div>
                {!t.isFree && !isCurrent && paymentsEnabled ? (
                  <Link
                    href={`/plans/checkout?plan=${t.id}`}
                    className={`mt-6 rounded-xl py-3 text-center text-[14px] font-semibold transition-transform active:scale-95 ${
                      highlight ? "bg-cyan text-on-accent" : "border border-cyan/30 bg-cyan/5 text-cyan hover:bg-cyan/10"
                    }`}
                  >
                    Upgrade to {t.name}
                  </Link>
                ) : !t.isFree && !isCurrent ? (
                  <span className="mt-6 cursor-default rounded-xl border border-line bg-surface py-3 text-center text-[14px] font-semibold text-faint">
                    Launching soon
                  </span>
                ) : (
                  <span className="mt-6 cursor-default rounded-xl border border-line bg-surface py-3 text-center text-[14px] font-semibold text-muted">
                    {isCurrent ? "Current plan" : "Free"}
                  </span>
                )}
                <ul className="mt-6 space-y-3 border-t border-line pt-6">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-[13.5px] text-soft">
                      <StarIcon size={15} className={`mt-0.5 shrink-0 ${highlight ? "text-cyan" : "text-teal"}`} />
                      {f}
                    </li>
                  ))}
                  {features.length === 0 && <li className="text-[13px] text-faint">Unlimited everything.</li>}
                </ul>
                {!t.isFree && (
                  <div className="mt-4 border-t border-line pt-4">
                    <span className="inline-block rounded-md bg-teal/10 px-2 py-1 text-[12.5px] font-semibold text-teal">
                      + {credits === null ? "Unlimited" : credits} credits/mo
                    </span>
                    <p className="mt-1.5 text-[12px] italic text-faint">
                      Every generation and every edit spends credits — priced to break even: no profit, no loss.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
          {tiers.length === 0 && (
            <p className="col-span-full text-center text-[14px] text-faint">
              No plans configured yet — everything is unlimited while the admin sets pricing up.
            </p>
          )}
        </div>
      </div>
    </AppShell>
  );
}

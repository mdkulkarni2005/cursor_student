import Link from "next/link";
import { prisma, type PlanLimits } from "@studentos/db";
import { requireRecruiter } from "@/lib/recruiter";
import { NotAuthorized } from "@/components/not-authorized";
import { RecruiterShell } from "@/components/shell";
import { getActiveRecruiterPlanTier } from "@/lib/entitlements";
import { PromoCodeForm } from "./promo-code-form";

export const metadata = { title: "Plans — Recruiter" };

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

export default async function RecruiterPlansPage() {
  const guard = await requireRecruiter();
  if (!guard.ok) return <NotAuthorized reason={guard.reason} />;

  const [tiers, currentTier] = await Promise.all([
    prisma.planTier.findMany({ where: { audience: "RECRUITER", active: true }, orderBy: { sortOrder: "asc" } }),
    getActiveRecruiterPlanTier(guard.recruiter.id),
  ]);

  return (
    <RecruiterShell>
      <div className="mx-auto max-w-[1080px]">
        <header className="mb-10 text-center">
          <h1 className="font-display text-[28px] font-bold tracking-tight text-ink">Plans for hiring teams</h1>
          <p className="mx-auto mt-2 max-w-2xl text-[14px] text-muted">
            Choose the plan that fits how many candidates you reach out to each month.
          </p>
        </header>

        <PromoCodeForm />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {tiers.map((t, i) => {
            const isCurrent = currentTier.id === t.id;
            const highlight = !t.isFree && i === Math.min(1, tiers.length - 1);
            const features = featuresFor(t.limits as PlanLimits);
            return (
              <div
                key={t.id}
                className={`relative flex flex-col rounded-3xl border p-7 ${
                  highlight ? "border-cyan bg-gradient-to-br from-cyan/8 to-indigo/8" : "border-line bg-card"
                }`}
              >
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
                {!t.isFree && !isCurrent ? (
                  <Link
                    href={`/plans/checkout?plan=${t.id}`}
                    className={`mt-6 rounded-xl py-3 text-center text-[14px] font-semibold transition-transform active:scale-95 ${
                      highlight ? "bg-cyan text-on-accent" : "border border-cyan/30 bg-cyan/5 text-cyan hover:bg-cyan/10"
                    }`}
                  >
                    Upgrade to {t.name}
                  </Link>
                ) : (
                  <span className="mt-6 cursor-default rounded-xl border border-line bg-surface py-3 text-center text-[14px] font-semibold text-muted">
                    {isCurrent ? "Current plan" : "Free"}
                  </span>
                )}
                <ul className="mt-6 space-y-3 border-t border-line pt-6">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-[13.5px] text-soft">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-cyan" />
                      {f}
                    </li>
                  ))}
                  {features.length === 0 && <li className="text-[13px] text-faint">Unlimited everything.</li>}
                </ul>
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
    </RecruiterShell>
  );
}

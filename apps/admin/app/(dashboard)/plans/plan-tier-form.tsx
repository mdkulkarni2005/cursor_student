"use client";

import { useState } from "react";

// Local mirrors of packages/db enums/types — deliberately not imported from "@studentos/db" here
// since that package's index also instantiates PrismaClient, which must never end up in a client
// bundle. Keep these lists in sync with the Prisma schema's UsageKind/RecruiterUsageKind and
// packages/db/src/plan-limits.ts's FEATURE_KEYS.
const USAGE_KINDS = ["ASSIGNMENT", "REPORT", "PPT", "LAB_REPORT", "BRANCH_SOLVER", "INTERVIEW", "DSA", "SYSTEM_DESIGN"] as const;
const RECRUITER_USAGE_KINDS = ["JOB_POSTING", "CANDIDATE_CONTACT"] as const;
const FEATURE_KEYS = ["priorityQueue", "mentorReview", "earlyAccess"] as const;
// Keep in sync with packages/db/src/plan-limits.ts USD_TO_INR_RATE.
const USD_TO_INR_RATE = 85;

export type PlanLimitsJson = {
  usage?: Record<string, number | null>;
  features?: Record<string, boolean>;
  recruiterUsage?: Record<string, number | null>;
  maxMonthlyAiCostCents?: number | null;
};

export type PlanTierInitial = {
  audience: "STUDENT" | "PROFESSIONAL" | "RECRUITER";
  slug: string;
  name: string;
  description: string | null;
  priceCents: number;
  currency: string;
  billingPeriod: string;
  trialDays: number;
  isFree: boolean;
  sortOrder: number;
  limits: PlanLimitsJson;
};

const USAGE_LABEL: Record<string, string> = {
  ASSIGNMENT: "Assignments / month",
  REPORT: "Reports / month",
  PPT: "PPTs / month",
  LAB_REPORT: "Lab reports / month",
  BRANCH_SOLVER: "Branch-solver tools / month",
  INTERVIEW: "Mock interview sessions / month",
  DSA: "DSA problem submissions / month",
  SYSTEM_DESIGN: "System design reviews / month",
};

const RECRUITER_USAGE_LABEL: Record<string, string> = {
  JOB_POSTING: "Job postings / month",
  CANDIDATE_CONTACT: "Candidate contacts / month",
};

const FEATURE_LABEL: Record<string, string> = {
  priorityQueue: "Priority generation queue",
  mentorReview: "1:1 mentor reviews",
  earlyAccess: "Early access to new modules",
};

function QuotaField({ name, label, value }: { name: string; label: string; value: number | null | undefined }) {
  const unlimited = value === null || value === undefined;
  return (
    <div className="flex items-center gap-2">
      <span className="w-48 shrink-0 text-[14.5px] text-soft">{label}</span>
      <input
        type="number"
        min={0}
        name={name}
        defaultValue={unlimited ? "" : value}
        disabled={unlimited}
        className="w-24 rounded-lg border border-line bg-input px-2 py-1.5 text-[15px] text-ink disabled:opacity-40"
      />
      <label className="flex items-center gap-1.5 text-[13.5px] text-faint">
        <input
          type="checkbox"
          name={`${name}_unlimited`}
          defaultChecked={unlimited}
          onChange={(e) => {
            const input = e.currentTarget.parentElement?.parentElement?.querySelector<HTMLInputElement>(
              `input[name="${name}"]`,
            );
            if (input) input.disabled = e.currentTarget.checked;
          }}
        />
        Unlimited
      </label>
    </div>
  );
}

/** Shared create/edit form for a PlanTier — posts straight to a server action (see actions.ts).
 *  The "unlimited" checkboxes are the only client behavior, handled inline. */
export function PlanTierForm({
  action,
  initial,
}: {
  action: (formData: FormData) => void | Promise<void>;
  initial?: PlanTierInitial;
}) {
  const usage = initial?.limits.usage ?? {};
  const recruiterUsage = initial?.limits.recruiterUsage ?? {};
  const features = initial?.limits.features ?? {};
  const initialCostCents = initial?.limits.maxMonthlyAiCostCents;
  const initialCredits =
    initialCostCents === null || initialCostCents === undefined
      ? null
      : Math.round((initialCostCents * USD_TO_INR_RATE) / 100);
  const [audience, setAudience] = useState<PlanTierInitial["audience"]>(initial?.audience ?? "STUDENT");

  return (
    <form action={action} className="space-y-5 rounded-2xl border border-line bg-card p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[13.5px] font-semibold uppercase tracking-wide text-faint">Audience</label>
          {/* Disabled fields aren't submitted with a form — mirror the locked value via a hidden
              input so editing an existing tier still posts its audience. */}
          {initial && <input type="hidden" name="audience" value={initial.audience} />}
          <select
            name={initial ? undefined : "audience"}
            defaultValue={initial?.audience ?? "STUDENT"}
            onChange={(e) => setAudience(e.target.value as PlanTierInitial["audience"])}
            disabled={!!initial}
            required
            className="w-full rounded-lg border border-line bg-input px-3 py-2 text-[15px] text-ink disabled:opacity-60"
          >
            <option value="STUDENT">Student</option>
            <option value="PROFESSIONAL">Working professional</option>
            <option value="RECRUITER">Recruiter</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[13.5px] font-semibold uppercase tracking-wide text-faint">Slug</label>
          <input
            name="slug"
            defaultValue={initial?.slug}
            required
            placeholder="pro"
            className="w-full rounded-lg border border-line bg-input px-3 py-2 text-[15px] text-ink placeholder:text-faint"
          />
        </div>
        <div>
          <label className="mb-1 block text-[13.5px] font-semibold uppercase tracking-wide text-faint">Name</label>
          <input
            name="name"
            defaultValue={initial?.name}
            required
            placeholder="Pro"
            className="w-full rounded-lg border border-line bg-input px-3 py-2 text-[15px] text-ink placeholder:text-faint"
          />
        </div>
        <div>
          <label className="mb-1 block text-[13.5px] font-semibold uppercase tracking-wide text-faint">Sort order</label>
          <input
            type="number"
            name="sortOrder"
            defaultValue={initial?.sortOrder ?? 0}
            className="w-full rounded-lg border border-line bg-input px-3 py-2 text-[15px] text-ink"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-[13.5px] font-semibold uppercase tracking-wide text-faint">Description</label>
          <input
            name="description"
            defaultValue={initial?.description ?? ""}
            placeholder="Shown on the pricing page"
            className="w-full rounded-lg border border-line bg-input px-3 py-2 text-[15px] text-ink placeholder:text-faint"
          />
        </div>
        <div>
          <label className="mb-1 block text-[13.5px] font-semibold uppercase tracking-wide text-faint">Price (₹ / period)</label>
          <input
            type="number"
            min={0}
            step={0.01}
            name="priceRupees"
            defaultValue={initial ? initial.priceCents / 100 : 0}
            className="w-full rounded-lg border border-line bg-input px-3 py-2 text-[15px] text-ink"
          />
        </div>
        <div>
          <label className="mb-1 block text-[13.5px] font-semibold uppercase tracking-wide text-faint">Billing period</label>
          <select
            name="billingPeriod"
            defaultValue={initial?.billingPeriod ?? "monthly"}
            className="w-full rounded-lg border border-line bg-input px-3 py-2 text-[15px] text-ink"
          >
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
            <option value="one-time">One-time</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[13.5px] font-semibold uppercase tracking-wide text-faint">Currency</label>
          <input
            name="currency"
            defaultValue={initial?.currency ?? "INR"}
            className="w-full rounded-lg border border-line bg-input px-3 py-2 text-[15px] text-ink"
          />
        </div>
        <div>
          <label className="mb-1 block text-[13.5px] font-semibold uppercase tracking-wide text-faint">Trial days (this tier)</label>
          <input
            type="number"
            min={0}
            name="trialDays"
            defaultValue={initial?.trialDays ?? 0}
            className="w-full rounded-lg border border-line bg-input px-3 py-2 text-[15px] text-ink"
          />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-[14.5px] text-soft">
            <input type="checkbox" name="isFree" defaultChecked={initial?.isFree ?? false} />
            This is the default free tier for its audience
          </label>
        </div>
        <div className="sm:col-span-2">
          <p className="text-[13px] text-faint">
            Only one tier per audience can be the default free plan — checking this box unchecks it on any other tier.
          </p>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-[14px] font-bold uppercase tracking-widest text-muted">Monthly AI credits</h3>
        <p className="mb-2 text-[13px] text-faint">
          1 credit ≈ ₹1 of real AI cost. Every generation <em>and every edit or regeneration</em> spends from this
          balance — it&apos;s the hard break-even backstop underneath the quotas below. Leave unlimited to fall
          back to the platform-wide default cap.
        </p>
        <QuotaField name="credits" label="Credits / month" value={initialCredits} />
      </div>

      {audience === "STUDENT" && (
        <div>
          <h3 className="mb-2 text-[14px] font-bold uppercase tracking-widest text-muted">Student usage limits</h3>
          <div className="space-y-2">
            {USAGE_KINDS.map((kind) => (
              <QuotaField key={kind} name={`usage_${kind}`} label={USAGE_LABEL[kind] ?? kind} value={usage[kind]} />
            ))}
          </div>
        </div>
      )}

      {audience === "RECRUITER" && (
        <div>
          <h3 className="mb-2 text-[14px] font-bold uppercase tracking-widest text-muted">Recruiter usage limits</h3>
          <div className="space-y-2">
            {RECRUITER_USAGE_KINDS.map((kind) => (
              <QuotaField
                key={kind}
                name={`recruiterUsage_${kind}`}
                label={RECRUITER_USAGE_LABEL[kind] ?? kind}
                value={recruiterUsage[kind]}
              />
            ))}
          </div>
        </div>
      )}

      {audience === "PROFESSIONAL" && (
        <div>
          <h3 className="mb-2 text-[14px] font-bold uppercase tracking-widest text-muted">Usage limits</h3>
          <p className="mb-2 text-[13px] text-faint">
            Working professionals only get DSA practice + mock interviews — the document-generation tools above are
            student-only.
          </p>
          <div className="space-y-2">
            {(["INTERVIEW", "DSA"] as const).map((kind) => (
              <QuotaField key={kind} name={`usage_${kind}`} label={USAGE_LABEL[kind]} value={usage[kind]} />
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="mb-2 text-[14px] font-bold uppercase tracking-widest text-muted">Feature toggles</h3>
        <div className="space-y-2">
          {FEATURE_KEYS.map((key) => (
            <label key={key} className="flex items-center gap-2 text-[14.5px] text-soft">
              <input type="checkbox" name={`feature_${key}`} defaultChecked={features[key] ?? false} />
              {FEATURE_LABEL[key] ?? key}
            </label>
          ))}
        </div>
      </div>

      {!initial && (
        <div className="rounded-xl border border-line/60 bg-surface p-3">
          <label className="flex items-start gap-2 text-[14.5px] text-soft">
            <input type="checkbox" name="applyToAllUsers" className="mt-0.5" />
            <span>
              Apply this plan to all existing users in this audience now.
              <br />
              <span className="text-[13px] text-faint">
                Students/professionals: grants everyone in this audience the tier immediately (an active paid
                subscription still wins). Recruiters: skips anyone with a real active paid subscription.
              </span>
            </span>
          </label>
        </div>
      )}

      <button type="submit" className="rounded-lg bg-cyan px-4 py-2 text-[15px] font-semibold text-on-accent hover:opacity-90">
        {initial ? "Save changes" : "Create tier"}
      </button>
    </form>
  );
}

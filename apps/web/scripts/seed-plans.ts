/**
 * Seeds the 7 launch PlanTier rows (Student: Free/Standard/Pro, Professional: Free/Standard/Pro,
 * Recruiter: Free/Standard/Pro). Idempotent — upserts by (audience, slug), safe to re-run.
 *
 * Pricing + limits here mirror the approved break-even pricing plan (see the pricing-plan artifact
 * reviewed with the founder): each paid tier's price already covers its own AI-cost budget +
 * Razorpay's ~2.4% fee + a thin cushion, priced directly rather than derived — the numbers ARE the
 * approved ones, not recomputed. `maxMonthlyAiCostCents` is the user-facing "credits" balance
 * (1 credit ≈ ₹1, see packages/db/src/plan-limits.ts usdCentsToCredits/creditsToUsdCents) — it's the
 * real break-even backstop, enforced on every generation *and* every edit/regeneration/follow-up.
 *
 * Free tiers intentionally carry a 0 credit balance rather than "1 use of everything" — free means
 * full access to browsing/history/downloads with zero new AI generations, not a single-use quota.
 *
 * Seeded with `active: false` — review the rows (or run apps/admin's plan list) before flipping
 * them active, since this DB has real users on it.
 *
 * Run from repo root:
 *   pnpm --filter web seed:plans
 */
import { prisma, creditsToUsdCents } from "@studentos/db";
import type { PlanLimits } from "@studentos/db";

type TierSpec = {
  slug: string;
  name: string;
  description: string;
  isFree?: boolean;
  priceRupees: number;
  credits: number | null; // null = unlimited
  sortOrder: number;
  limits: Partial<Omit<PlanLimits, "maxMonthlyAiCostCents">>;
};

function buildLimits(spec: TierSpec): PlanLimits {
  return {
    usage: spec.limits.usage ?? {},
    features: spec.limits.features ?? {},
    recruiterUsage: spec.limits.recruiterUsage ?? {},
    maxMonthlyAiCostCents: spec.credits === null ? null : creditsToUsdCents(spec.credits),
  };
}

const STUDENT_TIERS: TierSpec[] = [
  {
    slug: "free",
    name: "Free",
    description: "Browse, save, and re-download past work — no card needed. No new AI generations.",
    isFree: true,
    priceRupees: 0,
    credits: 0,
    sortOrder: 0,
    limits: { usage: {} },
  },
  {
    slug: "standard",
    name: "Standard",
    description: "Everyday coursework use across every tool.",
    priceRupees: 199,
    credits: 150,
    sortOrder: 1,
    limits: {
      usage: { ASSIGNMENT: 15, REPORT: 6, PPT: 6, LAB_REPORT: 4, BRANCH_SOLVER: 10, INTERVIEW: 2, DSA: 30 },
    },
  },
  {
    slug: "pro",
    name: "Pro",
    description: "Placement season / heavy use across every tool.",
    priceRupees: 399,
    credits: 320,
    sortOrder: 2,
    limits: {
      usage: { ASSIGNMENT: 30, REPORT: 12, PPT: 12, LAB_REPORT: 8, BRANCH_SOLVER: 20, INTERVIEW: 5, DSA: 60 },
      features: { priorityQueue: true },
    },
  },
];

// Working professionals only get DSA practice + mock interviews (document-generation tools are
// student-only) — resume tailoring and job matching draw purely from the credit balance, no
// separate per-feature quota exists for them.
const PROFESSIONAL_TIERS: TierSpec[] = [
  {
    slug: "free",
    name: "Free",
    description: "Browse problem sets and saved attempts — no card needed. No AI grading, no interviews.",
    isFree: true,
    priceRupees: 0,
    credits: 0,
    sortOrder: 0,
    limits: { usage: {} },
  },
  {
    slug: "standard",
    name: "Standard",
    description: "Regular DSA practice and interview prep.",
    priceRupees: 249,
    credits: 190,
    sortOrder: 1,
    limits: { usage: { DSA: 40, INTERVIEW: 4 } },
  },
  {
    slug: "pro",
    name: "Pro",
    description: "Active interview prep — heavier DSA practice and more mock interviews.",
    priceRupees: 499,
    credits: 390,
    sortOrder: 2,
    limits: { usage: { DSA: 100, INTERVIEW: 10 }, features: { priorityQueue: true } },
  },
];

const RECRUITER_TIERS: TierSpec[] = [
  {
    slug: "free",
    name: "Free",
    description: "Post one role and browse candidates manually — no card needed. No AI candidate matching.",
    isFree: true,
    priceRupees: 0,
    credits: 0,
    sortOrder: 0,
    limits: { recruiterUsage: { JOB_POSTING: 1, CANDIDATE_CONTACT: 5 } },
  },
  {
    slug: "standard",
    name: "Standard",
    description: "Active hiring across a handful of roles, with AI candidate matching.",
    priceRupees: 249,
    credits: 150,
    sortOrder: 1,
    limits: { recruiterUsage: { JOB_POSTING: 5, CANDIDATE_CONTACT: 60 } },
  },
  {
    slug: "pro",
    name: "Pro",
    description: "High-volume hiring with priority support.",
    priceRupees: 599,
    credits: 400,
    sortOrder: 2,
    limits: { recruiterUsage: { JOB_POSTING: 20, CANDIDATE_CONTACT: 200 }, features: { priorityQueue: true } },
  },
];

async function upsertTier(audience: "STUDENT" | "PROFESSIONAL" | "RECRUITER", tier: TierSpec) {
  const priceCents = Math.round(tier.priceRupees * 100);
  const data = {
    audience,
    slug: tier.slug,
    name: tier.name,
    description: tier.description,
    priceCents,
    currency: "INR",
    billingPeriod: "monthly",
    isFree: tier.isFree ?? false,
    sortOrder: tier.sortOrder,
    limits: buildLimits(tier),
  };
  const existing = await prisma.planTier.findFirst({ where: { audience, slug: tier.slug } });
  // On update, leave `active` untouched — an admin may have deliberately flipped it and a reseed
  // shouldn't silently take a live tier down or light up one still under review. New rows still
  // default to `active: false` (DB default) so they always require an explicit go-live step.
  const row = existing
    ? await prisma.planTier.update({ where: { id: existing.id }, data })
    : await prisma.planTier.create({ data: { ...data, active: false } });
  console.log(`  ${audience} / ${tier.slug} -> ₹${priceCents / 100}/mo, ${tier.credits ?? "∞"} credits (id ${row.id}, active=${row.active})`);
}

async function main() {
  console.log("Seeding PlanTier rows (active: false — review before flipping on)...");
  for (const t of STUDENT_TIERS) await upsertTier("STUDENT", t);
  for (const t of PROFESSIONAL_TIERS) await upsertTier("PROFESSIONAL", t);
  for (const t of RECRUITER_TIERS) await upsertTier("RECRUITER", t);
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

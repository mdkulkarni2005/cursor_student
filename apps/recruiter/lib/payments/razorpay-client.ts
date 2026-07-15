import "server-only";
import Razorpay from "razorpay";
import { prisma, type PlanTier } from "@studentos/db";

/**
 * Recruiter-app mirror of apps/web/lib/payments/razorpay-client.ts — duplicated (not imported
 * cross-app) since apps/web and apps/recruiter are separate Next.js deployments. Same Razorpay
 * account/keys, same behavior. Keep both files in sync if the wrapper API changes.
 */
function client(): Razorpay {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) {
    throw new Error("Razorpay is not configured (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET missing)");
  }
  return new Razorpay({ key_id, key_secret });
}

export function razorpayKeyId(): string {
  const key_id = process.env.RAZORPAY_KEY_ID;
  if (!key_id) throw new Error("RAZORPAY_KEY_ID is not configured");
  return key_id;
}

export async function createOrder(params: {
  amountCents: number;
  currency: string;
  receipt: string;
  notes: Record<string, string>;
}): Promise<{ id: string; amount: number; currency: string }> {
  const order = await client().orders.create({
    amount: params.amountCents,
    currency: params.currency,
    receipt: params.receipt,
    notes: params.notes,
  });
  return { id: order.id, amount: Number(order.amount), currency: order.currency };
}

export async function ensureRazorpayPlanId(tier: PlanTier): Promise<string> {
  if (tier.razorpayPlanId) return tier.razorpayPlanId;

  const interval = tier.billingPeriod === "yearly" ? { period: "yearly" as const, interval: 1 } : { period: "monthly" as const, interval: 1 };
  const plan = await client().plans.create({
    period: interval.period,
    interval: interval.interval,
    item: {
      name: `${tier.name} (${tier.audience.toLowerCase()})`,
      amount: tier.priceCents,
      currency: tier.currency,
    },
    notes: { planTierId: tier.id },
  });

  await prisma.planTier.update({ where: { id: tier.id }, data: { razorpayPlanId: plan.id } });
  return plan.id;
}

export async function createSubscription(params: {
  razorpayPlanId: string;
  notes: Record<string, string>;
}): Promise<{ id: string }> {
  const sub = await client().subscriptions.create({
    plan_id: params.razorpayPlanId,
    customer_notify: 1,
    total_count: 120,
    notes: params.notes,
  });
  return { id: sub.id };
}

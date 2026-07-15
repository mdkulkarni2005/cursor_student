import "server-only";
import Razorpay from "razorpay";
import { prisma, type PlanTier } from "@studentos/db";

/**
 * Thin wrapper around the Razorpay Node SDK — the actual "call Razorpay, take a payment" side,
 * as opposed to lib/payments/razorpay-webhook.ts which only records what already happened.
 * Only instantiated lazily (not at module load) so a deploy without keys set yet doesn't crash on
 * import — every caller here throws a clear error instead if the keys are missing.
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

/** One-time order — used to open Razorpay Checkout for a single payment (non-recurring tiers). */
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

/**
 * Ensures a Razorpay Plan exists for this PlanTier's recurring billing, creating (and caching)
 * one on first use. Razorpay Plans are billing-period + amount templates — one per PlanTier is
 * enough since PlanTier itself already carries admin-set price/period.
 */
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

/** Recurring subscription — used for tiers billed monthly/yearly (not "one-time"). */
export async function createSubscription(params: {
  razorpayPlanId: string;
  notes: Record<string, string>;
}): Promise<{ id: string }> {
  const sub = await client().subscriptions.create({
    plan_id: params.razorpayPlanId,
    customer_notify: 1,
    total_count: 120, // effectively "until cancelled" (10 years of monthly cycles)
    notes: params.notes,
  });
  return { id: sub.id };
}

"use server";

import { prisma, arePaymentsEnabled } from "@studentos/db";
import { requireOnboardedUser } from "@/lib/user";
import { createOrder, createSubscription, ensureRazorpayPlanId, razorpayKeyId } from "@/lib/payments/razorpay-client";

/**
 * Kicks off real money movement — creates a Razorpay Order (one-time tiers) or Subscription
 * (recurring tiers) server-side, using the admin-set PlanTier.priceCents as the source of truth.
 * Never trust a client-supplied amount. The returned id is opened client-side via Razorpay
 * Checkout (components/checkout/checkout-form.tsx); /api/checkout/verify + the existing webhook
 * (lib/payments/razorpay-webhook.ts) are what actually mark the Subscription active.
 */
export type CheckoutOrderResult =
  | { mode: "order"; keyId: string; orderId: string; amountCents: number; currency: string; tierName: string }
  | { mode: "subscription"; keyId: string; subscriptionId: string; tierName: string; currency: string };

export async function createCheckoutOrder(planTierId: string): Promise<CheckoutOrderResult> {
  const user = await requireOnboardedUser();
  if (!(await arePaymentsEnabled())) throw new Error("Payments are not live yet");
  const tier = await prisma.planTier.findUnique({ where: { id: planTierId } });
  if (!tier || tier.audience !== user.userType || !tier.active) throw new Error("Plan not available");
  if (tier.isFree || tier.priceCents <= 0) throw new Error("This plan does not require checkout");

  if (tier.billingPeriod === "one-time") {
    const order = await createOrder({
      amountCents: tier.priceCents,
      currency: tier.currency,
      receipt: `student-${user.id}-${Date.now()}`.slice(0, 40),
      notes: { userId: user.id, planTierId: tier.id },
    });
    return { mode: "order", keyId: razorpayKeyId(), orderId: order.id, amountCents: order.amount, currency: order.currency, tierName: tier.name };
  }

  const razorpayPlanId = await ensureRazorpayPlanId(tier);
  const sub = await createSubscription({ razorpayPlanId, notes: { userId: user.id, planTierId: tier.id } });
  return { mode: "subscription", keyId: razorpayKeyId(), subscriptionId: sub.id, tierName: tier.name, currency: tier.currency };
}

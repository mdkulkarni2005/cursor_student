"use server";

import { prisma, arePaymentsEnabled } from "@studentos/db";
import { requireRecruiter } from "@/lib/recruiter";
import { createOrder, createSubscription, ensureRazorpayPlanId, razorpayKeyId } from "@/lib/payments/razorpay-client";

/** Recruiter-side mirror of apps/web/lib/actions/checkout.ts — see that file for the full flow
 *  explanation (order vs subscription, why the amount is always server-computed). */
export type CheckoutOrderResult =
  | { mode: "order"; keyId: string; orderId: string; amountCents: number; currency: string; tierName: string }
  | { mode: "subscription"; keyId: string; subscriptionId: string; tierName: string; currency: string };

export async function createCheckoutOrder(planTierId: string): Promise<CheckoutOrderResult> {
  const guard = await requireRecruiter();
  if (!guard.ok) throw new Error("Not authorized");
  if (!(await arePaymentsEnabled())) throw new Error("Payments are not live yet");

  const tier = await prisma.planTier.findUnique({ where: { id: planTierId } });
  if (!tier || tier.audience !== "RECRUITER" || !tier.active) throw new Error("Plan not available");
  if (tier.isFree || tier.priceCents <= 0) throw new Error("This plan does not require checkout");

  if (tier.billingPeriod === "one-time") {
    const order = await createOrder({
      amountCents: tier.priceCents,
      currency: tier.currency,
      receipt: `recruiter-${guard.recruiter.id}-${Date.now()}`.slice(0, 40),
      notes: { recruiterId: guard.recruiter.id, planTierId: tier.id },
    });
    return { mode: "order", keyId: razorpayKeyId(), orderId: order.id, amountCents: order.amount, currency: order.currency, tierName: tier.name };
  }

  const razorpayPlanId = await ensureRazorpayPlanId(tier);
  const sub = await createSubscription({ razorpayPlanId, notes: { recruiterId: guard.recruiter.id, planTierId: tier.id } });
  return { mode: "subscription", keyId: razorpayKeyId(), subscriptionId: sub.id, tierName: tier.name, currency: tier.currency };
}

import { NextResponse } from "next/server";
import { prisma, arePaymentsEnabled } from "@studentos/db";
import { getOrCreateUser } from "@/lib/user";
import { createOrder, createSubscription, ensureRazorpayPlanId, razorpayKeyId } from "@/lib/payments/razorpay-client";

type CheckoutOrderInput = { planTierId: string };

/**
 * Mobile analogue of apps/web/lib/actions/checkout.ts createCheckoutOrder — same server-side
 * price authority (never trusts a client-supplied amount), just exposed as a route handler so the
 * native Razorpay SDK on Expo can call it instead of a Next.js server action.
 */
export async function POST(req: Request) {
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!(await arePaymentsEnabled())) return NextResponse.json({ error: "Payments are not live yet." }, { status: 403 });

  let body: CheckoutOrderInput;
  try {
    body = (await req.json()) as CheckoutOrderInput;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const tier = await prisma.planTier.findUnique({ where: { id: body.planTierId } });
  if (!tier || tier.audience !== user.userType || !tier.active) return NextResponse.json({ error: "Plan not available." }, { status: 400 });
  if (tier.isFree || tier.priceCents <= 0) return NextResponse.json({ error: "This plan does not require checkout." }, { status: 400 });

  if (tier.billingPeriod === "one-time") {
    const order = await createOrder({
      amountCents: tier.priceCents,
      currency: tier.currency,
      receipt: `student-mobile-${user.id}-${Date.now()}`.slice(0, 40),
      notes: { userId: user.id, planTierId: tier.id },
    });
    return NextResponse.json({
      mode: "order",
      keyId: razorpayKeyId(),
      orderId: order.id,
      amountCents: order.amount,
      currency: order.currency,
      tierName: tier.name,
      planTierId: tier.id,
    });
  }

  const razorpayPlanId = await ensureRazorpayPlanId(tier);
  const sub = await createSubscription({ razorpayPlanId, notes: { userId: user.id, planTierId: tier.id } });
  return NextResponse.json({
    mode: "subscription",
    keyId: razorpayKeyId(),
    subscriptionId: sub.id,
    tierName: tier.name,
    currency: tier.currency,
    planTierId: tier.id,
  });
}

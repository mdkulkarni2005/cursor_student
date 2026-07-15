import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@studentos/db";
import { auth } from "@clerk/nextjs/server";

/**
 * Fast optimistic confirmation path, called by the Razorpay Checkout `handler` callback right
 * after a payment succeeds client-side. Verifies the HMAC per Razorpay's docs
 * (https://razorpay.com/docs/payments/server-integration/nodejs/payment-gateway/build-integration/#step-6-verify-payment-signature)
 * then activates the Subscription immediately so the user isn't stuck waiting on the webhook,
 * which remains the source of truth for renewals/failures (lib/payments/razorpay-webhook.ts).
 */
function verify(payload: string, signature: string, secret: string): boolean {
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

type Body =
  | { mode: "order"; razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string; planTierId: string }
  | { mode: "subscription"; razorpay_subscription_id: string; razorpay_payment_id: string; razorpay_signature: string; planTierId: string };

export async function POST(req: Request): Promise<Response> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return NextResponse.json({ error: "not configured" }, { status: 500 });

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) return NextResponse.json({ error: "no such user" }, { status: 404 });

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const tier = await prisma.planTier.findUnique({ where: { id: body.planTierId } });
  if (!tier || tier.audience !== "STUDENT") return NextResponse.json({ error: "invalid plan" }, { status: 400 });

  if (body.mode === "order") {
    const ok = verify(`${body.razorpay_order_id}|${body.razorpay_payment_id}`, body.razorpay_signature, secret);
    if (!ok) return NextResponse.json({ error: "invalid signature" }, { status: 400 });

    await prisma.subscription.upsert({
      where: { userId: user.id },
      create: { userId: user.id, planTierId: tier.id, status: "ACTIVE" },
      update: { planTierId: tier.id, status: "ACTIVE" },
    });
    await prisma.user.update({ where: { id: user.id }, data: { planTierId: tier.id } });
    return NextResponse.json({ ok: true });
  }

  const ok = verify(`${body.razorpay_payment_id}|${body.razorpay_subscription_id}`, body.razorpay_signature, secret);
  if (!ok) return NextResponse.json({ error: "invalid signature" }, { status: 400 });

  await prisma.subscription.upsert({
    where: { userId: user.id },
    create: { userId: user.id, planTierId: tier.id, status: "ACTIVE", razorpaySubId: body.razorpay_subscription_id },
    update: { planTierId: tier.id, status: "ACTIVE", razorpaySubId: body.razorpay_subscription_id },
  });
  await prisma.user.update({ where: { id: user.id }, data: { planTierId: tier.id } });
  return NextResponse.json({ ok: true });
}

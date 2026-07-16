import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma, arePaymentsEnabled } from "@studentos/db";
import { auth } from "@clerk/nextjs/server";

/** Recruiter-side mirror of apps/web/app/api/checkout/verify/route.ts — see that file for the
 *  full explanation of why this fast path exists alongside the webhook. */
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

  if (!(await arePaymentsEnabled())) return NextResponse.json({ error: "payments not live" }, { status: 403 });

  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return NextResponse.json({ error: "not configured" }, { status: 500 });

  const recruiter = await prisma.recruiter.findUnique({ where: { clerkId } });
  if (!recruiter) return NextResponse.json({ error: "no such recruiter" }, { status: 404 });

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const tier = await prisma.planTier.findUnique({ where: { id: body.planTierId } });
  if (!tier || tier.audience !== "RECRUITER") return NextResponse.json({ error: "invalid plan" }, { status: 400 });

  if (body.mode === "order") {
    const ok = verify(`${body.razorpay_order_id}|${body.razorpay_payment_id}`, body.razorpay_signature, secret);
    if (!ok) return NextResponse.json({ error: "invalid signature" }, { status: 400 });

    await prisma.recruiterSubscription.upsert({
      where: { recruiterId: recruiter.id },
      create: { recruiterId: recruiter.id, planTierId: tier.id, status: "ACTIVE" },
      update: { planTierId: tier.id, status: "ACTIVE" },
    });
    return NextResponse.json({ ok: true });
  }

  const ok = verify(`${body.razorpay_payment_id}|${body.razorpay_subscription_id}`, body.razorpay_signature, secret);
  if (!ok) return NextResponse.json({ error: "invalid signature" }, { status: 400 });

  await prisma.recruiterSubscription.upsert({
    where: { recruiterId: recruiter.id },
    create: { recruiterId: recruiter.id, planTierId: tier.id, status: "ACTIVE", razorpaySubId: body.razorpay_subscription_id },
    update: { planTierId: tier.id, status: "ACTIVE", razorpaySubId: body.razorpay_subscription_id },
  });
  return NextResponse.json({ ok: true });
}

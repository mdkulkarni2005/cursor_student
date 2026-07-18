import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma, arePaymentsEnabled } from "@studentos/db";
import { getOrCreateUser } from "@/lib/user";

/** Same HMAC verification as apps/web/app/api/checkout/verify/route.ts — see that file for the Razorpay doc reference. */
function verify(payload: string, signature: string, secret: string): boolean {
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

type Body =
  | { mode: "order"; razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string; planTierId: string }
  | { mode: "subscription"; razorpay_subscription_id: string; razorpay_payment_id: string; razorpay_signature: string; planTierId: string };

export async function POST(req: Request) {
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!(await arePaymentsEnabled())) return NextResponse.json({ error: "Payments are not live yet." }, { status: 403 });

  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return NextResponse.json({ error: "Not configured." }, { status: 500 });

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const tier = await prisma.planTier.findUnique({ where: { id: body.planTierId } });
  if (!tier || tier.audience !== user.userType) return NextResponse.json({ error: "Invalid plan." }, { status: 400 });

  if (body.mode === "order") {
    const ok = verify(`${body.razorpay_order_id}|${body.razorpay_payment_id}`, body.razorpay_signature, secret);
    if (!ok) return NextResponse.json({ error: "Invalid signature." }, { status: 400 });

    await prisma.subscription.upsert({
      where: { userId: user.id },
      create: { userId: user.id, planTierId: tier.id, status: "ACTIVE" },
      update: { planTierId: tier.id, status: "ACTIVE" },
    });
    await prisma.user.update({ where: { id: user.id }, data: { planTierId: tier.id } });
    return NextResponse.json({ ok: true });
  }

  const ok = verify(`${body.razorpay_payment_id}|${body.razorpay_subscription_id}`, body.razorpay_signature, secret);
  if (!ok) return NextResponse.json({ error: "Invalid signature." }, { status: 400 });

  await prisma.subscription.upsert({
    where: { userId: user.id },
    create: { userId: user.id, planTierId: tier.id, status: "ACTIVE", razorpaySubId: body.razorpay_subscription_id },
    update: { planTierId: tier.id, status: "ACTIVE", razorpaySubId: body.razorpay_subscription_id },
  });
  await prisma.user.update({ where: { id: user.id }, data: { planTierId: tier.id } });
  return NextResponse.json({ ok: true });
}

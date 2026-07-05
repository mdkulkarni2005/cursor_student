import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@studentos/db";

/**
 * Verify a Razorpay webhook's `X-Razorpay-Signature` header: HMAC-SHA256 of the raw request body
 * using the dashboard-configured webhook secret. Must run against the RAW body string — a
 * re-serialized JSON.stringify(parsed) will not match if key order/whitespace differs.
 * https://razorpay.com/docs/webhooks/validate-test/
 */
export function verifyRazorpaySignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

type RazorpayPaymentEntity = {
  id: string;
  order_id?: string;
  amount: number; // paise
  currency: string;
  method?: string;
  status?: string;
  notes?: Record<string, string>;
};

type RazorpaySubscriptionEntity = {
  id: string;
  status?: string;
  current_end?: number; // unix seconds
  customer_id?: string;
};

export type RazorpayWebhookPayload = {
  event: string;
  payload: {
    payment?: { entity: RazorpayPaymentEntity };
    subscription?: { entity: RazorpaySubscriptionEntity };
  };
};

/** Resolve which of our users a webhook event belongs to — via the Razorpay subscription id we
 *  stored at checkout time, falling back to a `userId` note if the payment carries one directly. */
async function resolveUserId(payment?: RazorpayPaymentEntity, subscription?: RazorpaySubscriptionEntity): Promise<string | null> {
  if (payment?.notes?.userId) return payment.notes.userId;
  const subId = subscription?.id;
  if (subId) {
    const sub = await prisma.subscription.findUnique({ where: { razorpaySubId: subId }, select: { userId: true } });
    if (sub) return sub.userId;
  }
  return null;
}

/**
 * Apply a verified Razorpay webhook event: record the Payment row (for history/receipts) and
 * update the Subscription's cycle/status so "next payment date" and "autopay" stay accurate.
 * Idempotent on razorpayPaymentId (upsert) since Razorpay retries webhook delivery.
 */
export async function applyRazorpayEvent(body: RazorpayWebhookPayload): Promise<void> {
  const payment = body.payload.payment?.entity;
  const subscription = body.payload.subscription?.entity;

  switch (body.event) {
    case "payment.captured":
    case "subscription.charged": {
      if (!payment) return;
      const userId = await resolveUserId(payment, subscription);
      if (!userId) return; // can't attribute — nothing safe to write
      await prisma.payment.upsert({
        where: { razorpayPaymentId: payment.id },
        create: {
          userId,
          razorpayPaymentId: payment.id,
          razorpayOrderId: payment.order_id ?? null,
          amountCents: payment.amount, // Razorpay amounts are already in the smallest unit (paise)
          currency: payment.currency,
          status: "CAPTURED",
          method: payment.method ?? null,
        },
        update: { status: "CAPTURED" },
      });
      if (subscription?.current_end) {
        await prisma.subscription.updateMany({
          where: { userId },
          data: { status: "ACTIVE", currentPeriodEnd: new Date(subscription.current_end * 1000) },
        });
      }
      return;
    }
    case "payment.failed": {
      if (!payment) return;
      const userId = await resolveUserId(payment, subscription);
      if (!userId) return;
      await prisma.payment.upsert({
        where: { razorpayPaymentId: payment.id },
        create: {
          userId,
          razorpayPaymentId: payment.id,
          razorpayOrderId: payment.order_id ?? null,
          amountCents: payment.amount,
          currency: payment.currency,
          status: "FAILED",
          method: payment.method ?? null,
        },
        update: { status: "FAILED" },
      });
      await prisma.subscription.updateMany({ where: { userId }, data: { status: "PAST_DUE" } });
      return;
    }
    case "subscription.cancelled":
    case "subscription.completed": {
      if (!subscription) return;
      await prisma.subscription.updateMany({
        where: { razorpaySubId: subscription.id },
        data: { status: "CANCELED", cancelAtPeriodEnd: false },
      });
      return;
    }
    case "subscription.halted": {
      if (!subscription) return;
      await prisma.subscription.updateMany({
        where: { razorpaySubId: subscription.id },
        data: { status: "PAST_DUE" },
      });
      return;
    }
    case "refund.processed": {
      if (!payment) return;
      await prisma.payment.updateMany({ where: { razorpayPaymentId: payment.id }, data: { status: "REFUNDED" } });
      return;
    }
    default:
      return; // ignore events we don't act on yet
  }
}

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
  notes?: Record<string, string>;
};

export type RazorpayWebhookPayload = {
  event: string;
  payload: {
    payment?: { entity: RazorpayPaymentEntity };
    subscription?: { entity: RazorpaySubscriptionEntity };
  };
};

type Owner = { userId: string } | { recruiterId: string } | null;

/**
 * Resolve which account (student User or Recruiter — one Payment table serves both, see
 * packages/db/prisma/schema.prisma) a webhook event belongs to. Prefers the `notes` on the
 * payment/subscription (set at checkout time, see lib/actions/checkout.ts and
 * apps/recruiter/lib/actions/checkout.ts) since that's available even on the very first payment,
 * before any Subscription row has this razorpaySubId recorded.
 */
async function resolveOwner(payment?: RazorpayPaymentEntity, subscription?: RazorpaySubscriptionEntity): Promise<Owner> {
  const notes = payment?.notes ?? subscription?.notes;
  if (notes?.userId) return { userId: notes.userId };
  if (notes?.recruiterId) return { recruiterId: notes.recruiterId };

  const subId = subscription?.id;
  if (subId) {
    const sub = await prisma.subscription.findUnique({ where: { razorpaySubId: subId }, select: { userId: true } });
    if (sub) return { userId: sub.userId };
    const recruiterSub = await prisma.recruiterSubscription.findUnique({
      where: { razorpaySubId: subId },
      select: { recruiterId: true },
    });
    if (recruiterSub) return { recruiterId: recruiterSub.recruiterId };
  }
  return null;
}

function planTierIdFromNotes(payment?: RazorpayPaymentEntity, subscription?: RazorpaySubscriptionEntity): string | undefined {
  return payment?.notes?.planTierId ?? subscription?.notes?.planTierId;
}

/**
 * Apply a verified Razorpay webhook event: record the Payment row (for history/receipts) and
 * update the Subscription/RecruiterSubscription's cycle/status so "next payment date" and
 * "autopay" stay accurate. Idempotent on razorpayPaymentId (upsert) since Razorpay retries webhook
 * delivery. This is the source of truth for billing state — /api/checkout/verify is only a fast
 * optimistic UI path on top of it.
 */
export async function applyRazorpayEvent(body: RazorpayWebhookPayload): Promise<void> {
  const payment = body.payload.payment?.entity;
  const subscription = body.payload.subscription?.entity;

  switch (body.event) {
    case "payment.captured":
    case "subscription.charged": {
      if (!payment) return;
      const owner = await resolveOwner(payment, subscription);
      if (!owner) return; // can't attribute — nothing safe to write
      const planTierId = planTierIdFromNotes(payment, subscription);

      await prisma.payment.upsert({
        where: { razorpayPaymentId: payment.id },
        create: {
          ...owner,
          razorpayPaymentId: payment.id,
          razorpayOrderId: payment.order_id ?? null,
          amountCents: payment.amount, // Razorpay amounts are already in the smallest unit (paise)
          currency: payment.currency,
          status: "CAPTURED",
          method: payment.method ?? null,
        },
        update: { status: "CAPTURED" },
      });

      if ("userId" in owner) {
        await prisma.subscription.updateMany({
          where: { userId: owner.userId },
          data: {
            status: "ACTIVE",
            ...(subscription?.current_end ? { currentPeriodEnd: new Date(subscription.current_end * 1000) } : {}),
            ...(planTierId ? { planTierId } : {}),
          },
        });
        if (planTierId) await prisma.user.update({ where: { id: owner.userId }, data: { planTierId } }).catch(() => {});
      } else {
        await prisma.recruiterSubscription.upsert({
          where: { recruiterId: owner.recruiterId },
          create: {
            recruiterId: owner.recruiterId,
            planTierId: planTierId ?? null,
            status: "ACTIVE",
            razorpaySubId: subscription?.id,
            currentPeriodEnd: subscription?.current_end ? new Date(subscription.current_end * 1000) : null,
          },
          update: {
            status: "ACTIVE",
            ...(planTierId ? { planTierId } : {}),
            ...(subscription?.current_end ? { currentPeriodEnd: new Date(subscription.current_end * 1000) } : {}),
          },
        });
      }
      return;
    }
    case "payment.failed": {
      if (!payment) return;
      const owner = await resolveOwner(payment, subscription);
      if (!owner) return;
      await prisma.payment.upsert({
        where: { razorpayPaymentId: payment.id },
        create: {
          ...owner,
          razorpayPaymentId: payment.id,
          razorpayOrderId: payment.order_id ?? null,
          amountCents: payment.amount,
          currency: payment.currency,
          status: "FAILED",
          method: payment.method ?? null,
        },
        update: { status: "FAILED" },
      });
      if ("userId" in owner) {
        await prisma.subscription.updateMany({ where: { userId: owner.userId }, data: { status: "PAST_DUE" } });
      } else {
        await prisma.recruiterSubscription.updateMany({ where: { recruiterId: owner.recruiterId }, data: { status: "PAST_DUE" } });
      }
      return;
    }
    case "subscription.cancelled":
    case "subscription.completed": {
      if (!subscription) return;
      await prisma.subscription.updateMany({
        where: { razorpaySubId: subscription.id },
        data: { status: "CANCELED", cancelAtPeriodEnd: false },
      });
      await prisma.recruiterSubscription.updateMany({
        where: { razorpaySubId: subscription.id },
        data: { status: "CANCELED", cancelAtPeriodEnd: false },
      });
      return;
    }
    case "subscription.halted": {
      if (!subscription) return;
      await prisma.subscription.updateMany({ where: { razorpaySubId: subscription.id }, data: { status: "PAST_DUE" } });
      await prisma.recruiterSubscription.updateMany({ where: { razorpaySubId: subscription.id }, data: { status: "PAST_DUE" } });
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

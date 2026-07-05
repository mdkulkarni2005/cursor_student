import { NextResponse } from "next/server";
import { verifyRazorpaySignature, applyRazorpayEvent, type RazorpayWebhookPayload } from "@/lib/payments/razorpay-webhook";

/**
 * Razorpay webhook receiver. Configure this URL + a webhook secret in the Razorpay dashboard once
 * billing goes live (RAZORPAY_WEBHOOK_SECRET env var here). Until then this 500s harmlessly since
 * nothing points at it — it exists so Payment/Subscription tracking is ready the moment Razorpay
 * is turned on, with no code change needed.
 */
export async function POST(req: Request): Promise<Response> {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[razorpay-webhook] RAZORPAY_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "not configured" }, { status: 500 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature");
  if (!verifyRazorpaySignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  let body: RazorpayWebhookPayload;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  try {
    await applyRazorpayEvent(body);
  } catch (err) {
    console.error("[razorpay-webhook] failed to apply event", body.event, err);
    // Still 200 — a transient DB error shouldn't make Razorpay hammer retries forever on an event
    // we may have partially applied; the payment record is idempotent (upsert on razorpayPaymentId).
  }

  return NextResponse.json({ ok: true });
}

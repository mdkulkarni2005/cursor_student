"use client";

import { useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { createCheckoutOrder } from "@/app/plans/actions";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

type RazorpayHandlerResponse = {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_subscription_id?: string;
  razorpay_signature: string;
};

/** Real Razorpay Checkout — recruiter-app mirror of apps/web's components/checkout/checkout-form.tsx. */
export function CheckoutForm({
  planTierId,
  amountLabel,
  userEmail,
  userName,
}: {
  planTierId: string;
  amountLabel: string;
  userEmail?: string;
  userName?: string;
}) {
  const router = useRouter();
  const [scriptReady, setScriptReady] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPay() {
    setError(null);
    setIsPaying(true);
    try {
      const order = await createCheckoutOrder(planTierId);

      const rzp = new window.Razorpay({
        key: order.keyId,
        name: "krackit for recruiters",
        prefill: { email: userEmail, name: userName },
        theme: { color: "#06b6d4" },
        ...(order.mode === "order"
          ? { order_id: order.orderId, amount: order.amountCents, currency: order.currency }
          : { subscription_id: order.subscriptionId }),
        handler: async (response: RazorpayHandlerResponse) => {
          const verifyBody =
            order.mode === "order"
              ? {
                  mode: "order" as const,
                  razorpay_order_id: response.razorpay_order_id!,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  planTierId,
                }
              : {
                  mode: "subscription" as const,
                  razorpay_subscription_id: response.razorpay_subscription_id!,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  planTierId,
                };
          const res = await fetch("/api/checkout/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(verifyBody),
          });
          if (res.ok) {
            router.push("/plans?upgraded=1");
            router.refresh();
          } else {
            setError("Payment verification failed — contact support if you were charged.");
            setIsPaying(false);
          }
        },
        modal: { ondismiss: () => setIsPaying(false) },
      });
      rzp.open();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start checkout.");
      setIsPaying(false);
    }
  }

  return (
    <div>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" onReady={() => setScriptReady(true)} />
      <h4 className="mb-4 text-[12px] font-bold uppercase tracking-widest text-muted">Secure payment</h4>
      <p className="mb-6 text-[13px] text-soft">
        UPI, cards, and net banking are all handled inside Razorpay&apos;s secure checkout — we never see or store
        your card details.
      </p>
      <button
        type="button"
        disabled={!scriptReady || isPaying}
        onClick={onPay}
        className="w-full rounded-xl bg-cyan py-3.5 text-[15px] font-bold text-on-accent transition-transform active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPaying ? "Opening secure checkout…" : `Proceed to Pay ${amountLabel}`}
      </button>
      {error && <p className="mt-3 text-center text-[12.5px] text-danger">{error}</p>}
    </div>
  );
}

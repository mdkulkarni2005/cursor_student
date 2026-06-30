import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { requireOnboardedUser, shellUserFrom } from "@/lib/user";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { StarIcon } from "@/components/icons";

export const metadata = { title: "Checkout — Vidyas OS" };

const PLANS: Record<string, { name: string; price: number; credits: string; features: string[] }> = {
  pro: {
    name: "Vidyas Pro",
    price: 499,
    credits: "5,000 AI Academic Credits / month",
    features: [
      "5,000 AI Academic Credits / month",
      "Unlimited reports, PPTs & assignments",
      "Priority generation queue",
      "Full interview & DSA practice suite",
    ],
  },
  premium: {
    name: "Vidyas Premium",
    price: 999,
    credits: "Unlimited AI Academic Credits",
    features: [
      "Unlimited AI Academic Credits",
      "Everything in Pro",
      "1:1 mentor reviews",
      "Early access to new modules",
    ],
  },
};

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const user = await requireOnboardedUser();
  const { plan } = await searchParams;
  const selected = PLANS[(plan ?? "pro").toLowerCase()] ?? PLANS.pro;
  const gst = Math.round(selected.price * 0.18);
  const total = selected.price + gst;
  const amountLabel = `₹${total.toLocaleString("en-IN")}`;

  return (
    <AppShell user={shellUserFrom(user)}>
      <div className="mx-auto max-w-[1080px]">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-[26px] font-semibold tracking-tight text-cyan">Upgrade Your Intelligence</h1>
            <p className="text-[13.5px] text-muted">Secure checkout for Vidyas OS</p>
          </div>
          <span className="flex w-fit items-center gap-2 rounded-full border border-line bg-card px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
            <span className="size-2 rounded-full bg-teal" />
            256-Bit SSL Secured
          </span>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Order summary */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-line bg-card p-6">
              <span className="mb-3 inline-block rounded-full bg-cyan/10 px-3 py-1 text-[12px] font-semibold text-cyan">
                Selected Plan
              </span>
              <div className="flex items-end justify-between">
                <h2 className="font-display text-[20px] font-semibold text-ink">{selected.name}</h2>
                <div className="font-display text-[20px] font-semibold text-ink">
                  ₹{selected.price}
                  <span className="text-[13px] font-normal text-muted">/mo</span>
                </div>
              </div>
              <Link href="/plans" className="text-[12px] font-semibold text-cyan hover:underline">
                Change Plan
              </Link>
              <ul className="mt-6 space-y-3 border-t border-line pt-6">
                {selected.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-[13.5px] text-soft">
                    <StarIcon size={15} className="mt-0.5 shrink-0 text-cyan" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-line bg-surface p-6">
              <h3 className="mb-4 text-[12px] font-bold uppercase tracking-widest text-muted">Order Summary</h3>
              <div className="space-y-2.5 text-[13.5px]">
                <div className="flex justify-between text-soft">
                  <span>{selected.name} (monthly)</span>
                  <span>₹{selected.price}</span>
                </div>
                <div className="flex justify-between text-soft">
                  <span>GST (18%)</span>
                  <span>₹{gst}</span>
                </div>
                <div className="mt-3 flex justify-between border-t border-line pt-3 font-display text-[17px] font-bold text-ink">
                  <span>Total Due</span>
                  <span>{amountLabel}</span>
                </div>
              </div>
              <p className="mt-4 rounded-lg bg-teal/10 px-3 py-2 text-[12px] font-medium text-teal">
                7-day money-back guarantee
              </p>
            </div>
          </div>

          {/* Payment */}
          <div className="overflow-hidden rounded-2xl border border-line bg-card">
            <div className="flex items-center justify-between bg-cyan/10 px-6 py-4">
              <div>
                <h3 className="font-display text-[17px] font-semibold text-ink">Secure Payment</h3>
                <p className="text-[12px] text-muted">Powered by Razorpay</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-semibold uppercase text-muted">Total Due</p>
                <p className="font-display text-[18px] font-bold text-cyan">{amountLabel}</p>
              </div>
            </div>
            <div className="p-6">
              <CheckoutForm amountLabel={amountLabel} />
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

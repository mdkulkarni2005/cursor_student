"use client";

import { useState } from "react";

type Method = "upi" | "card" | "netbanking";

const METHODS: { id: Method; label: string; note: string }[] = [
  { id: "upi", label: "UPI", note: "GPay, PhonePe" },
  { id: "card", label: "Card", note: "Visa, Mastercard" },
  { id: "netbanking", label: "Net Banking", note: "All banks" },
];

export function CheckoutForm({ amountLabel }: { amountLabel: string }) {
  const [method, setMethod] = useState<Method>("card");

  return (
    <div>
      <h4 className="mb-4 text-[12px] font-bold uppercase tracking-widest text-muted">Select Payment Method</h4>
      <div className="mb-6 grid grid-cols-3 gap-3">
        {METHODS.map((m) => (
          <button
            key={m.id}
            onClick={() => setMethod(m.id)}
            className={`flex flex-col items-center justify-center rounded-xl border-2 p-4 transition-all ${
              method === m.id ? "border-cyan bg-cyan/5" : "border-line hover:border-cyan/40"
            }`}
          >
            <span className="text-[13.5px] font-semibold text-ink">{m.label}</span>
            <span className="mt-0.5 text-[10px] text-muted">{m.note}</span>
          </button>
        ))}
      </div>

      {method === "card" && (
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-[13px] font-medium text-ink">Card Number</label>
            <input
              placeholder="XXXX XXXX XXXX XXXX"
              className="h-12 w-full rounded-lg border border-line bg-card px-4 text-[14px] text-ink outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-[13px] font-medium text-ink">Expiry</label>
              <input
                placeholder="MM/YY"
                className="h-12 w-full rounded-lg border border-line bg-card px-4 text-[14px] text-ink outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20"
              />
            </div>
            <div>
              <label className="mb-2 block text-[13px] font-medium text-ink">CVV</label>
              <input
                type="password"
                placeholder="***"
                className="h-12 w-full rounded-lg border border-line bg-card px-4 text-[14px] text-ink outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20"
              />
            </div>
          </div>
        </div>
      )}

      {method === "upi" && (
        <div>
          <label className="mb-2 block text-[13px] font-medium text-ink">UPI ID</label>
          <input
            placeholder="yourname@bank"
            className="h-12 w-full rounded-lg border border-line bg-card px-4 text-[14px] text-ink outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20"
          />
        </div>
      )}

      {method === "netbanking" && (
        <div>
          <label className="mb-2 block text-[13px] font-medium text-ink">Select Bank</label>
          <select className="h-12 w-full rounded-lg border border-line bg-card px-4 text-[14px] text-ink outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20">
            <option>HDFC Bank</option>
            <option>ICICI Bank</option>
            <option>State Bank of India</option>
            <option>Axis Bank</option>
          </select>
        </div>
      )}

      <button
        type="button"
        title="Razorpay integration is not wired yet"
        className="mt-6 w-full rounded-xl bg-cyan py-3.5 text-[15px] font-bold text-on-accent transition-transform active:scale-[0.99]"
      >
        Proceed to Pay {amountLabel}
      </button>
      <p className="mt-3 text-center text-[11.5px] leading-relaxed text-muted">
        By clicking &apos;Proceed to Pay&apos;, you agree to our Terms of Service and Privacy Policy. You will be
        redirected to a secure Razorpay gateway.
      </p>
    </div>
  );
}

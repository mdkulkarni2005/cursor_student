"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { redeemPromoCode } from "./promo-actions";

export function PromoCodeForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await redeemPromoCode(code);
      setMessage({ text: result.ok ? result.message : result.error, ok: result.ok });
      if (result.ok) {
        setCode("");
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto mb-8 flex max-w-sm items-center gap-2">
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Have a promo code?"
        className="flex-1 rounded-lg border border-line bg-card px-3 py-2 text-[13px] uppercase text-ink placeholder:text-faint placeholder:normal-case"
      />
      <button
        type="submit"
        disabled={isPending || !code.trim()}
        className="rounded-lg border border-line px-3 py-2 text-[12.5px] font-semibold text-soft hover:bg-surface disabled:opacity-50"
      >
        {isPending ? "Applying…" : "Apply"}
      </button>
      {message && <span className={`text-[12px] ${message.ok ? "text-success" : "text-danger"}`}>{message.text}</span>}
    </form>
  );
}

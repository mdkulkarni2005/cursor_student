"use client";

import type { BalanceResult } from "@/lib/process-flow/types";

export function BalanceReport({ result }: { result: BalanceResult | null }) {
  if (!result) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-card p-4 text-[12px] leading-relaxed text-muted">
        Wire up equipment and set flow rates, then Check Balance to flag mass-conservation errors.
      </div>
    );
  }

  if (result.balanced) {
    return <p className="rounded-xl border border-success/30 bg-success/10 px-3 py-2.5 text-[12.5px] text-success">Balanced — every unit's inflow equals its outflow.</p>;
  }

  return (
    <div className="rounded-2xl border border-danger/30 bg-danger/10 p-3">
      <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wide text-danger">{result.issues.length} balance issue{result.issues.length === 1 ? "" : "s"}</p>
      <ul className="flex flex-col gap-1.5">
        {result.issues.map((issue, i) => (
          <li key={i} className="text-[12px] leading-snug text-danger">
            {issue.message}
          </li>
        ))}
      </ul>
    </div>
  );
}

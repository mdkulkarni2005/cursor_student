"use client";

import type { TruthTable } from "@/lib/logic-sim/types";

export function TruthTable({ table, error }: { table: TruthTable | null; error: string | null }) {
  if (error) {
    return <p className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2.5 text-[12.5px] text-danger">{error}</p>;
  }
  if (!table) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-card p-4 text-[12px] leading-relaxed text-muted">
        Wire at least one Switch to an LED, then click Run to auto-generate the truth table.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-card p-3">
      <p className="mb-2 px-1 text-[10.5px] font-bold uppercase tracking-wide text-muted">Truth Table</p>
      <div className="overflow-x-auto">
        <table className="w-full font-mono text-[11px]">
          <thead>
            <tr className="text-faint">
              {table.inputLabels.map((l) => (
                <th key={l} className="border-b border-line px-2 py-1 text-center font-bold text-scope">
                  {l}
                </th>
              ))}
              {table.outputLabels.map((l) => (
                <th key={l} className="border-b border-line px-2 py-1 text-center font-bold text-warning">
                  {l}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, i) => (
              <tr key={i} className="text-ink">
                {row.inputs.map((v, j) => (
                  <td key={j} className="px-2 py-1 text-center">
                    {v ? 1 : 0}
                  </td>
                ))}
                {row.outputs.map((v, j) => (
                  <td key={j} className="px-2 py-1 text-center font-bold">
                    {v === undefined ? "—" : v ? 1 : 0}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

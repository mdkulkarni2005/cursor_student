"use client";

import { useActionState } from "react";
import { submitDiagnosisAction, type FaultFinderFormState } from "@/lib/actions/fault-finder";
import type { CircuitNode } from "@/lib/circuits/types";

/** Only these kinds can ever be authored as a fault in the catalog (see lib/fault-finder/catalog.ts). */
const FAULTABLE_KINDS = new Set(["resistor", "motor", "led", "ammeter"]);

export function DiagnosisForm({ slug, components }: { slug: string; components: CircuitNode[] }) {
  const [state, action, pending] = useActionState<FaultFinderFormState, FormData>(submitDiagnosisAction, {});
  const candidates = components.filter((c) => FAULTABLE_KINDS.has(c.kind));

  if (state.result) {
    return (
      <div className={`rounded-2xl border p-4 ${state.result.correct ? "border-success/30 bg-success/10" : "border-danger/30 bg-danger/10"}`}>
        <p className={`text-[13px] font-bold ${state.result.correct ? "text-success" : "text-danger"}`}>
          {state.result.correct ? "✓ Correct diagnosis!" : "✗ Not quite"}
        </p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-soft">{state.result.explanation}</p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-4">
      <input type="hidden" name="slug" value={slug} />
      <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Diagnose the fault</p>

      <div>
        <p className="mb-1.5 text-[12px] font-semibold text-ink">Which component is faulty?</p>
        <select name="componentId" required className="w-full rounded-lg border border-line bg-surface px-2.5 py-2 text-[13px] text-ink">
          <option value="">Select a component…</option>
          {candidates.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <p className="mb-1.5 text-[12px] font-semibold text-ink">What kind of fault?</p>
        <div className="flex gap-3">
          <label className="flex items-center gap-1.5 text-[12.5px] text-soft">
            <input type="radio" name="faultType" value="open" required /> Open circuit
          </label>
          <label className="flex items-center gap-1.5 text-[12.5px] text-soft">
            <input type="radio" name="faultType" value="short" /> Short circuit
          </label>
        </div>
      </div>

      {state.error ? <p className="text-[12px] text-danger">{state.error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 w-full rounded-xl bg-accent-gradient py-2.5 text-[13.5px] font-semibold text-on-accent shadow-[0_6px_18px_rgba(246,146,30,0.3)] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
      >
        {pending ? "Submitting…" : "Submit diagnosis"}
      </button>
    </form>
  );
}

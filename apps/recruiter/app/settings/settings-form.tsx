"use client";

import { useActionState } from "react";
import { updateIndustry, type SettingsState } from "./actions";
import { INDUSTRIES } from "@/lib/industries";

const fieldLabel = "mb-1.5 block text-[12.5px] font-semibold text-muted";
const fieldBox =
  "w-full max-w-[360px] rounded-xl border border-line-strong bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none transition-colors focus:border-cyan/50";

export function SettingsForm({ initialIndustry }: { initialIndustry: string }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(updateIndustry, {});

  return (
    <form action={action} className="rounded-2xl border border-line bg-card p-5">
      <div className="mb-4">
        <label htmlFor="industry" className={fieldLabel}>
          Industry you hire for
        </label>
        <select id="industry" name="industry" defaultValue={initialIndustry} className={fieldBox}>
          <option value="">No preference</option>
          {INDUSTRIES.map((i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </select>
      </div>

      {state.error ? (
        <p className="mb-4 rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-[12.5px] text-danger">{state.error}</p>
      ) : null}
      {state.savedAt && !state.error ? <p className="mb-4 text-[12px] text-success">Saved at {state.savedAt}.</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-accent-gradient px-5 py-2.5 text-[13.5px] font-semibold text-on-accent shadow-[0_6px_18px_rgba(79,70,229,0.3)] disabled:opacity-60"
      >
        Save
      </button>
    </form>
  );
}

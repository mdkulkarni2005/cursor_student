"use client";

import { useFormStatus } from "react-dom";
import { convertReportToPptAction } from "@/lib/actions/ppt";
import { Button } from "@/components/ui/button";

function ConvertButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      loading={pending}
      loadingText="Converting to slides…"
      className="w-full rounded-xl border border-cyan/30 bg-cyan/10 py-2.5 text-[13.5px] font-semibold text-cyan transition-colors hover:bg-cyan/20 disabled:opacity-60"
    >
      Convert to slides →
    </Button>
  );
}

/**
 * Lets the user turn one of their existing reports into a slide deck. Posts the chosen report id
 * to convertReportToPptAction, which reuses the normal PPT pipeline grounded in the report.
 */
export function ConvertReportToPpt({ reports }: { reports: { id: string; title: string }[] }) {
  if (reports.length === 0) return null;
  return (
    <form
      action={convertReportToPptAction}
      className="mt-3 rounded-2xl border border-line bg-card p-4"
    >
      <p className="mb-1 text-[12.5px] font-semibold text-soft">Have a report already?</p>
      <p className="mb-2.5 text-[12px] text-faint">Turn it into a ready slide deck.</p>
      <select
        name="reportId"
        defaultValue={reports[0]!.id}
        className="mb-2.5 w-full rounded-xl border border-line-strong bg-surface px-3 py-2.5 text-[13.5px] text-ink outline-none transition-colors focus:border-cyan/50"
      >
        {reports.map((r) => (
          <option key={r.id} value={r.id}>
            {r.title}
          </option>
        ))}
      </select>
      <ConvertButton />
    </form>
  );
}

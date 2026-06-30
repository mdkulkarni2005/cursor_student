"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

/**
 * Submit button for the NEEDS_INPUT "finish my report" form. Lives inside the form
 * and reads useFormStatus so the moment it's clicked it disables and shows a spinner
 * (the action flips the doc to GENERATING + redirects, which otherwise looks unresponsive).
 */
export function FinishReportButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      loading={pending}
      loadingText="Finishing your report…"
      className="w-full rounded-xl bg-accent-gradient py-3 text-[14px] font-semibold text-on-accent shadow-[0_6px_18px_rgba(79,70,229,0.3)] transition-transform hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0"
    >
      Finish my report →
    </Button>
  );
}

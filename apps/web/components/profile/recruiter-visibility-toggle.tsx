"use client";

import { useState, useTransition } from "react";
import { setRecruiterVisibility } from "@/lib/actions/recruiter-visibility";

/**
 * Explicit opt-out for recruiter discovery. On by default — flipping it off hides the student's
 * profile from apps/recruiter's student search.
 */
export function RecruiterVisibilityToggle({ initialVisible }: { initialVisible: boolean }) {
  const [visible, setVisible] = useState(initialVisible);
  const [pending, start] = useTransition();

  function onToggle() {
    const next = !visible;
    setVisible(next); // optimistic
    start(async () => {
      try {
        await setRecruiterVisibility(next);
      } catch {
        setVisible(!next); // revert on failure
      }
    });
  }

  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-line-strong bg-surface/60 px-3.5 py-2.5">
      <input type="checkbox" checked={visible} disabled={pending} onChange={onToggle} className="size-4 accent-cyan" />
      <span className="text-[12.5px] text-soft">
        Visible to recruiters
        <span className="block text-[11px] text-faint">
          {visible ? "Recruiters can find and view your profile." : "Off — no recruiter can see your profile."}
        </span>
      </span>
    </label>
  );
}

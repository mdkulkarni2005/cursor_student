"use client";

import { useState, useTransition } from "react";
import { getShareablePath } from "@/lib/actions/profile";
import { LinkIcon } from "@/components/icons";

/**
 * Real "Share Profile" — resolves (and lazily creates) the student's public handle, then copies the
 * full /u/[handle] URL to the clipboard. No recruiter/hire action exists on the student side.
 */
export function ShareProfileButton({ className }: { className?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onClick() {
    start(async () => {
      try {
        const result = await getShareablePath();
        if (!result.ok) {
          setError(result.error);
          setState("error");
          setTimeout(() => setState("idle"), 4000);
          return;
        }
        const url = `${window.location.origin}${result.path}`;
        await navigator.clipboard.writeText(url);
        setState("copied");
        setTimeout(() => setState("idle"), 2200);
      } catch {
        setError("Something went wrong — please try again.");
        setState("error");
        setTimeout(() => setState("idle"), 4000);
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className={className ?? "flex items-center gap-1.5 rounded-xl bg-cyan px-5 py-2.5 text-[13.5px] font-semibold text-on-accent transition-transform hover:-translate-y-0.5 disabled:opacity-60"}
      >
        <LinkIcon size={15} />
        {state === "copied" ? "Link copied!" : state === "error" ? "Try again" : pending ? "Preparing…" : "Share Profile"}
      </button>
      {state === "error" && error ? <p className="max-w-[240px] text-right text-[12px] text-danger">{error}</p> : null}
    </div>
  );
}

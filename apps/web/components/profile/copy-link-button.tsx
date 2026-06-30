"use client";

import { useState } from "react";
import { LinkIcon } from "@/components/icons";

/** Copies the current page URL — used on the public /u/[handle] profile. */
export function CopyLinkButton({ className }: { className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(window.location.href);
          setCopied(true);
          setTimeout(() => setCopied(false), 2200);
        } catch { /* clipboard blocked — no-op */ }
      }}
      className={className ?? "flex items-center gap-2 rounded-xl border border-line bg-card px-5 py-2.5 text-[13.5px] font-medium text-soft hover:bg-surface"}
    >
      <LinkIcon size={16} /> {copied ? "Link copied!" : "Copy Profile Link"}
    </button>
  );
}

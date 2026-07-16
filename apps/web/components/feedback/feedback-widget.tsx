"use client";

import { useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { ChatIcon } from "@/components/icons";
import { createFeedback } from "@/lib/actions/feedback";

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "BUG", label: "Bug" },
  { value: "FEATURE_REQUEST", label: "Feature request" },
  { value: "IMPROVEMENT", label: "Improvement" },
  { value: "OTHER", label: "Other" },
];

const fieldBox =
  "w-full rounded-xl border border-line-strong bg-surface px-3.5 py-2.5 text-[13.5px] text-ink outline-none transition-colors focus:border-cyan/50";

export function FeedbackWidget({ variant = "floating" }: { variant?: "floating" | "row" }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("FEATURE_REQUEST");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const result = await createFeedback(type, message, pathname);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage("");
      setSaved(true);
    });
  }

  function onToggle() {
    setOpen((v) => !v);
    setSaved(false);
    setError(null);
  }

  const isRow = variant === "row";

  return (
    <div className={isRow ? "relative" : "fixed bottom-20 left-4 z-50 lg:hidden"}>
      {open ? (
        <form
          onSubmit={onSubmit}
          className={[
            "w-[300px] rounded-2xl border border-line-strong bg-card p-4 shadow-[0_20px_60px_rgba(15,23,42,0.14)]",
            isRow ? "absolute bottom-full left-0 z-50 mb-2" : "mb-3",
          ].join(" ")}
        >
          <h3 className="text-[13.5px] font-semibold text-ink">Send feedback</h3>
          <p className="mt-1 text-[12px] text-muted">Bugs, feature requests, or anything we should improve.</p>

          <div className="mt-3 space-y-2.5">
            <select value={type} onChange={(e) => setType(e.target.value)} className={fieldBox}>
              {TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What's on your mind?"
              rows={4}
              className={fieldBox}
            />
          </div>

          {error ? <p className="mt-2.5 text-[12px] text-danger">{error}</p> : null}
          {saved ? <p className="mt-2.5 text-[12px] text-teal">Thanks — feedback sent.</p> : null}

          <div className="mt-3 flex items-center gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-xl bg-cyan px-4 py-2 text-[12.5px] font-semibold text-on-accent disabled:opacity-60"
            >
              {pending ? "Sending…" : "Send"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-xl border border-line px-4 py-2 text-[12.5px] font-medium text-muted"
            >
              Close
            </button>
          </div>
        </form>
      ) : null}

      <button
        type="button"
        onClick={onToggle}
        aria-label="Send feedback"
        className={
          isRow
            ? "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium text-muted transition-colors hover:bg-surface hover:text-soft"
            : "flex h-11 w-11 items-center justify-center rounded-full border border-line-strong bg-card text-muted shadow-[0_10px_30px_rgba(15,23,42,0.12)] transition-colors hover:text-ink"
        }
      >
        <ChatIcon size={isRow ? 17 : 19} />
        {isRow ? "Feedback" : null}
      </button>
    </div>
  );
}

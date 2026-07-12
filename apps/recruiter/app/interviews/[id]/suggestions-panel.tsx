"use client";

import { useEffect, useRef, useState } from "react";

const POLL_MS = 20_000;

/**
 * Optional, on-screen-only AI question suggestions — never enforced, collapsible/dismissible so it
 * never blocks the recruiter. Polls every 20s while the call is connected. The recruiter's current
 * list is sent back with each poll so the server can keep unasked suggestions in their same slot
 * and only replace ones the transcript shows were already asked — see suggestions/route.ts.
 */
export function SuggestionsPanel({ scheduleId, active }: { scheduleId: string; active: boolean }) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const suggestionsRef = useRef<string[]>([]);
  useEffect(() => {
    suggestionsRef.current = suggestions;
  }, [suggestions]);

  useEffect(() => {
    if (!active || dismissed) return;

    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch("/api/interview-room/suggestions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scheduleId, currentSuggestions: suggestionsRef.current }),
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data.suggestions)) setSuggestions(data.suggestions);
      } catch {
        // Best-effort — a failed poll just leaves the existing list on screen.
      }
    }

    void poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [active, dismissed, scheduleId]);

  if (!active || dismissed) return null;

  return (
    <div className="mb-3 max-w-[420px] rounded-xl border border-line bg-card p-3.5">
      <div className="flex items-center justify-between">
        <p className="text-[11.5px] font-semibold uppercase tracking-wide text-faint">AI question suggestions</p>
        <div className="flex items-center gap-2">
          <button onClick={() => setCollapsed((c) => !c)} className="text-[11px] font-semibold text-muted hover:text-ink">
            {collapsed ? "Show" : "Hide"}
          </button>
          <button onClick={() => setDismissed(true)} className="text-[11px] font-semibold text-muted hover:text-danger">
            Dismiss
          </button>
        </div>
      </div>
      {!collapsed && (
        <>
          <p className="mt-1 text-[10.5px] text-faint">Just suggestions — ask whatever you want, in whatever order.</p>
          {suggestions.length === 0 ? (
            <p className="mt-2 text-[12px] text-muted">Generating…</p>
          ) : (
            <ul className="mt-2 flex flex-col gap-1.5">
              {suggestions.map((s, i) => (
                <li key={i} className="text-[12.5px] text-soft">
                  {s}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

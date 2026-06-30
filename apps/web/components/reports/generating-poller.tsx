"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/button";

type Stage = { key: string; label: string };

/**
 * Live progress while a report generates in the background. Polls the server (router.refresh)
 * so that when generation finishes — or pauses for clarifying questions — the page updates on
 * its own. Safe to leave: generation runs server-side regardless of this page.
 */
export function GeneratingPoller({ stages, current }: { stages: readonly Stage[]; current: string }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 2500);
    return () => clearInterval(t);
  }, [router]);

  const idx = Math.max(0, stages.findIndex((s) => s.key === current));

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-cyan/25 bg-gradient-to-br from-cyan/[0.07] to-indigo/[0.07] p-6 sm:p-8">
      <div className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-full bg-cyan/15 text-cyan"><Spinner /></span>
        <div>
          <p className="text-[15px] font-semibold text-ink">Generating your report…</p>
          <p className="text-[12.5px] text-muted">This takes a minute or two. You can leave this page — it keeps working.</p>
        </div>
      </div>

      <ul className="mt-5 flex flex-col gap-2.5">
        {stages.map((s, i) => {
          const done = i < idx;
          const active = i === idx;
          return (
            <li key={s.key} className="flex items-center gap-3">
              <span className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${
                done ? "bg-success/20 text-success" : active ? "bg-cyan/20 text-cyan" : "bg-surface text-faint"}`}>
                {done ? "✓" : active ? <Spinner /> : i + 1}
              </span>
              <span className={`text-[13.5px] ${done ? "text-soft" : active ? "font-semibold text-ink" : "text-faint"}`}>{s.label}</span>
            </li>
          );
        })}
      </ul>

      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-surface">
        <div className="h-full rounded-full bg-accent-gradient transition-all duration-700" style={{ width: `${((idx + 0.5) / stages.length) * 100}%` }} />
      </div>
    </div>
  );
}

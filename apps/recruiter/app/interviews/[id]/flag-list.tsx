"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { FlagListItem } from "@/lib/interview-flags";

const KIND_LABEL: Record<string, string> = {
  FULLSCREEN_EXIT: "Left fullscreen",
  TAB_HIDDEN: "Switched tab / window",
  CAMERA_OFF: "Camera turned off",
  MIC_OFF: "Microphone muted",
  MULTI_MONITOR: "Multiple monitors detected",
  COPY_PASTE_ATTEMPT: "Copy/paste attempt blocked",
};

const REFRESH_MS = 15_000;

/**
 * Poll/refresh-based, NOT a live push feed — the caption below is load-bearing, not decorative:
 * there's no websocket/data-channel wiring to the recruiter, so don't let this read as real-time.
 */
export function FlagList({ scheduleId, initialFlags }: { scheduleId: string; initialFlags: FlagListItem[] }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), REFRESH_MS);
    return () => clearInterval(id);
  }, [router]);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-[16px] font-semibold text-ink">Proctoring flags</h2>
        <div className="flex items-center gap-2">
          <span className="text-[11.5px] text-faint">Updates automatically every 15s — not a live feed</span>
          <button
            onClick={() => router.refresh()}
            className="rounded-lg border border-line-strong bg-surface px-2.5 py-1 text-[11.5px] font-semibold text-ink hover:bg-card"
          >
            Refresh
          </button>
        </div>
      </div>

      {initialFlags.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-card p-8 text-center text-[13px] text-muted">
          No flags yet. This updates once the candidate joins.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-card">
          <table className="w-full text-left text-[12.5px]">
            <thead className="border-b border-line text-[11px] uppercase tracking-wide text-faint">
              <tr>
                {["Flag", "Detail", "When"].map((h) => (
                  <th key={h} className="px-3 py-2.5 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {initialFlags.map((f) => (
                <tr key={f.id} className="border-b border-line/60 last:border-0">
                  <td className="px-3 py-2.5 font-medium text-ink">{KIND_LABEL[f.kind] ?? f.kind}</td>
                  <td className="px-3 py-2.5 text-soft">{f.detail ?? "—"}</td>
                  <td className="px-3 py-2.5 text-muted">
                    {new Date(f.occurredAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-[11px] text-faint">Schedule ID: {scheduleId}</p>
    </div>
  );
}

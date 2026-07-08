"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { suggestFiguresAction, approveFigureAction } from "@/lib/actions/figures";
import type { FigureSuggestion } from "@studentos/ai";

type Card = FigureSuggestion & { state: "idle" | "generating" | "done" | "error"; msg?: string };

/**
 * AI figure approval flow for a report. Click "Suggest figures" → the AI proposes figures (no image,
 * no credits). Each is an Approve/Skip card; only Approve generates the image and embeds it. Skip
 * costs nothing.
 */
export function FigureSuggestions({ docId }: { docId: string }) {
  const router = useRouter();
  const [cards, setCards] = useState<Card[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, startLoad] = useTransition();

  function suggest() {
    setError(null);
    startLoad(async () => {
      const res = await suggestFiguresAction(docId);
      if (res.error) { setError(res.error); return; }
      setCards(res.figures.map((f) => ({ ...f, state: "idle" as const })));
    });
  }

  function patch(i: number, p: Partial<Card>) {
    setCards((cs) => (cs ? cs.map((c, idx) => (idx === i ? { ...c, ...p } : c)) : cs));
  }
  function skip(i: number) {
    setCards((cs) => (cs ? cs.filter((_, idx) => idx !== i) : cs));
  }
  async function approve(i: number, card: Card) {
    patch(i, { state: "generating", msg: undefined });
    const res = await approveFigureAction(docId, card.sectionIndex, card.imagePrompt, card.caption);
    if (res.ok) { patch(i, { state: "done" }); router.refresh(); }
    else patch(i, { state: "error", msg: res.error });
  }

  return (
    <div className="rounded-2xl border border-line bg-card p-5">
      <div className="mb-1 flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-lg bg-cyan/12 text-cyan">🖼️</span>
        <h2 className="font-display text-[15px] font-semibold text-ink">AI Figures</h2>
      </div>
      <p className="mb-3 text-[12px] text-muted">Add AI-generated diagrams where they help. Images are only created when you approve one.</p>

      {cards === null ? (
        <button onClick={suggest} disabled={loading} className="w-full rounded-xl bg-cyan py-2.5 text-[13px] font-semibold text-on-accent disabled:opacity-60">
          {loading ? "Finding good spots…" : "✦ Suggest figures"}
        </button>
      ) : cards.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line bg-surface/50 px-3 py-3 text-center text-[12.5px] text-muted">
          No figures suggested — this report reads well as text. (Figures are only available on the default report format.)
        </p>
      ) : (
        <div className="space-y-2.5">
          {cards.map((c, i) => (
            <div key={i} className="rounded-xl border border-line p-3">
              <p className="text-[12.5px] font-semibold text-ink">{c.caption}</p>
              <p className="mt-0.5 line-clamp-2 text-[11.5px] text-muted">{c.imagePrompt}</p>
              {c.state === "done" ? (
                <p className="mt-2 text-[12px] font-semibold text-success">✓ Added to your report</p>
              ) : c.state === "error" ? (
                <div className="mt-2 flex items-center gap-2">
                  <button onClick={() => approve(i, c)} className="rounded-lg bg-cyan px-3 py-1.5 text-[12px] font-semibold text-on-accent">Retry</button>
                  <span className="text-[11.5px] text-warning">{c.msg}</span>
                </div>
              ) : (
                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={() => approve(i, c)}
                    disabled={c.state === "generating"}
                    className="rounded-lg bg-accent-gradient px-3 py-1.5 text-[12px] font-semibold text-on-accent shadow-[0_4px_14px_rgba(246,146,30,0.3)] disabled:opacity-60"
                  >
                    {c.state === "generating" ? "Generating…" : "✦ Approve & generate"}
                  </button>
                  {c.state !== "generating" ? (
                    <button onClick={() => skip(i)} className="rounded-lg border border-line px-3 py-1.5 text-[12px] font-semibold text-muted hover:text-soft">Skip</button>
                  ) : null}
                </div>
              )}
            </div>
          ))}
          <button onClick={suggest} disabled={loading} className="w-full pt-1 text-[12px] font-semibold text-cyan hover:underline disabled:opacity-60">
            {loading ? "…" : "↻ Suggest more"}
          </button>
        </div>
      )}
      {error ? <p className="mt-2 text-[12px] text-warning">{error}</p> : null}
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { Heatmap } from "@/components/charts/heatmap";
import { TokenJourneyDiagram } from "@/components/transformer/token-journey-diagram";
import { computeAttention, attentionToJSON } from "@/lib/transformer/attention";

const EXAMPLE = "The cat sat on the mat because it was tired";
const HEAD_COUNT = 2;

function cyanAlpha(v: number): string {
  const a = Math.min(1, Math.max(0, v));
  return `rgba(246, 146, 30, ${0.08 + a * 0.85})`;
}

export function AttentionWorkspace() {
  const [text, setText] = useState(EXAMPLE);
  const [activeHead, setActiveHead] = useState(0);
  const [queryIndex, setQueryIndex] = useState(0);
  const [showWeights, setShowWeights] = useState(false);

  const result = useMemo(() => computeAttention(text, HEAD_COUNT), [text]);
  const tooShort = result.tokens.length < 2;
  const safeQueryIndex = Math.min(queryIndex, result.tokens.length - 1);

  function download() {
    const blob = new Blob([attentionToJSON(result)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "attention-weights.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[340px_1fr]">
        <div className="flex flex-col gap-4 rounded-2xl border border-line bg-card p-4">
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-muted">Sentence</span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              maxLength={100}
              className="w-full resize-none rounded-lg border border-line bg-surface p-2.5 text-[13px] text-ink outline-none focus:border-cyan/60"
              placeholder="Type a short sentence (up to 10 words) to trace how it flows through attention…"
            />
          </label>

          <button type="button" onClick={() => setText(EXAMPLE)} className="self-start text-[12px] font-semibold text-cyan hover:underline">
            Reset to example sentence
          </button>

          <div>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">Attention head</p>
            <div className="flex gap-1 rounded-lg border border-line bg-surface p-1">
              {Array.from({ length: HEAD_COUNT }, (_, h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setActiveHead(h)}
                  className={`flex-1 rounded-md px-2.5 py-1.5 text-[12px] font-semibold transition-colors ${
                    activeHead === h ? "bg-cyan text-on-accent" : "text-muted hover:text-ink"
                  }`}
                >
                  Head {h + 1}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={download}
            disabled={tooShort}
            className="rounded-lg border border-line bg-surface px-3 py-2 text-[12.5px] font-semibold text-ink hover:border-cyan/50 disabled:opacity-40"
          >
            Download attention weights (JSON)
          </button>

          <div className="rounded-lg border border-line bg-surface/50 p-3 text-[11.5px] leading-relaxed text-faint">
            <p className="mb-1.5 font-semibold text-soft">How to read this</p>
            <p>
              Pick a token below (the &quot;Query&quot;) and press Play — you&apos;ll watch just <em>that</em> token&apos;s journey: from raw
              embedding, to comparing itself against every other token, to blending their meaning into its final output. Different heads pick up on
              different relationships, so swapping heads changes which tokens light up strongest.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {tooShort ? (
            <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-dashed border-line bg-surface/40 text-[13px] text-muted">
              Type at least two words to trace attention.
            </div>
          ) : (
            <TokenJourneyDiagram
              key={`${text}-${activeHead}-${safeQueryIndex}`}
              result={result}
              activeHead={activeHead}
              queryIndex={safeQueryIndex}
              onQueryIndexChange={setQueryIndex}
            />
          )}
        </div>
      </div>

      {!tooShort ? (
        <div className="rounded-2xl border border-line bg-card p-4">
          <button
            type="button"
            onClick={() => setShowWeights((s) => !s)}
            className="flex w-full items-center justify-between text-left text-[12.5px] font-semibold text-ink"
          >
            <span>Show exact attention weights (full matrix)</span>
            <span className="text-muted">{showWeights ? "Hide ▲" : "Show ▼"}</span>
          </button>
          {showWeights ? (
            <div className="mt-3">
              <Heatmap
                title={`Head ${activeHead + 1} — every query token's weights over every key token`}
                rowLabels={result.tokens}
                colLabels={result.tokens}
                values={result.headWeights[activeHead]}
                cellColor={cyanAlpha}
                cellLabel={(v) => v.toFixed(2)}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

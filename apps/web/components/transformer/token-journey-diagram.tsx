"use client";

import { useEffect, useState } from "react";
import { MiniVector } from "@/components/transformer/mini-vector";
import type { AttentionResult } from "@/lib/transformer/attention";

const STAGES = [
  { label: "Tokens", detail: "Your sentence is split into tokens — the units the model reasons over." },
  { label: "Embeddings", detail: "Each token becomes a vector — a list of numbers capturing its meaning." },
  { label: "Query / Key / Value", detail: "The selected token asks a Query; every token offers a Key & a Value." },
  { label: "Attention scores", detail: "The Query is compared against every Key — stronger match = thicker line." },
  { label: "Softmax weights", detail: "Scores are normalized into weights that sum to 100% across all tokens." },
  { label: "Output", detail: "The token's new representation = a blend of every token's Value, by weight." },
];

function fanPath(xFrom: number, xTo: number): string {
  const mid = (xFrom + xTo) / 2;
  return `M ${xFrom} 2 Q ${mid} 50 ${xTo} 98`;
}

export function TokenJourneyDiagram({
  result,
  activeHead,
  queryIndex,
  onQueryIndexChange,
}: {
  result: AttentionResult;
  activeHead: number;
  queryIndex: number;
  onQueryIndexChange: (i: number) => void;
}) {
  // Mounted fresh (via the `key` the parent sets from sentence/head/query) each time any of
  // those change, so the intro animation replays automatically with no reset effect needed.
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  const n = result.tokens.length;
  const finished = step >= STAGES.length - 1;

  useEffect(() => {
    if (!playing || finished) return;
    const t = setTimeout(() => setStep((s) => s + 1), 1100);
    return () => clearTimeout(t);
  }, [playing, finished, step]);

  const weights = result.headWeights[activeHead][queryIndex];
  const colWidth = Math.max(72, Math.min(96, Math.floor(760 / n)));
  const gridStyle = { gridTemplateColumns: `repeat(${n}, ${colWidth}px)`, width: n * colWidth };

  function handlePlayClick() {
    if (finished) {
      setStep(0);
      setPlaying(true);
    } else {
      setPlaying((p) => !p);
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-card p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePlayClick}
            className="rounded-lg bg-cyan px-3 py-1.5 text-[12.5px] font-semibold text-on-accent hover:opacity-90"
          >
            {finished ? "Replay" : playing ? "Pause" : "Play"}
          </button>
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="rounded-lg border border-line px-2.5 py-1.5 text-[12.5px] font-semibold text-ink disabled:opacity-30"
          >
            ← Back
          </button>
          <button
            type="button"
            onClick={() => setStep((s) => Math.min(STAGES.length - 1, s + 1))}
            disabled={step === STAGES.length - 1}
            className="rounded-lg border border-line px-2.5 py-1.5 text-[12.5px] font-semibold text-ink disabled:opacity-30"
          >
            Next →
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          {STAGES.map((s, i) => (
            <button
              key={s.label}
              type="button"
              onClick={() => {
                setPlaying(false);
                setStep(i);
              }}
              title={s.label}
              className={`size-2 rounded-full transition-colors ${i <= step ? "bg-cyan" : "bg-line-strong"}`}
            />
          ))}
        </div>
      </div>

      <div className="mb-4 rounded-lg border border-line bg-surface/50 px-3 py-2 text-[12.5px] text-soft">
        <span className="font-semibold text-cyan">
          Step {step + 1}/{STAGES.length} — {STAGES[step].label}.
        </span>{" "}
        {STAGES[step].detail}
      </div>

      <div className="overflow-x-auto pb-2">
        {/* Row: tokens — click any token to make it the Query (the one whose journey we trace). */}
        <div className="grid gap-1.5" style={gridStyle}>
          {result.tokens.map((t, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onQueryIndexChange(i)}
              className={`truncate rounded-full border px-2 py-1 text-[12px] font-semibold transition-all ${
                i === queryIndex ? "border-cyan bg-cyan/15 text-cyan" : "border-line text-ink hover:border-cyan/40"
              }`}
              title={t}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Row: embeddings */}
        <div
          className={`mt-2 grid gap-1.5 transition-all duration-500 ${step >= 1 ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}
          style={gridStyle}
        >
          {result.embeddings.map((e, i) => (
            <div key={i} className="rounded-md border border-line bg-surface/40 p-1">
              <MiniVector values={e.slice(0, 6)} tone="cyan" />
            </div>
          ))}
        </div>

        {/* Row: Q / K / V */}
        <div
          className={`mt-2 grid gap-1.5 transition-all duration-500 ${step >= 2 ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}
          style={gridStyle}
        >
          {result.tokens.map((_, i) =>
            i === queryIndex ? (
              <div key={i} className="rounded-md border border-cyan/50 bg-cyan/10 p-1">
                <p className="mb-0.5 text-[9px] font-bold uppercase tracking-wide text-cyan">Query</p>
                <MiniVector values={result.headQ[activeHead][i]} tone="cyan" />
              </div>
            ) : (
              <div key={i} className="space-y-1 rounded-md border border-line bg-surface/40 p-1">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wide text-muted">Key</p>
                  <MiniVector values={result.headK[activeHead][i]} tone="teal" />
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wide text-muted">Value</p>
                  <MiniVector values={result.headV[activeHead][i]} tone="amber" />
                </div>
              </div>
            ),
          )}
        </div>

        {/* Connector band — the Query fans attention out to every token's Key. */}
        <div className={`relative h-16 transition-opacity duration-700 ${step >= 3 ? "opacity-100" : "opacity-0"}`} style={{ width: n * colWidth }}>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
            {weights.map((w, i) => {
              const xFrom = ((queryIndex + 0.5) / n) * 100;
              const xTo = ((i + 0.5) / n) * 100;
              return (
                <path
                  key={i}
                  d={fanPath(xFrom, xTo)}
                  fill="none"
                  stroke="var(--color-cyan)"
                  strokeWidth={0.6 + w * 5}
                  strokeLinecap="round"
                  style={{
                    opacity: step >= 3 ? 0.15 + w * 0.8 : 0,
                    transition: `opacity 400ms ${i * 60}ms`,
                  }}
                />
              );
            })}
          </svg>
        </div>

        {/* Row: softmax weights */}
        <div
          className={`grid gap-1.5 transition-all duration-500 ${step >= 4 ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}
          style={gridStyle}
        >
          {weights.map((w, i) => (
            <div key={i} className="rounded-md border border-line bg-surface/40 px-1.5 py-1 text-center">
              <p className="font-mono text-[12px] font-bold text-cyan">{(w * 100).toFixed(0)}%</p>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-line">
                <div className="h-full bg-cyan" style={{ width: `${w * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Output */}
      <div className={`mt-4 flex items-center gap-3 rounded-xl border border-cyan/40 bg-cyan/5 p-3 transition-all duration-500 ${step >= 5 ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}>
        <div className="rounded-md border border-line bg-surface/60 p-1.5">
          <MiniVector values={result.headOutput[activeHead][queryIndex]} tone="cyan" />
        </div>
        <p className="text-[12.5px] text-soft">
          This is the new representation of <span className="font-semibold text-ink">&quot;{result.tokens[queryIndex]}&quot;</span> — a blend of
          every token&apos;s Value, weighted by the attention scores above. It now carries context from the rest of the sentence.
        </p>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Shelf } from "@/components/reaction-lab/shelf";
import { Beaker } from "@/components/reaction-lab/beaker";
import { REAGENT_BY_ID } from "@/lib/reaction-lab/catalog";
import { findReaction } from "@/lib/reaction-lab/catalog";
import type { ReagentId, ReactionResult } from "@/lib/reaction-lab/types";

const EFFECT_LABEL: Record<NonNullable<ReactionResult["effect"]>, string> = {
  "color-change": "Color Change",
  gas: "Gas Formation",
  precipitate: "Precipitate Formation",
  explosive: "Unsafe Reaction",
};

export function ReactionWorkspace() {
  const [selected, setSelected] = useState<ReagentId[]>([]);
  const [result, setResult] = useState<ReactionResult | null | "none">(null);
  const [active, setActive] = useState(false);

  function toggle(id: ReagentId) {
    setActive(false);
    setResult(null);
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((p) => p !== id);
      if (prev.length >= 2) return [id];
      return [...prev, id];
    });
  }

  function mix() {
    if (selected.length !== 2) return;
    const found = findReaction(selected[0]!, selected[1]!);
    setResult(found ?? "none");
    setActive(true);
  }

  function reset() {
    setSelected([]);
    setResult(null);
    setActive(false);
  }

  const liquidColor = result && result !== "none" ? result.resultColor : selected.length > 0 ? REAGENT_BY_ID[selected[selected.length - 1]!]!.color : "#2a3a2f";

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr_300px]">
      <Shelf selected={selected} onToggle={toggle} />

      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-line/80 bg-[#0f0906] p-6">
        <Beaker liquidColor={liquidColor} effect={result && result !== "none" ? result.effect : null} active={active} />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={mix}
            disabled={selected.length !== 2}
            className="rounded-lg bg-flask px-5 py-1.5 text-[12.5px] font-bold text-[#2b0f00] shadow-[0_4px_14px_rgba(255,122,69,0.3)] transition-transform hover:-translate-y-0.5 disabled:opacity-40"
          >
            Mix Reagents
          </button>
          <button type="button" onClick={reset} disabled={selected.length === 0 && !result} className="rounded-lg border border-line px-3 py-1.5 text-[12px] font-semibold text-muted hover:text-ink disabled:opacity-40">
            Reset
          </button>
        </div>
        <p className="text-center text-[11.5px] text-faint">
          {selected.length === 0
            ? "Pick two reagents from the shelf."
            : selected.length === 1
              ? `${REAGENT_BY_ID[selected[0]!]!.name} selected — pick one more.`
              : `${REAGENT_BY_ID[selected[0]!]!.name} + ${REAGENT_BY_ID[selected[1]!]!.name} — ready to mix.`}
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-4">
        <p className="text-[10.5px] font-bold uppercase tracking-wide text-muted">Reaction Report</p>
        {!result ? (
          <p className="text-[12px] leading-relaxed text-faint">Mix two reagents to see the equation, product, and reaction type.</p>
        ) : result === "none" ? (
          <p className="rounded-lg border border-line/70 bg-surface px-3 py-2.5 text-[12.5px] text-muted">
            No visible reaction — these substances are chemically compatible and stay inert together.
          </p>
        ) : (
          <>
            <div>
              <p className="text-[10.5px] font-bold uppercase tracking-wide text-faint">Equation</p>
              <p className="font-mono text-[13px] text-flask">{result.equation}</p>
            </div>
            <div>
              <p className="text-[10.5px] font-bold uppercase tracking-wide text-faint">Final Product</p>
              <p className="text-[13px] text-ink">{result.product}</p>
            </div>
            <div>
              <p className="text-[10.5px] font-bold uppercase tracking-wide text-faint">Reaction Type</p>
              <p className={`text-[13px] font-bold ${result.effect === "explosive" ? "text-danger" : "text-ink"}`}>{EFFECT_LABEL[result.effect]}</p>
            </div>
            {result.effect === "explosive" ? (
              <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5 text-[12px] text-danger">⚠ {result.note}</p>
            ) : (
              <p className="text-[11.5px] leading-relaxed text-faint">{result.note}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

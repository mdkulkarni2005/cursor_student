"use client";

import { useState } from "react";
import { SlumpCone } from "@/components/material-test/slump-cone";
import { evaluateSlump, ELEMENT_RANGES, type SlumpShape, type ElementType, type SlumpResult } from "@/lib/material-test/slump";

const ELEMENT_OPTIONS = Object.entries(ELEMENT_RANGES) as [ElementType, (typeof ELEMENT_RANGES)[ElementType]][];

export function SlumpTest() {
  const [slumpMm, setSlumpMm] = useState(80);
  const [shape, setShape] = useState<SlumpShape>("true");
  const [element, setElement] = useState<ElementType>("slab");
  const [phase, setPhase] = useState<"idle" | "settled">("idle");
  const [result, setResult] = useState<SlumpResult | null>(null);

  function run() {
    setPhase("idle");
    setResult(null);
    setTimeout(() => {
      setPhase("settled");
      setResult(evaluateSlump(slumpMm, shape, element));
    }, 450);
  }

  function reset() {
    setPhase("idle");
    setResult(null);
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr_300px]">
      <div className="flex flex-col gap-4 rounded-2xl border border-line bg-card p-4">
        <label className="block">
          <span className="mb-1.5 flex items-center justify-between text-[11px] font-bold uppercase tracking-wide text-muted">
            Measured Slump <span className="font-mono text-blueprint">{slumpMm} mm</span>
          </span>
          <input type="range" min={0} max={200} step={5} value={slumpMm} onChange={(e) => setSlumpMm(Number(e.target.value))} className="w-full accent-blueprint" />
        </label>

        <div>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">Specimen Behaviour</p>
          <div className="flex gap-1 rounded-lg border border-line bg-surface p-1">
            {(["true", "shear", "collapse"] as SlumpShape[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setShape(s)}
                className={`flex-1 rounded-md px-2 py-1.5 text-[11.5px] font-semibold capitalize transition-colors ${shape === s ? "bg-blueprint text-white" : "text-muted hover:text-ink"}`}
              >
                {s}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-faint">
            True = settles evenly. Shear = one half slides off (invalid, per IS 1199). Collapse = mix too wet for a slump reading.
          </p>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-muted">Structural Element</span>
          <select value={element} onChange={(e) => setElement(e.target.value as ElementType)} className="w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[12.5px] text-ink outline-none focus:border-blueprint/50">
            {ELEMENT_OPTIONS.map(([id, meta]) => (
              <option key={id} value={id}>
                {meta.label} ({meta.min}–{meta.max}mm)
              </option>
            ))}
          </select>
        </label>

        <div className="flex gap-2">
          <button type="button" onClick={run} className="flex-1 rounded-lg bg-blueprint px-4 py-2 text-[12.5px] font-bold text-white shadow-[0_4px_14px_rgba(47,111,237,0.3)] transition-transform hover:-translate-y-0.5">
            Run Test
          </button>
          <button type="button" onClick={reset} className="rounded-lg border border-line px-3 py-2 text-[12px] font-semibold text-muted hover:text-ink">
            Reset
          </button>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-line/80 bg-[#1a1c20] p-6">
        <SlumpCone slumpMm={slumpMm} shape={shape} phase={phase} />
        <p className="text-center text-[11.5px] text-faint">{phase === "idle" ? "Mould filled and compacted in 3 layers — ready to lift." : "Cone lifted — concrete has settled."}</p>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-4">
        <p className="text-[10.5px] font-bold uppercase tracking-wide text-muted">Test Report</p>
        {!result ? (
          <p className="text-[12px] leading-relaxed text-faint">Set the slump, pick the behaviour and element, then run the test.</p>
        ) : (
          <>
            <div className={`rounded-lg px-3 py-2 text-[12.5px] font-bold ${result.pass ? "bg-success/12 text-success" : "bg-danger/12 text-danger"}`}>
              {result.testValid ? (result.pass ? "PASS" : "FAIL") : "INVALID TEST"}
            </div>
            {result.testValid ? <p className="text-[11.5px] text-faint">Workability: {result.workability}</p> : null}
            <p className="text-[12px] leading-relaxed text-soft">{result.explanation}</p>
          </>
        )}
      </div>
    </div>
  );
}

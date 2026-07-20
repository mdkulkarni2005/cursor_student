"use client";

import { useState } from "react";
import { CompressionCube } from "@/components/material-test/compression-cube";
import { evaluateCompression, GRADE_FCK, type ConcreteGrade, type CompressionResult } from "@/lib/material-test/compression";

const GRADES = Object.keys(GRADE_FCK) as ConcreteGrade[];

export function CompressionTest() {
  const [grade, setGrade] = useState<ConcreteGrade>("M25");
  const [measured, setMeasured] = useState(24);
  const [phase, setPhase] = useState<"idle" | "pressed">("idle");
  const [result, setResult] = useState<CompressionResult | null>(null);

  function run() {
    setPhase("idle");
    setResult(null);
    const outcome = evaluateCompression(grade, measured);
    setTimeout(() => {
      setPhase("pressed");
      setResult(outcome);
    }, 300);
  }

  function reset() {
    setPhase("idle");
    setResult(null);
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr_300px]">
      <div className="flex flex-col gap-4 rounded-2xl border border-line bg-card p-4">
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-muted">Concrete Grade</span>
          <select value={grade} onChange={(e) => setGrade(e.target.value as ConcreteGrade)} className="w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[12.5px] text-ink outline-none focus:border-blueprint/50">
            {GRADES.map((g) => (
              <option key={g} value={g}>
                {g} (fck = {GRADE_FCK[g]} N/mm²)
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 flex items-center justify-between text-[11px] font-bold uppercase tracking-wide text-muted">
            Measured Strength <span className="font-mono text-blueprint">{measured} N/mm²</span>
          </span>
          <input type="range" min={5} max={55} step={0.5} value={measured} onChange={(e) => setMeasured(Number(e.target.value))} className="w-full accent-blueprint" />
        </label>

        <div className="flex gap-2">
          <button type="button" onClick={run} className="flex-1 rounded-lg bg-blueprint px-4 py-2 text-[12.5px] font-bold text-white shadow-[0_4px_14px_rgba(47,111,237,0.3)] transition-transform hover:-translate-y-0.5">
            Run Test
          </button>
          <button type="button" onClick={reset} className="rounded-lg border border-line px-3 py-2 text-[12px] font-semibold text-muted hover:text-ink">
            Reset
          </button>
        </div>

        <p className="text-[11.5px] leading-relaxed text-faint">150mm cube, loaded to failure at 28 days. Checks the IS 456:2000 Cl 16.1 individual-test-result limit only — not the batch mean-of-4 criterion.</p>
      </div>

      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-line/80 bg-[#1a1c20] p-6">
        <CompressionCube phase={phase} pass={result?.pass ?? true} />
        <p className="text-center text-[11.5px] text-faint">{phase === "idle" ? "Cube centred between platens — ready to load." : "Loaded to failure."}</p>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-4">
        <p className="text-[10.5px] font-bold uppercase tracking-wide text-muted">Test Report</p>
        {!result ? (
          <p className="text-[12px] leading-relaxed text-faint">Pick a grade and measured strength, then run the test.</p>
        ) : (
          <>
            <div className={`rounded-lg px-3 py-2 text-[12.5px] font-bold ${result.pass ? "bg-success/12 text-success" : "bg-danger/12 text-danger"}`}>{result.pass ? "PASS" : "FAIL"}</div>
            <p className="text-[12px] leading-relaxed text-soft">{result.explanation}</p>
          </>
        )}
      </div>
    </div>
  );
}

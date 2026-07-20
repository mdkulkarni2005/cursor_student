"use client";

import { useMemo, useState } from "react";
import { ScopeTrace } from "@/components/signal-playground/scope-trace";
import { solveSingleInput, solveSumming } from "@/lib/opamp-trainer/solve";
import { VRAIL, type OpAmpConfig } from "@/lib/opamp-trainer/types";

const SAMPLE_RATE = 4000;
const DURATION_S = 0.5;

const CONFIGS: { value: OpAmpConfig; label: string }[] = [
  { value: "inverting", label: "Inverting" },
  { value: "non-inverting", label: "Non-Inverting" },
  { value: "summing", label: "Summing" },
];

function SegmentedControl<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex gap-1 rounded-lg border border-line bg-surface p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded-md px-2.5 py-1.5 text-[12px] font-semibold transition-colors ${
            value === o.value ? "bg-scope text-[#052b0d]" : "text-muted hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function NumberField({ label, value, onChange, unit }: { label: string; value: number; onChange: (v: number) => void; unit: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted">{label}</span>
      <div className="flex items-center gap-2 rounded-lg border border-line bg-surface px-2.5 py-2">
        <input type="number" className="w-full bg-transparent text-[13px] text-ink outline-none" value={value} onChange={(e) => onChange(Number(e.target.value))} />
        <span className="text-[11px] text-faint">{unit}</span>
      </div>
    </label>
  );
}

export function OpAmpWorkspace() {
  const [config, setConfig] = useState<OpAmpConfig>("inverting");

  const [vin, setVin] = useState(2);
  const [rin, setRin] = useState(10);
  const [rf, setRf] = useState(20);

  const [branches, setBranches] = useState([
    { vin: 1, ri: 10 },
    { vin: 2, ri: 20 },
  ]);
  const [summingRf, setSummingRf] = useState(10);

  const result = useMemo(() => {
    if (config === "summing") {
      const scaled = branches.map((b) => ({ vin: b.vin, ri: b.ri * 1000 }));
      return solveSumming(scaled, summingRf * 1000, SAMPLE_RATE, DURATION_S);
    }
    return solveSingleInput(config, vin, rin * 1000, rf * 1000, SAMPLE_RATE, DURATION_S);
  }, [config, vin, rin, rf, branches, summingRf]);

  const normalizedInput = useMemo(() => result.inputSamples.map((v) => v / VRAIL), [result.inputSamples]);
  const normalizedOutput = useMemo(() => result.outputSamples.map((v) => v / VRAIL), [result.outputSamples]);

  function updateBranch(i: number, field: "vin" | "ri", value: number) {
    setBranches((prev) => prev.map((b, idx) => (idx === i ? { ...b, [field]: value } : b)));
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[300px_1fr]">
      <div className="flex flex-col gap-4 rounded-2xl border border-line bg-card p-4">
        <div>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">Configuration</p>
          <SegmentedControl options={CONFIGS} value={config} onChange={setConfig} />
        </div>

        {config !== "summing" ? (
          <>
            <NumberField label="Input Voltage (peak)" value={vin} onChange={setVin} unit="V" />
            <NumberField label="Rin" value={rin} onChange={setRin} unit="kΩ" />
            <NumberField label="Rf (feedback)" value={rf} onChange={setRf} unit="kΩ" />
          </>
        ) : (
          <>
            {branches.map((b, i) => (
              <div key={i} className="rounded-lg border border-line/70 p-2.5">
                <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wide text-scope/80">Input {i + 1}</p>
                <div className="grid grid-cols-2 gap-2">
                  <NumberField label="Vin" value={b.vin} onChange={(v) => updateBranch(i, "vin", v)} unit="V" />
                  <NumberField label="Ri" value={b.ri} onChange={(v) => updateBranch(i, "ri", v)} unit="kΩ" />
                </div>
              </div>
            ))}
            <NumberField label="Rf (feedback)" value={summingRf} onChange={setSummingRf} unit="kΩ" />
          </>
        )}

        <div className="rounded-lg bg-surface p-3">
          {result.gain !== undefined ? (
            <p className="font-mono text-[13px] font-bold text-scope">
              Gain = {result.gain.toFixed(2)}
              <span className="ml-2 text-[11px] font-normal text-muted">
                ({config === "inverting" ? "−Rf/Rin" : "1 + Rf/Rin"})
              </span>
            </p>
          ) : (
            <p className="font-mono text-[11.5px] text-muted">Vout = −Rf · Σ(Vi/Ri)</p>
          )}
          <p className="mt-1.5 font-mono text-[13px] font-bold text-warning">
            Peak Vout = {Math.min(result.peakOutputV, VRAIL).toFixed(2)} V{result.saturated ? " (clipped)" : ""}
          </p>
          {result.saturated ? (
            <p className="mt-1 text-[11px] text-danger">
              Unclipped output would be {result.peakOutputV.toFixed(1)}V — saturating at the ±{VRAIL}V supply rail.
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <ScopeTrace samples={normalizedInput} label="Input Signal" color="#7cff6b" />
        <ScopeTrace samples={normalizedOutput} label="Output Signal" color="#ffb02e" />
      </div>
    </div>
  );
}

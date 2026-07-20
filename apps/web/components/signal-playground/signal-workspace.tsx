"use client";

import { useMemo, useState } from "react";
import { ScopeTrace } from "@/components/signal-playground/scope-trace";
import { generateWaveform, applyFilter, type WaveformType, type FilterType } from "@/lib/signal-playground/waveform";

const SAMPLE_RATE = 4000;
const DURATION_S = 0.5;

const WAVEFORMS: { value: WaveformType; label: string }[] = [
  { value: "sine", label: "Sine" },
  { value: "square", label: "Square" },
  { value: "triangle", label: "Triangle" },
];

const FILTERS: { value: FilterType; label: string }[] = [
  { value: "none", label: "None" },
  { value: "lpf", label: "Low Pass (LPF)" },
  { value: "hpf", label: "High Pass (HPF)" },
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

export function SignalWorkspace() {
  const [waveform, setWaveform] = useState<WaveformType>("sine");
  const [filter, setFilter] = useState<FilterType>("lpf");
  const [frequency, setFrequency] = useState(4);
  const [cutoff, setCutoff] = useState(6);

  const inputSamples = useMemo(() => generateWaveform(waveform, frequency, SAMPLE_RATE, DURATION_S), [waveform, frequency]);
  const outputSamples = useMemo(() => applyFilter(inputSamples, filter, cutoff, SAMPLE_RATE), [inputSamples, filter, cutoff]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
      <div className="flex flex-col gap-4 rounded-2xl border border-line bg-card p-4">
        <div>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">Waveform</p>
          <SegmentedControl options={WAVEFORMS} value={waveform} onChange={setWaveform} />
        </div>

        <label className="block">
          <span className="mb-1.5 flex items-center justify-between text-[11px] font-bold uppercase tracking-wide text-muted">
            Frequency <span className="font-mono text-scope">{frequency} Hz</span>
          </span>
          <input type="range" min={1} max={20} step={1} value={frequency} onChange={(e) => setFrequency(Number(e.target.value))} className="w-full accent-scope" />
        </label>

        <div>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">Filter</p>
          <SegmentedControl options={FILTERS} value={filter} onChange={setFilter} />
        </div>

        <label className="block">
          <span className="mb-1.5 flex items-center justify-between text-[11px] font-bold uppercase tracking-wide text-muted">
            Cutoff Frequency <span className="font-mono text-scope">{cutoff} Hz</span>
          </span>
          <input
            type="range"
            min={1}
            max={20}
            step={1}
            value={cutoff}
            onChange={(e) => setCutoff(Number(e.target.value))}
            disabled={filter === "none"}
            className="w-full accent-scope disabled:opacity-40"
          />
        </label>

        <p className="text-[11.5px] leading-relaxed text-faint">
          {filter === "none"
            ? "No filter applied — output matches input exactly."
            : filter === "lpf"
              ? "LPF passes frequencies below cutoff, attenuates higher ones — smooths sharp edges."
              : "HPF passes frequencies above cutoff, attenuates lower ones — removes slow drift, sharpens edges."}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <ScopeTrace samples={inputSamples} label="Input Signal" color="#7cff6b" />
        <ScopeTrace samples={outputSamples} label="Output Signal" color="#ffb02e" />
      </div>
    </div>
  );
}

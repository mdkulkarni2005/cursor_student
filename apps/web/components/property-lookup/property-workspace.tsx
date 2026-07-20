"use client";

import { useState } from "react";
import { PropertyChart } from "@/components/property-lookup/property-chart";
import { COMPOUNDS, COMPOUND_BY_ID } from "@/lib/property-lookup/compounds";
import { boilingPointAtPressure, densityAtTemperature, molarity, dilutedConcentration } from "@/lib/property-lookup/calc";

function Slider({ label, value, onChange, min, max, step, unit }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step: number; unit: string }) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between text-[11px] font-bold uppercase tracking-wide text-muted">
        {label} <span className="font-mono text-flask">{value} {unit}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-flask" />
    </label>
  );
}

export function PropertyWorkspace() {
  const [compoundId, setCompoundId] = useState(COMPOUNDS[0]!.id);
  const compound = COMPOUND_BY_ID[compoundId]!;

  const [pressure, setPressure] = useState(1);
  const [temperature, setTemperature] = useState(25);
  const [mass, setMass] = useState(10);
  const [volume, setVolume] = useState(1);
  const [c1, setC1] = useState(2);
  const [v1, setV1] = useState(1);
  const [v2, setV2] = useState(2);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-line bg-card p-4">
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">Compound</p>
        <select
          value={compoundId}
          onChange={(e) => setCompoundId(e.target.value)}
          className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-[13px] text-ink"
        >
          {COMPOUNDS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.formula})
            </option>
          ))}
        </select>
        <p className="mt-2 text-[11px] text-faint">
          1 atm boiling point {compound.boilingPointC}°C · density {compound.density25} g/mL at 25°C · molar mass {compound.molarMass} g/mol
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-line bg-card p-4">
          <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wide text-muted">Boiling Point vs. Pressure</p>
          <Slider label="Pressure" value={pressure} onChange={setPressure} min={0.2} max={3} step={0.1} unit="atm" />
          <div className="mt-3">
            <PropertyChart
              fn={(p) => boilingPointAtPressure(compound.boilingPointC, p)}
              xMin={0.2}
              xMax={3}
              xCurrent={pressure}
              xLabel="Pressure (atm)"
              yLabel="BP °C"
            />
          </div>
          <p className="mt-2 text-[10.5px] leading-relaxed text-faint">Illustrative trend anchored at the real 1 atm boiling point — not fitted Antoine data.</p>
        </div>

        <div className="rounded-2xl border border-line bg-card p-4">
          <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wide text-muted">Density vs. Temperature</p>
          <Slider label="Temperature" value={temperature} onChange={setTemperature} min={0} max={100} step={1} unit="°C" />
          <div className="mt-3">
            <PropertyChart
              fn={(t) => densityAtTemperature(compound.density25, t)}
              xMin={0}
              xMax={100}
              xCurrent={temperature}
              xLabel="Temperature (°C)"
              yLabel="ρ g/mL"
            />
          </div>
          <p className="mt-2 text-[10.5px] leading-relaxed text-faint">Illustrative linear thermal-expansion approximation anchored at the real 25°C density.</p>
        </div>

        <div className="rounded-2xl border border-line bg-card p-4">
          <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wide text-muted">Molarity Calculator</p>
          <div className="grid grid-cols-2 gap-3">
            <Slider label="Mass" value={mass} onChange={setMass} min={1} max={100} step={1} unit="g" />
            <Slider label="Volume" value={volume} onChange={setVolume} min={0.1} max={5} step={0.1} unit="L" />
          </div>
          <div className="mt-3">
            <PropertyChart
              fn={(v) => molarity(mass, compound.molarMass, v)}
              xMin={0.1}
              xMax={5}
              xCurrent={volume}
              xLabel="Volume (L)"
              yLabel="M"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-card p-4">
          <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wide text-muted">Concentration (Dilution)</p>
          <div className="grid grid-cols-2 gap-3">
            <Slider label="C1" value={c1} onChange={setC1} min={0.1} max={10} step={0.1} unit="M" />
            <Slider label="V1" value={v1} onChange={setV1} min={0.1} max={5} step={0.1} unit="L" />
          </div>
          <div className="mt-3">
            <Slider label="V2 (final volume)" value={v2} onChange={setV2} min={0.1} max={10} step={0.1} unit="L" />
          </div>
          <div className="mt-3">
            <PropertyChart
              fn={(v) => dilutedConcentration(c1, v1, v)}
              xMin={0.1}
              xMax={10}
              xCurrent={v2}
              xLabel="V2 (L)"
              yLabel="C2 M"
            />
          </div>
          <p className="mt-2 text-[10.5px] leading-relaxed text-faint">C₁V₁ = C₂V₂</p>
        </div>
      </div>
    </div>
  );
}

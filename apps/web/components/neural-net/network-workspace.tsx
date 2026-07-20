"use client";

import { useEffect, useMemo, useState } from "react";
import { NetworkCanvas } from "@/components/neural-net/network-canvas";
import { LAYER_SIZES, buildNetwork, forward } from "@/lib/neural-net/network";

const INITIAL_SEED = 42;

export function NetworkWorkspace() {
  const [seed, setSeed] = useState(INITIAL_SEED);
  const [inputs, setInputs] = useState<number[]>(() => Array(LAYER_SIZES[0]).fill(0.5));
  const [revealStep, setRevealStep] = useState(LAYER_SIZES.length - 1);
  const [playing, setPlaying] = useState(false);

  const network = useMemo(() => buildNetwork(seed), [seed]);
  const activations = useMemo(() => forward(network, inputs), [network, inputs]);

  const revealFinished = revealStep >= LAYER_SIZES.length - 1;

  useEffect(() => {
    if (!playing || revealFinished) return;
    const t = setTimeout(() => setRevealStep((s) => s + 1), 700);
    return () => clearTimeout(t);
  }, [playing, revealFinished, revealStep]);

  function runForwardPass() {
    setRevealStep(0);
    setPlaying(true);
  }

  function setInput(i: number, value: number) {
    setInputs((prev) => prev.map((v, idx) => (idx === i ? value : v)));
  }

  const output = activations[activations.length - 1];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[300px_1fr]">
      <div className="flex flex-col gap-4 rounded-2xl border border-line bg-card p-4">
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">Inputs</p>
          <div className="flex flex-col gap-3">
            {inputs.map((v, i) => (
              <label key={i} className="block">
                <span className="mb-1 flex items-center justify-between text-[12px] font-semibold text-ink">
                  Input {i + 1} <span className="font-mono text-cyan">{v.toFixed(2)}</span>
                </span>
                <input
                  type="range"
                  min={-1}
                  max={1}
                  step={0.05}
                  value={v}
                  onChange={(e) => setInput(i, Number(e.target.value))}
                  className="w-full accent-cyan"
                />
              </label>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={runForwardPass}
          className="rounded-lg bg-cyan px-3 py-2 text-[12.5px] font-semibold text-on-accent hover:opacity-90"
        >
          ▶ Animate forward pass
        </button>

        <button
          type="button"
          onClick={() => setSeed((s) => s + 1)}
          className="rounded-lg border border-line bg-surface px-3 py-2 text-[12.5px] font-semibold text-ink hover:border-cyan/50"
        >
          Regenerate weights
        </button>

        <div className="rounded-lg border border-line bg-surface/50 p-3 text-[11.5px] leading-relaxed text-faint">
          <p className="mb-1.5 font-semibold text-soft">How to read this</p>
          <p>
            Each connection is a weight — teal means it pushes the next neuron&apos;s value up, red means it pulls it down; thicker/brighter lines
            are stronger. Every neuron computes a weighted sum of everything feeding into it, then squashes it to 0–1. Drag the inputs and watch
            the whole network react instantly, or hit Animate to watch it happen layer by layer.
          </p>
        </div>

        <div className="rounded-lg border border-cyan/30 bg-cyan/5 p-3">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-cyan">Output</p>
          <div className="flex gap-3">
            {output.map((v, i) => (
              <span key={i} className="font-mono text-[13px] font-semibold text-ink">
                y{i + 1} = {v.toFixed(3)}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-card p-4">
        <NetworkCanvas network={network} activations={activations} revealStep={revealStep} />
      </div>
    </div>
  );
}

"use client";

import { LAYER_SIZES, type Network } from "@/lib/neural-net/network";

const WIDTH = 560;
const HEIGHT = 280;
const RADIUS = 15;

function nodeX(layer: number): number {
  return ((layer + 0.5) / LAYER_SIZES.length) * WIDTH;
}

function nodeY(index: number, count: number): number {
  return ((index + 1) / (count + 1)) * HEIGHT;
}

function activationFill(a: number): string {
  const t = Math.max(0, Math.min(1, a));
  // interpolate from dark surface to full cyan as activation rises
  const r = Math.round(35 + t * (246 - 35));
  const g = Math.round(40 + t * (146 - 40));
  const b = Math.round(50 + t * (30 - 50));
  return `rgb(${r}, ${g}, ${b})`;
}

export function NetworkCanvas({ network, activations, revealStep }: { network: Network; activations: number[][]; revealStep: number }) {
  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="Neural network forward pass diagram">
      {/* Edges */}
      {network.weights.map((layerWeights, l) =>
        layerWeights.map((neuronWeights, toIdx) =>
          neuronWeights.map((w, fromIdx) => {
            const x1 = nodeX(l);
            const y1 = nodeY(fromIdx, LAYER_SIZES[l]);
            const x2 = nodeX(l + 1);
            const y2 = nodeY(toIdx, LAYER_SIZES[l + 1]);
            const revealed = revealStep >= l + 1;
            const mag = Math.min(1, Math.abs(w) / 1.4);
            return (
              <line
                key={`${l}-${fromIdx}-${toIdx}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={w >= 0 ? "var(--color-teal)" : "var(--color-danger)"}
                strokeWidth={0.5 + mag * 2.5}
                style={{ opacity: revealed ? 0.15 + mag * 0.65 : 0, transition: `opacity 500ms ${(fromIdx + toIdx) * 40}ms` }}
              />
            );
          }),
        ),
      )}

      {/* Nodes */}
      {LAYER_SIZES.map((count, l) => (
        <g key={l}>
          {Array.from({ length: count }, (_, i) => {
            const revealed = revealStep >= l;
            const activation = activations[l]?.[i] ?? 0;
            return (
              <g key={i} style={{ opacity: revealed ? 1 : 0, transition: `opacity 500ms ${i * 60}ms` }}>
                <circle
                  cx={nodeX(l)}
                  cy={nodeY(i, count)}
                  r={RADIUS}
                  fill={l === 0 ? "var(--color-surface)" : activationFill(activation)}
                  stroke={l === 0 ? "var(--color-cyan)" : "var(--color-line-strong)"}
                  strokeWidth={1.5}
                  style={{ transition: "fill 400ms" }}
                />
                <text x={nodeX(l)} y={nodeY(i, count) + 4} textAnchor="middle" fontSize={10} fontWeight={700} fill={l === 0 ? "var(--color-cyan)" : "#fff"}>
                  {activation.toFixed(2)}
                </text>
              </g>
            );
          })}
          <text x={nodeX(l)} y={HEIGHT - 6} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--color-muted)">
            {l === 0 ? "Input" : l === LAYER_SIZES.length - 1 ? "Output" : `Hidden ${l}`}
          </text>
        </g>
      ))}
    </svg>
  );
}

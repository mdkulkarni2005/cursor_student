/**
 * Small feedforward network for teaching forward propagation — real math (weighted sums, sigmoid
 * activation), deterministic per seed so "Regenerate weights" gives a fresh but reproducible net.
 * Forward-pass visualization only; no training/backprop (a separate, much bigger build).
 */

/** mulberry32 — same small seedable PRNG used by the transformer visualizer. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const LAYER_SIZES = [3, 4, 4, 2] as const;

export type Network = {
  seed: number;
  /** weights[layer][toNeuron][fromNeuron] */
  weights: number[][][];
  /** biases[layer][toNeuron] */
  biases: number[][];
};

export function buildNetwork(seed: number): Network {
  const rand = mulberry32(seed);
  const weights: number[][][] = [];
  const biases: number[][] = [];
  for (let l = 1; l < LAYER_SIZES.length; l++) {
    const fromSize = LAYER_SIZES[l - 1];
    const toSize = LAYER_SIZES[l];
    weights.push(Array.from({ length: toSize }, () => Array.from({ length: fromSize }, () => (rand() * 2 - 1) * 1.4)));
    biases.push(Array.from({ length: toSize }, () => (rand() * 2 - 1) * 0.5));
  }
  return { seed, weights, biases };
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/** Returns activations per layer, including the input layer as activations[0]. */
export function forward(network: Network, inputs: number[]): number[][] {
  const activations: number[][] = [inputs];
  let prev = inputs;
  for (let l = 0; l < network.weights.length; l++) {
    const layerWeights = network.weights[l];
    const layerBiases = network.biases[l];
    const next = layerWeights.map((neuronWeights, i) => {
      const z = neuronWeights.reduce((sum, w, j) => sum + w * prev[j], 0) + layerBiases[i];
      return sigmoid(z);
    });
    activations.push(next);
    prev = next;
  }
  return activations;
}

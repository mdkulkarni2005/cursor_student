/**
 * Didactic self-attention — computes REAL scaled dot-product attention (the actual Transformer
 * math: Q/K^T, scale, softmax), but over deterministic pseudo-embeddings/projections seeded from
 * the token text rather than a trained model. This is intentional: the teaching value is seeing
 * the attention mechanism itself operate on your own sentence, not running real inference (which
 * the AI gateway doesn't expose attention weights for anyway).
 */

const EMBED_DIM = 8;
const HEAD_DIM = 4;

function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 — small, fast, seedable PRNG so the same token always gets the same vector. */
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

function seededVector(seed: number, dim: number): number[] {
  const rand = mulberry32(seed);
  return Array.from({ length: dim }, () => rand() * 2 - 1);
}

export function tokenize(text: string): string[] {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 10);
}

/** Fixed per-token embedding, seeded from the token's own text so it's stable across recomputes. */
function embed(token: string): number[] {
  return seededVector(fnv1a(token.toLowerCase()), EMBED_DIM);
}

/** Deterministic "learned" projection matrix for a given head + role (Q/K/V), seeded by name. */
function projectionMatrix(headIndex: number, role: "q" | "k" | "v"): number[][] {
  const seed = fnv1a(`head${headIndex}-${role}`);
  const rand = mulberry32(seed);
  return Array.from({ length: HEAD_DIM }, () => Array.from({ length: EMBED_DIM }, () => (rand() * 2 - 1) / Math.sqrt(EMBED_DIM)));
}

function matVec(mat: number[][], vec: number[]): number[] {
  return mat.map((row) => row.reduce((sum, w, i) => sum + w * vec[i], 0));
}

function dot(a: number[], b: number[]): number {
  return a.reduce((sum, v, i) => sum + v * b[i], 0);
}

function softmax(xs: number[]): number[] {
  const max = Math.max(...xs);
  const exps = xs.map((x) => Math.exp(x - max));
  const total = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / total);
}

export type AttentionResult = {
  tokens: string[];
  /** Raw token embedding per token (EMBED_DIM-wide) — for the "Embeddings" stage of the diagram. */
  embeddings: number[][];
  /** [head][queryTokenIndex][keyTokenIndex] → attention weight (rows sum to 1). */
  headWeights: number[][][];
  /** [head][tokenIndex] → Query/Key/Value vector (HEAD_DIM-wide) for that head. */
  headQ: number[][][];
  headK: number[][][];
  headV: number[][][];
  /** [head][queryTokenIndex] → output vector = weighted sum of V rows by that query's attention weights. */
  headOutput: number[][][];
  heads: number;
};

export function computeAttention(text: string, heads = 2): AttentionResult {
  const tokens = tokenize(text);
  const embeddings = tokens.map(embed);

  const headWeights: number[][][] = [];
  const headQ: number[][][] = [];
  const headK: number[][][] = [];
  const headV: number[][][] = [];
  const headOutput: number[][][] = [];

  for (let h = 0; h < heads; h++) {
    const Wq = projectionMatrix(h, "q");
    const Wk = projectionMatrix(h, "k");
    const Wv = projectionMatrix(h, "v");
    const Q = embeddings.map((e) => matVec(Wq, e));
    const K = embeddings.map((e) => matVec(Wk, e));
    const V = embeddings.map((e) => matVec(Wv, e));

    const scale = Math.sqrt(HEAD_DIM);
    const weights = Q.map((q) => {
      const scores = K.map((k) => dot(q, k) / scale);
      return softmax(scores);
    });
    const outputs = weights.map((rowWeights) =>
      Array.from({ length: HEAD_DIM }, (_, d) => rowWeights.reduce((sum, w, i) => sum + w * V[i][d], 0)),
    );

    headWeights.push(weights);
    headQ.push(Q);
    headK.push(K);
    headV.push(V);
    headOutput.push(outputs);
  }

  return { tokens, embeddings, headWeights, headQ, headK, headV, headOutput, heads };
}

export function attentionToJSON(result: AttentionResult): string {
  return JSON.stringify(
    {
      tokens: result.tokens,
      heads: result.headWeights.map((weights, h) => ({
        head: h + 1,
        weights: weights.map((row) => row.map((v) => Number(v.toFixed(4)))),
      })),
    },
    null,
    2,
  );
}

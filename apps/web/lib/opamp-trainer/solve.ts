import { VRAIL, type OpAmpConfig, type OpAmpResult, type SummingBranch } from "@/lib/opamp-trainer/types";

const FREQ_HZ = 2;

function sineWave(amplitudeV: number, sampleRate: number, durationS: number): number[] {
  const count = Math.round(sampleRate * durationS);
  const samples = new Array(count);
  for (let i = 0; i < count; i++) {
    samples[i] = amplitudeV * Math.sin((2 * Math.PI * FREQ_HZ * i) / sampleRate);
  }
  return samples;
}

/** Inverting-amp gain: Vout/Vin = -Rf/Rin. */
export function invertingGain(rf: number, rin: number): number {
  return -rf / Math.max(rin, 1e-6);
}

/** Non-inverting-amp gain: Vout/Vin = 1 + Rf/Rin. */
export function nonInvertingGain(rf: number, rin: number): number {
  return 1 + rf / Math.max(rin, 1e-6);
}

/** Real op-amps saturate at the supply rails rather than exceeding them. */
function clampToRail(v: number): number {
  return Math.max(-VRAIL, Math.min(VRAIL, v));
}

export function solveSingleInput(config: "inverting" | "non-inverting", vinAmplitude: number, rin: number, rf: number, sampleRate: number, durationS: number): OpAmpResult {
  const gain = config === "inverting" ? invertingGain(rf, rin) : nonInvertingGain(rf, rin);
  const inputSamples = sineWave(vinAmplitude, sampleRate, durationS);
  const rawOutput = inputSamples.map((v) => gain * v);
  const outputSamples = rawOutput.map(clampToRail);
  const peakOutputV = Math.max(...rawOutput.map(Math.abs));
  return { gain, inputSamples, outputSamples, peakOutputV, saturated: peakOutputV > VRAIL };
}

/** Summing amp: Vout = -Rf · Σ(Vi/Ri) — no single scalar gain since each branch has its own Ri. */
export function solveSumming(branches: SummingBranch[], rf: number, sampleRate: number, durationS: number): OpAmpResult {
  const count = Math.round(sampleRate * durationS);
  const branchWaves = branches.map((b) => sineWave(b.vin, sampleRate, durationS));
  const rawOutput = new Array(count);
  for (let i = 0; i < count; i++) {
    let sum = 0;
    branches.forEach((b, k) => {
      sum += branchWaves[k]![i]! / Math.max(b.ri, 1e-6);
    });
    rawOutput[i] = -rf * sum;
  }
  const inputSamples = branchWaves.reduce((acc, w) => acc.map((v, i) => v + w[i]!), new Array(count).fill(0));
  const outputSamples = rawOutput.map(clampToRail);
  const peakOutputV = Math.max(...rawOutput.map(Math.abs));
  return { inputSamples, outputSamples, peakOutputV, saturated: peakOutputV > VRAIL };
}

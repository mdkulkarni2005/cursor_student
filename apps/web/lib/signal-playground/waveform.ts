export type WaveformType = "sine" | "square" | "triangle";
export type FilterType = "none" | "lpf" | "hpf";

/** Normalized phase in [0,1) → waveform amplitude in [-1, 1]. Pure function, no randomness. */
function shapeAt(type: WaveformType, phase: number): number {
  switch (type) {
    case "sine":
      return Math.sin(2 * Math.PI * phase);
    case "square":
      return phase < 0.5 ? 1 : -1;
    case "triangle":
      return phase < 0.5 ? 4 * phase - 1 : 3 - 4 * phase;
  }
}

/** Sample a waveform of the given frequency over `durationS` seconds at `sampleRate` Hz. */
export function generateWaveform(type: WaveformType, freqHz: number, sampleRate: number, durationS: number): number[] {
  const count = Math.round(sampleRate * durationS);
  const samples: number[] = new Array(count);
  for (let i = 0; i < count; i++) {
    const t = i / sampleRate;
    const phase = (t * freqHz) % 1;
    samples[i] = shapeAt(type, phase < 0 ? phase + 1 : phase);
  }
  return samples;
}

/**
 * First-order RC low/high-pass filter, computed sample-by-sample (the same discrete-time
 * difference equation a student derives from the RC time constant τ = 1/(2π·f_c)):
 * LPF: y[n] = y[n-1] + α·(x[n] − y[n-1])
 * HPF: y[n] = α·(y[n-1] + x[n] − x[n-1])
 * where α = dt / (RC + dt) for LPF and α = RC / (RC + dt) for HPF.
 */
export function applyFilter(samples: number[], filter: FilterType, cutoffHz: number, sampleRate: number): number[] {
  if (filter === "none") return samples;
  const dt = 1 / sampleRate;
  const rc = 1 / (2 * Math.PI * Math.max(cutoffHz, 0.01));
  const out: number[] = new Array(samples.length);
  if (filter === "lpf") {
    const alpha = dt / (rc + dt);
    let prev = 0;
    for (let i = 0; i < samples.length; i++) {
      prev = prev + alpha * (samples[i]! - prev);
      out[i] = prev;
    }
  } else {
    const alpha = rc / (rc + dt);
    let prevOut = 0;
    let prevIn = samples[0] ?? 0;
    for (let i = 0; i < samples.length; i++) {
      const cur = samples[i]!;
      prevOut = alpha * (prevOut + cur - prevIn);
      prevIn = cur;
      out[i] = prevOut;
    }
  }
  return out;
}

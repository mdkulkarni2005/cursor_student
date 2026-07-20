/**
 * Simply-supported beam (pin at x=0, roller at x=span) — statics engine for the Load Diagram
 * Visualizer. Downward loads are positive. All math is plain-object pure functions so the UI can
 * recompute on every input change with no debounce, same as lib/signal-playground/waveform.ts.
 */

export type PointLoad = { id: string; position: number; magnitude: number };
export type UdlLoad = { id: string; start: number; end: number; magnitude: number };

export type BeamInput = { span: number; pointLoads: PointLoad[]; udls: UdlLoad[] };

export type TracePoint = { x: number; y: number };

export type BeamDiagrams = {
  reactions: { rA: number; rB: number };
  shear: TracePoint[];
  moment: TracePoint[];
  maxShear: TracePoint;
  maxMoment: TracePoint;
  valid: boolean;
  error?: string;
};

const SAMPLES = 240;
/** Offset used either side of a point load to render its shear discontinuity as a near-vertical jump. */
function jumpOffset(span: number) {
  return Math.max(span * 1e-4, 1e-6);
}

/** Reactions from statics: ΣM about A = 0, ΣF = 0. */
export function computeReactions(input: BeamInput): { rA: number; rB: number } {
  const { span, pointLoads, udls } = input;
  let totalLoad = 0;
  let momentAboutA = 0;
  for (const p of pointLoads) {
    totalLoad += p.magnitude;
    momentAboutA += p.magnitude * p.position;
  }
  for (const u of udls) {
    const length = u.end - u.start;
    const centroid = (u.start + u.end) / 2;
    totalLoad += u.magnitude * length;
    momentAboutA += u.magnitude * length * centroid;
  }
  const rB = span > 0 ? momentAboutA / span : 0;
  const rA = totalLoad - rB;
  return { rA, rB };
}

function shearAt(x: number, input: BeamInput, rA: number): number {
  let v = rA;
  for (const p of input.pointLoads) {
    if (p.position <= x) v -= p.magnitude;
  }
  for (const u of input.udls) {
    const covered = Math.min(Math.max(x, u.start), u.end) - u.start;
    if (covered > 0) v -= u.magnitude * covered;
  }
  return v;
}

function momentAt(x: number, input: BeamInput, rA: number): number {
  let m = rA * x;
  for (const p of input.pointLoads) {
    if (p.position <= x) m -= p.magnitude * (x - p.position);
  }
  for (const u of input.udls) {
    const covered = Math.min(Math.max(x, u.start), u.end) - u.start;
    if (covered > 0) {
      const centroid = u.start + covered / 2;
      m -= u.magnitude * covered * (x - centroid);
    }
  }
  return m;
}

function validate(input: BeamInput): string | undefined {
  if (!(input.span > 0)) return "Span must be greater than zero.";
  for (const p of input.pointLoads) {
    if (p.position < 0 || p.position > input.span) return `Point load position ${p.position}m is outside the span.`;
  }
  for (const u of input.udls) {
    if (u.start < 0 || u.end > input.span || u.end <= u.start) return `UDL range ${u.start}–${u.end}m is invalid for a ${input.span}m span.`;
  }
  return undefined;
}

/**
 * Samples SFD/BMD over the span and finds the exact max |shear| and max |moment| by checking
 * every breakpoint (supports, load positions, UDL ends) plus the analytical zero-shear crossing
 * within each breakpoint-bounded segment — that crossing is where bending moment peaks.
 */
export function computeBeamDiagrams(input: BeamInput): BeamDiagrams {
  const error = validate(input);
  if (error) {
    return { reactions: { rA: 0, rB: 0 }, shear: [], moment: [], maxShear: { x: 0, y: 0 }, maxMoment: { x: 0, y: 0 }, valid: false, error };
  }

  const { span } = input;
  const { rA, rB } = computeReactions(input);
  const eps = jumpOffset(span);

  const breakpoints = new Set<number>([0, span]);
  for (const p of input.pointLoads) breakpoints.add(clamp(p.position, 0, span));
  for (const u of input.udls) {
    breakpoints.add(clamp(u.start, 0, span));
    breakpoints.add(clamp(u.end, 0, span));
  }
  const sortedBreaks = [...breakpoints].sort((a, b) => a - b);

  // Dense uniform grid for a smooth curve, plus exact breakpoints (with ±eps around point loads
  // so the shear jump renders as a vertical edge instead of a diagonal).
  const xs = new Set<number>();
  for (let i = 0; i <= SAMPLES; i++) xs.add((i / SAMPLES) * span);
  for (const b of sortedBreaks) xs.add(b);
  for (const p of input.pointLoads) {
    const x = clamp(p.position, 0, span);
    if (x - eps > 0) xs.add(x - eps);
    if (x + eps < span) xs.add(x + eps);
  }

  const sortedXs = [...xs].sort((a, b) => a - b);
  const shear: TracePoint[] = sortedXs.map((x) => ({ x, y: shearAt(x, input, rA) }));
  const moment: TracePoint[] = sortedXs.map((x) => ({ x, y: momentAt(x, input, rA) }));

  // Candidate x's for the true extrema: every breakpoint, plus the analytical V=0 crossing
  // within each segment (V is affine between consecutive breakpoints, so this is exact).
  const candidates = new Set<number>(sortedBreaks);
  for (let i = 0; i < sortedBreaks.length - 1; i++) {
    const xL = sortedBreaks[i]!;
    const xR = sortedBreaks[i + 1]!;
    const vL = shearAt(xL + eps, input, rA);
    const vR = shearAt(xR - eps, input, rA);
    const slope = (vR - vL) / (xR - xL - 2 * eps || 1);
    if (Math.abs(slope) > 1e-9) {
      const x0 = xL + eps - vL / slope;
      if (x0 > xL && x0 < xR) candidates.add(x0);
    }
  }

  let maxShear: TracePoint = { x: 0, y: 0 };
  let maxMoment: TracePoint = { x: 0, y: 0 };
  for (const x of candidates) {
    const vBefore = shearAt(Math.max(x - eps, 0), input, rA);
    const vAfter = shearAt(Math.min(x + eps, span), input, rA);
    if (Math.abs(vBefore) > Math.abs(maxShear.y)) maxShear = { x, y: vBefore };
    if (Math.abs(vAfter) > Math.abs(maxShear.y)) maxShear = { x, y: vAfter };
    const m = momentAt(x, input, rA);
    if (Math.abs(m) > Math.abs(maxMoment.y)) maxMoment = { x, y: m };
  }

  return { reactions: { rA, rB }, shear, moment, maxShear, maxMoment, valid: true };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(Math.max(v, lo), hi);
}

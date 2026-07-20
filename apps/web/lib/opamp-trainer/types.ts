export type OpAmpConfig = "inverting" | "non-inverting" | "summing";

/** Dual-supply rail voltage — real op-amps clip here, and it's also what normalizes the traces
 *  onto the ScopeTrace's fixed [-1,1] viewBox. */
export const VRAIL = 12;

export type SummingBranch = { vin: number; ri: number };

export type OpAmpResult = {
  /** Scalar gain — only meaningful for inverting/non-inverting (summing has no single gain). */
  gain?: number;
  inputSamples: number[];
  outputSamples: number[];
  /** Peak output before clipping, in volts — used to report "would be Xv, clipped to rail". */
  peakOutputV: number;
  saturated: boolean;
};

/**
 * Cube compressive-strength acceptance — IS 456:2000 Cl 16.1, individual-test-result limb only
 * (Table 11, column 3): any single 150mm-cube result must be ≥ fck − 3 N/mm² for M15 and above.
 * The code's other limb — mean of any 4 non-overlapping consecutive results ≥ fck + 0.825×σ (or
 * fck + 3, whichever is greater) — needs a batch of samples and standard deviation, which a
 * single-cube simulator can't produce; that's called out explicitly in the failing explanation
 * rather than silently ignored.
 */

export type ConcreteGrade = "M15" | "M20" | "M25" | "M30" | "M35" | "M40";

/** fck (characteristic compressive strength, N/mm² at 28 days) — this is the definition of the grade designation itself, not a looked-up fact. */
export const GRADE_FCK: Record<ConcreteGrade, number> = { M15: 15, M20: 20, M25: 25, M30: 30, M35: 35, M40: 40 };

const INDIVIDUAL_TOLERANCE_N_MM2 = 3;

export type CompressionResult = { pass: boolean; minRequired: number; explanation: string };

export function evaluateCompression(grade: ConcreteGrade, measuredStrength: number): CompressionResult {
  const fck = GRADE_FCK[grade];
  const minRequired = fck - INDIVIDUAL_TOLERANCE_N_MM2;
  const pass = measuredStrength >= minRequired;
  const explanation = pass
    ? `${measuredStrength} N/mm² clears the IS 456:2000 Cl 16.1 individual-result limit for ${grade} (fck = ${fck} N/mm²): ≥ fck − 3 = ${minRequired} N/mm².`
    : `${measuredStrength} N/mm² is below the IS 456:2000 Cl 16.1 individual-result minimum for ${grade} (fck = ${fck} N/mm²): needs ≥ fck − 3 = ${minRequired} N/mm². Note the code's full acceptance criterion also requires the mean of any 4 consecutive results to clear fck + 3 N/mm² (or fck + 0.825×std-dev) — a single cube can only check this individual-result limb, not the batch one.`;
  return { pass, minRequired, explanation };
}

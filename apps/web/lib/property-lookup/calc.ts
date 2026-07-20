/**
 * Boiling point vs. pressure — an illustrative monotonic curve anchored at the compound's real
 * 1 atm boiling point, NOT fitted Antoine/Clausius-Clapeyron coefficients (which would need
 * per-compound enthalpy-of-vaporization data we can't respond with confidently). Boiling point
 * rises with pressure and falls under vacuum, which is the qualitatively correct shape — the
 * curve is intentionally exact only at 1 atm.
 */
export function boilingPointAtPressure(bp1atmC: number, pressureAtm: number): number {
  return bp1atmC + 25 * Math.log(Math.max(pressureAtm, 0.05));
}

/** Density vs. temperature — a simple linear thermal-expansion approximation anchored at the
 *  compound's real 25°C density. Illustrative, not a fitted expansion coefficient. */
export function densityAtTemperature(density25: number, tempC: number): number {
  return density25 * (1 - 0.0007 * (tempC - 25));
}

export function molarity(massG: number, molarMass: number, volumeL: number): number {
  if (volumeL <= 0) return 0;
  return massG / molarMass / volumeL;
}

/** Dilution law: C1V1 = C2V2. */
export function dilutedConcentration(c1: number, v1: number, v2: number): number {
  if (v2 <= 0) return 0;
  return (c1 * v1) / v2;
}

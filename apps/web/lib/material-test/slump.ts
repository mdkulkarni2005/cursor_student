/**
 * Slump test reference data — IS 456:2000 workability classification and commonly cited
 * per-element recommended slump ranges, plus IS 1199 test-validity rules (true/shear/collapse).
 * Values cross-checked against multiple independent references during implementation; the
 * workability bands (0–25 Very Low, 25–50 Low, 50–100 Medium, 100–150 High) and true/shear/
 * collapse validity rules are the load-bearing facts here — verify against IS 456/IS 1199 text
 * before treating this as a citable source of record.
 */

export type WorkabilityBand = { min: number; max: number; label: string };

export const WORKABILITY_BANDS: WorkabilityBand[] = [
  { min: 0, max: 25, label: "Very Low" },
  { min: 25, max: 50, label: "Low" },
  { min: 50, max: 100, label: "Medium" },
  { min: 100, max: 150, label: "High" },
];

export type SlumpShape = "true" | "shear" | "collapse";

export type ElementType = "pcc" | "raft-footing" | "column" | "beam" | "slab" | "pumped" | "pile";

export const ELEMENT_RANGES: Record<ElementType, { label: string; min: number; max: number }> = {
  pcc: { label: "PCC / Mass Concrete", min: 25, max: 75 },
  "raft-footing": { label: "Raft & Footing", min: 50, max: 100 },
  slab: { label: "Slab", min: 50, max: 100 },
  beam: { label: "Beam", min: 75, max: 125 },
  column: { label: "Column", min: 75, max: 150 },
  pumped: { label: "Pumped Concrete", min: 75, max: 150 },
  pile: { label: "Pile", min: 150, max: 200 },
};

export function classifyWorkability(slumpMm: number): string {
  if (slumpMm > 150) return "Collapse";
  const band = WORKABILITY_BANDS.find((b) => slumpMm >= b.min && slumpMm <= b.max);
  return band?.label ?? "Very Low";
}

export type SlumpResult = { pass: boolean; testValid: boolean; workability: string; explanation: string };

/** Evaluate a slump reading. A shear or collapse specimen is flagged invalid before any code-limit comparison — per IS 1199, those readings can't be trusted as workability data. */
export function evaluateSlump(slumpMm: number, shape: SlumpShape, element: ElementType): SlumpResult {
  if (shape === "shear") {
    return {
      pass: false,
      testValid: false,
      workability: "—",
      explanation:
        "Shear slump — one half of the specimen sheared away from the mass instead of settling evenly. Per IS 1199, this reading is invalid; repeat with a fresh sample. If it shears again, the mix lacks the cohesion needed for this test.",
    };
  }
  const workability = classifyWorkability(slumpMm);
  if (shape === "collapse" || slumpMm > 150) {
    return {
      pass: false,
      testValid: false,
      workability: "Collapse",
      explanation: `Collapse slump (${slumpMm}mm) — the mix is too wet or high-workability for a meaningful slump reading. Use the flow table test instead; this result can't be compared against the IS 456 workability ranges.`,
    };
  }
  const range = ELEMENT_RANGES[element];
  const pass = slumpMm >= range.min && slumpMm <= range.max;
  const explanation = pass
    ? `${slumpMm}mm slump (${workability} workability) falls inside the ${range.min}–${range.max}mm range commonly specified for ${range.label.toLowerCase()} — this mix is workable for the job.`
    : slumpMm < range.min
      ? `${slumpMm}mm slump (${workability} workability) is below the ${range.min}–${range.max}mm range for ${range.label.toLowerCase()} — too stiff, at risk of poor compaction and honeycombing.`
      : `${slumpMm}mm slump (${workability} workability) is above the ${range.min}–${range.max}mm range for ${range.label.toLowerCase()} — too wet, at risk of segregation and bleeding.`;
  return { pass, testValid: true, workability, explanation };
}

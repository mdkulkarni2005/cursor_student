import type { Reagent, ReactionResult, ReagentId } from "@/lib/reaction-lab/types";

export const REAGENTS: Reagent[] = [
  { id: "hcl", name: "Hydrochloric Acid", formula: "HCl (dilute)", color: "#dbeeff" },
  { id: "naoh", name: "Sodium Hydroxide", formula: "NaOH (aq)", color: "#eef6ff" },
  { id: "agno3", name: "Silver Nitrate", formula: "AgNO₃ (aq)", color: "#f5f5f0" },
  { id: "nacl", name: "Sodium Chloride", formula: "NaCl (aq)", color: "#f2f2f2" },
  { id: "na2co3", name: "Sodium Carbonate", formula: "Na₂CO₃ (aq)", color: "#eef2ea" },
  { id: "cacl2", name: "Calcium Chloride", formula: "CaCl₂ (aq)", color: "#f0f0f0" },
  { id: "kmno4", name: "Potassium Permanganate", formula: "KMnO₄ (aq)", color: "#7b2d8e" },
  { id: "h2o2", name: "Hydrogen Peroxide", formula: "H₂O₂ (aq)", color: "#f4faff" },
  { id: "phenolphthalein", name: "Phenolphthalein Indicator", formula: "C₂₀H₁₄O₄", color: "#fbfbfb" },
  { id: "vinegar", name: "Vinegar", formula: "CH₃COOH (dilute)", color: "#fbf6d9" },
  { id: "baking-soda", name: "Baking Soda Solution", formula: "NaHCO₃ (aq)", color: "#f6f6f2" },
  { id: "conc-h2so4", name: "Conc. Sulfuric Acid", formula: "H₂SO₄ (conc.)", color: "#fff6cc" },
];

export const REAGENT_BY_ID: Record<ReagentId, Reagent> = Object.fromEntries(REAGENTS.map((r) => [r.id, r])) as Record<ReagentId, Reagent>;

/**
 * Known reactions, each keyed by an unordered reagent pair. This is a small curated set of
 * textbook-standard reactions (acid-base, precipitation, decomposition) plus one deliberately
 * dangerous combination — mixing concentrated sulfuric acid into water is a real lab safety
 * warning (violent exothermic spattering), not just "the pair we didn't define a reaction for".
 * Any pair not listed here falls back to a mild "no reaction" state, not the blast effect.
 */
const REACTIONS: ReactionResult[] = [
  {
    reactants: ["hcl", "naoh"],
    equation: "HCl + NaOH → NaCl + H₂O",
    product: "Sodium Chloride + Water",
    effect: "color-change",
    resultColor: "#f2f2f2",
    note: "Classic acid-base neutralization — mildly exothermic, forms table salt and water.",
  },
  {
    reactants: ["naoh", "phenolphthalein"],
    equation: "NaOH + Phenolphthalein → pink complex",
    product: "Pink-colored solution",
    effect: "color-change",
    resultColor: "#ff6fb0",
    note: "Phenolphthalein turns pink in basic (pH > 8.2) solution — the classic indicator color change.",
  },
  {
    reactants: ["hcl", "phenolphthalein"],
    equation: "HCl + Phenolphthalein → colorless",
    product: "Colorless solution",
    effect: "color-change",
    resultColor: "#f7fbff",
    note: "Phenolphthalein stays colorless in acidic solution.",
  },
  {
    reactants: ["agno3", "nacl"],
    equation: "AgNO₃ + NaCl → AgCl↓ + NaNO₃",
    product: "Silver Chloride precipitate",
    effect: "precipitate",
    resultColor: "#e9e9e9",
    note: "Silver chloride is insoluble — forms an immediate white curdy precipitate.",
  },
  {
    reactants: ["cacl2", "na2co3"],
    equation: "CaCl₂ + Na₂CO₃ → CaCO₃↓ + 2NaCl",
    product: "Calcium Carbonate precipitate",
    effect: "precipitate",
    resultColor: "#eeeeee",
    note: "Calcium carbonate is insoluble in water — precipitates out as a fine white solid.",
  },
  {
    reactants: ["na2co3", "hcl"],
    equation: "Na₂CO₃ + 2HCl → 2NaCl + H₂O + CO₂↑",
    product: "Sodium Chloride + CO₂ gas",
    effect: "gas",
    resultColor: "#f2f2f2",
    note: "Carbonate + acid always releases CO₂ gas — visible as fizzing bubbles.",
  },
  {
    reactants: ["baking-soda", "vinegar"],
    equation: "NaHCO₃ + CH₃COOH → CH₃COONa + H₂O + CO₂↑",
    product: "Sodium Acetate + CO₂ gas",
    effect: "gas",
    resultColor: "#f6f6f2",
    note: "The classic baking-soda volcano — acetic acid releases CO₂ from the bicarbonate.",
  },
  {
    reactants: ["kmno4", "h2o2"],
    equation: "2KMnO₄ + 5H₂O₂ + 3H₂SO₄ → 2MnSO₄ + 5O₂↑ + K₂SO₄ + 8H₂O",
    product: "Mn²⁺ (colorless) + O₂ gas",
    effect: "color-change",
    resultColor: "#f4faff",
    note: "Permanganate's deep purple fades as it's reduced — a visible redox color change.",
  },
  {
    reactants: ["conc-h2so4", "nacl"],
    equation: "no controlled reaction — unsafe handling",
    product: "n/a",
    effect: "explosive",
    resultColor: "#3a1a12",
    note: "Concentrated sulfuric acid reacts violently and exothermically with almost anything wet — never mix it casually with an aqueous reagent.",
  },
  {
    reactants: ["conc-h2so4", "hcl"],
    equation: "no controlled reaction — unsafe handling",
    product: "n/a",
    effect: "explosive",
    resultColor: "#3a1a12",
    note: "Adding concentrated acid to another aqueous acid releases a sudden burst of heat — always add acid to water slowly, never the reverse.",
  },
];

function pairKey(a: ReagentId, b: ReagentId): string {
  return [a, b].sort().join("|");
}

const REACTION_BY_PAIR = new Map(REACTIONS.map((r) => [pairKey(r.reactants[0], r.reactants[1]), r]));

export function findReaction(a: ReagentId, b: ReagentId): ReactionResult | null {
  if (a === b) return null;
  return REACTION_BY_PAIR.get(pairKey(a, b)) ?? null;
}

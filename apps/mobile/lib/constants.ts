// Mirrors apps/web/lib/constants.ts DEPARTMENTS/SEMESTERS — kept in sync by hand (see
// packages/api-types/src/types.ts header for why mobile can't just import the web module).
export const DEPARTMENTS = [
  "Mechanical Engineering",
  "Computer Engineering",
  "Information Technology",
  "Electrical Engineering",
  "Civil Engineering",
  "Electronics & Telecommunication",
  "Chemical Engineering",
  "Other",
] as const;

export const SEMESTERS = ["1", "2", "3", "4", "5", "6", "7", "8"];

// Mirrors apps/web/lib/capabilities.ts CODING_DEPARTMENTS — seeds the coding-track default.
export const CODING_DEPARTMENTS = ["Computer Engineering", "Information Technology"];

/**
 * Mirrors apps/web/lib/branch-solver/features.ts BRANCH_SOLVER_FEATURES — the generic
 * numerical-solver features backed by /api/mobile/branch-solver. Drawing Viva and BOQ Estimator
 * are intentionally excluded: they're separate document types/flows with no mobile API yet.
 */
export const BRANCH_SOLVER_FEATURES: Record<string, { slug: string; label: string; blurb: string; placeholder: string }> = {
  "mech-solver": {
    slug: "mech-solver",
    label: "Mechanical Numerical Solver",
    blurb: "Strength of materials, thermodynamics, fluid mechanics, machine design.",
    placeholder: "e.g. A steel shaft of 40mm diameter transmits 20kW at 200rpm. Find the shear stress induced…",
  },
  "structural-checker": {
    slug: "structural-checker",
    label: "Structural Design Checker",
    blurb: "Beam, column, slab, and footing checks — with IS 456 / IS 800 clauses cited.",
    placeholder: "e.g. Design a simply supported RCC beam of span 4m carrying a UDL of 20 kN/m…",
  },
  "ee-solver": {
    slug: "ee-solver",
    label: "Electrical Numerical Solver",
    blurb: "Motors, transformers, protection systems, power systems, circuit theory.",
    placeholder: "e.g. A 3-phase, 415V, 50Hz induction motor draws 20A at 0.85 lagging PF. Find the input power…",
  },
  "ece-solver": {
    slug: "ece-solver",
    label: "ECE Numerical Solver",
    blurb: "Op-amp circuits, filter design, signal processing, digital logic, VLSI basics.",
    placeholder: "e.g. Design a first-order low-pass RC filter with a cutoff frequency of 1kHz…",
  },
  "chem-solver": {
    slug: "chem-solver",
    label: "Chemical Numerical Solver",
    blurb: "Mass & energy balances, reaction stoichiometry, heat/mass transfer, reactor design.",
    placeholder: "e.g. 1000 kg/hr of a 30% NaOH solution is fed to an evaporator to produce 50% NaOH…",
  },
};

/** Branch-specific feature slugs that have NO mobile screen yet (web-only for now). */
export const BRANCH_FEATURES_WEB_ONLY = ["drawing-viva", "boq-estimator"];

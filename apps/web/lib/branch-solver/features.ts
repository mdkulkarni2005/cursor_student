/**
 * UI config for the generic branch-solver route (/solve/[feature]). Each entry is a thin config —
 * the pipeline, page, and gating are all shared. New branch phases (Civil/Electrical/ECE/Chemical)
 * just add an entry here plus a system prompt in packages/ai/src/branch-solver.ts.
 */
export type BranchSolverFeature = {
  slug: string;
  label: string;
  blurb: string;
  placeholder: string;
  backLabel: string;
};

export const BRANCH_SOLVER_FEATURES: Record<string, BranchSolverFeature> = {
  "mech-solver": {
    slug: "mech-solver",
    label: "Mechanical Numerical Solver",
    blurb: "Strength of materials, thermodynamics, fluid mechanics, machine design — type or photograph the question and get a unit-checked, step-by-step solution.",
    placeholder: "e.g. A steel shaft of 40mm diameter transmits 20kW at 200rpm. Find the shear stress induced…",
    backLabel: "Mechanical tools",
  },
  "structural-checker": {
    slug: "structural-checker",
    label: "Structural Design Checker",
    blurb: "Beam, column, slab, and footing design checks — with the relevant IS 456 / IS 800 code clause cited for every step.",
    placeholder: "e.g. Design a simply supported RCC beam of span 4m carrying a UDL of 20 kN/m. Check for flexure and shear…",
    backLabel: "Civil tools",
  },
  "ee-solver": {
    slug: "ee-solver",
    label: "Electrical Solver & Nameplate Reader",
    blurb: "Motors, transformers, protection systems, power systems, circuit theory — type or photograph the question (or photograph a motor/transformer nameplate to auto-extract its specs) and get a unit-checked, step-by-step solution.",
    placeholder: "e.g. A 3-phase, 415V, 50Hz induction motor draws 20A at 0.85 lagging PF. Find the input power and kVA… (or upload a nameplate photo and ask for % slip / turns ratio)",
    backLabel: "Electrical tools",
  },
  "ece-solver": {
    slug: "ece-solver",
    label: "ECE Numerical Solver",
    blurb: "Op-amp circuits, filter design, signal processing, digital logic, VLSI basics — type or photograph the question and get a unit-checked, step-by-step solution.",
    placeholder: "e.g. Design a first-order low-pass RC filter with a cutoff frequency of 1kHz. Find R for C = 100nF…",
    backLabel: "ECE tools",
  },
  "chem-solver": {
    slug: "chem-solver",
    label: "Chemical Numerical Solver",
    blurb: "Mass & energy balances, reaction stoichiometry, heat/mass transfer, reactor design — type, describe, or photograph the problem (including a PFD) and get a unit-checked, step-by-step solution.",
    placeholder: "e.g. 1000 kg/hr of a 30% NaOH solution is fed to an evaporator to produce 50% NaOH. Find the water evaporated…",
    backLabel: "Chemical tools",
  },
  "ai-ml-solver": {
    slug: "ai-ml-solver",
    label: "AI/ML Numerical Solver",
    blurb: "Linear algebra, probability, loss derivatives, backprop gradients, optimizer updates, evaluation metrics — type or photograph the question and get a step-by-step worked solution with the actual numbers computed.",
    placeholder: "e.g. For a single neuron with sigmoid activation, weight w=0.4, input x=2, target y=1, compute dL/dw for MSE loss…",
    backLabel: "AI/ML tools",
  },
  "data-science-solver": {
    slug: "data-science-solver",
    label: "Data Science Numerical Solver",
    blurb: "Descriptive stats, probability, hypothesis testing, regression & correlation, A/B test analysis — type or photograph the question and get a step-by-step worked solution with the actual numbers computed.",
    placeholder: "e.g. A sample of 36 has mean 52 and std dev 8. Test H0: μ = 50 vs H1: μ ≠ 50 at α = 0.05…",
    backLabel: "Data Science tools",
  },
};

export function branchSolverFeature(slug: string): BranchSolverFeature | undefined {
  return BRANCH_SOLVER_FEATURES[slug];
}

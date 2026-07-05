import type { ComponentType, SVGProps } from "react";
import { CodeIcon, HelpIcon, LayersIcon } from "@/components/icons";

export type BranchToolCard = {
  feature: string;
  label: string;
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;
  blurb: string;
  cta: string;
};

/**
 * Dashboard cards for branch-specific tools, keyed by the BRANCH_FEATURES slug in
 * lib/capabilities.ts. Departments with unlocked slugs but no card here fall back to the
 * "coming soon" section on the dashboard. Each phase (Mechanical, Civil, Electrical, ECE,
 * Chemical) appends its cards here.
 */
export const BRANCH_TOOL_CARDS: BranchToolCard[] = [
  {
    feature: "mech-solver",
    label: "Mechanical Solver",
    href: "/solve/mech-solver",
    icon: CodeIcon,
    blurb: "Unit-checked, step-by-step solutions for strength of materials, thermo, fluids & machine design.",
    cta: "Solve a Problem",
  },
  {
    feature: "drawing-viva",
    label: "Drawing Viva Prep",
    href: "/drawing-viva",
    icon: HelpIcon,
    blurb: "Upload your engineering drawing and get likely viva questions on GD&T, tolerancing & projections.",
    cta: "Analyze Drawing",
  },
  {
    feature: "structural-checker",
    label: "Structural Design Checker",
    href: "/solve/structural-checker",
    icon: CodeIcon,
    blurb: "Beam, column, slab & footing checks with IS 456 / IS 800 code clauses cited.",
    cta: "Check a Design",
  },
  {
    feature: "boq-estimator",
    label: "BOQ Estimator",
    href: "/boq-estimator",
    icon: LayersIcon,
    blurb: "Turn dimensions or a drawing into an itemized Bill of Quantities with rates.",
    cta: "Generate BOQ",
  },
  {
    feature: "ee-solver",
    label: "Electrical Numerical Solver",
    href: "/solve/ee-solver",
    icon: CodeIcon,
    blurb: "Unit-checked, step-by-step solutions for motors, transformers, protection & power systems.",
    cta: "Solve a Problem",
  },
  {
    feature: "ece-solver",
    label: "ECE Numerical Solver",
    href: "/solve/ece-solver",
    icon: CodeIcon,
    blurb: "Unit-checked, step-by-step solutions for op-amps, filters, signal processing & digital logic.",
    cta: "Solve a Problem",
  },
  {
    feature: "chem-solver",
    label: "Chemical Numerical Solver",
    href: "/solve/chem-solver",
    icon: CodeIcon,
    blurb: "Unit-checked, step-by-step solutions for mass/energy balances, stoichiometry & reactor design.",
    cta: "Solve a Problem",
  },
];

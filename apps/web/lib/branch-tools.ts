import type { ComponentType, SVGProps } from "react";
import { CodeIcon, HelpIcon, LayersIcon, ChipIcon, WaveformIcon, OpAmpIcon, FlaskIcon, PipelineIcon, ChartIcon, BeamIcon, CubeIcon, NetworkIcon, TableIcon, LayeredNetworkIcon } from "@/components/icons";

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
    feature: "load-diagram-visualizer",
    label: "Load Diagram Visualizer",
    href: "/load-diagram-visualizer",
    icon: BeamIcon,
    blurb: "Set a beam span and loads, then watch the shear force and bending moment diagrams update live.",
    cta: "Open Visualizer",
  },
  {
    feature: "material-test-simulator",
    label: "Soil / Material Test Simulator",
    href: "/material-test-simulator",
    icon: CubeIcon,
    blurb: "Run an animated slump test or cube compression test and get a pass/fail verdict against IS code limits.",
    cta: "Run a Test",
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
    feature: "digital-logic-sim",
    label: "Digital Logic Simulator",
    href: "/digital-logic-sim",
    icon: ChipIcon,
    blurb: "Drag gates onto the bench, wire them up, flip switches and read the auto-generated truth table.",
    cta: "Build a Circuit",
  },
  {
    feature: "signal-playground",
    label: "Signal Playground",
    href: "/signal-playground",
    icon: WaveformIcon,
    blurb: "Shape sine, square & triangle waves through an LPF/HPF and watch input vs output live.",
    cta: "Open Playground",
  },
  {
    feature: "opamp-trainer",
    label: "Op-Amp Circuit Trainer",
    href: "/opamp-trainer",
    icon: OpAmpIcon,
    blurb: "Tune resistors on inverting, non-inverting & summing op-amp configs and see gain update live.",
    cta: "Train a Circuit",
  },
  {
    feature: "chem-solver",
    label: "Chemical Numerical Solver",
    href: "/solve/chem-solver",
    icon: CodeIcon,
    blurb: "Unit-checked, step-by-step solutions for mass/energy balances, stoichiometry & reactor design.",
    cta: "Solve a Problem",
  },
  {
    feature: "reaction-lab",
    label: "Virtual Reaction Lab",
    href: "/reaction-lab",
    icon: FlaskIcon,
    blurb: "Mix reagents from the shelf and watch color changes, gas, precipitates — or a blast if it's unsafe.",
    cta: "Enter the Lab",
  },
  {
    feature: "process-flow-builder",
    label: "Process Flow Builder",
    href: "/process-flow-builder",
    icon: PipelineIcon,
    blurb: "Wire up reactors, columns, exchangers & pumps, set flow rates, and catch mass-balance errors instantly.",
    cta: "Build a Process",
  },
  {
    feature: "property-lookup",
    label: "Property Lookup Tool",
    href: "/property-lookup",
    icon: ChartIcon,
    blurb: "Pick a compound and explore boiling point, density, molarity & concentration on live interactive charts.",
    cta: "Look Up a Compound",
  },
  {
    feature: "ai-ml-solver",
    label: "AI/ML Numerical Solver",
    href: "/solve/ai-ml-solver",
    icon: CodeIcon,
    blurb: "Step-by-step worked solutions for linear algebra, probability, backprop gradients & evaluation metrics.",
    cta: "Solve a Problem",
  },
  {
    feature: "transformer-visualizer",
    label: "Transformer Attention Visualizer",
    href: "/transformer-visualizer",
    icon: NetworkIcon,
    blurb: "Type a sentence and watch self-attention compute live — see which tokens attend to which, head by head.",
    cta: "Visualize Attention",
  },
  {
    feature: "neural-network-visualizer",
    label: "Neural Network Visualizer",
    href: "/neural-network-visualizer",
    icon: LayeredNetworkIcon,
    blurb: "Drag the inputs and watch a real feedforward network light up and compute its output, layer by layer.",
    cta: "Run the Network",
  },
  {
    feature: "data-science-solver",
    label: "Data Science Numerical Solver",
    href: "/solve/data-science-solver",
    icon: CodeIcon,
    blurb: "Step-by-step worked solutions for stats, hypothesis testing, regression & A/B test analysis.",
    cta: "Solve a Problem",
  },
  {
    feature: "csv-profiler",
    label: "CSV Auto-Profiler",
    href: "/csv-profiler",
    icon: TableIcon,
    blurb: "Upload a CSV and instantly get column stats, missing-value map, distributions & a correlation heatmap.",
    cta: "Profile a Dataset",
  },
];

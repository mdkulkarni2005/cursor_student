import type { CircuitNode, CircuitEdge, ComponentFault } from "@/lib/circuits/types";

export type FaultFinderDifficulty = "easy" | "medium" | "hard";

export type FaultFinderScenario = {
  slug: string;
  title: string;
  difficulty: FaultFinderDifficulty;
  description: string;
  nodes: CircuitNode[];
  edges: CircuitEdge[];
  /** Server-side only in spirit — never send this to the client directly, only via probe results. */
  fault: ComponentFault;
};

export const FAULT_FINDER_SCENARIOS: FaultFinderScenario[] = [
  {
    slug: "series-chain",
    title: "Series Resistor Chain",
    difficulty: "easy",
    description: "A 12V battery drives current through two resistors and an ammeter, all in series. Something's wrong — the ammeter reads far less current than expected.",
    nodes: [
      { id: "src", kind: "voltage-source", label: "Battery 12V", value: 12, position: { x: 0, y: 0 } },
      { id: "r1", kind: "resistor", label: "R1 100Ω", value: 100, position: { x: 280, y: 90 } },
      { id: "r2", kind: "resistor", label: "R2 220Ω", value: 220, position: { x: 280, y: 340 } },
      { id: "amm", kind: "ammeter", label: "Ammeter", value: 0, position: { x: 0, y: 420 } },
    ],
    edges: [
      { id: "e1", source: "src", sourceHandle: "b", target: "r1", targetHandle: "a" },
      { id: "e2", source: "r1", sourceHandle: "b", target: "r2", targetHandle: "a" },
      { id: "e3", source: "r2", sourceHandle: "b", target: "amm", targetHandle: "a" },
      { id: "e4", source: "amm", sourceHandle: "b", target: "src", targetHandle: "a" },
    ],
    fault: { componentId: "r2", type: "open" },
  },
  {
    slug: "parallel-branches",
    title: "Parallel Resistor Branches",
    difficulty: "medium",
    description: "A 12V battery feeds two resistors wired in parallel, with an ammeter in the main line. The main-line current is way higher than it should be for these resistor values.",
    nodes: [
      { id: "src", kind: "voltage-source", label: "Battery 12V", value: 12, position: { x: 0, y: 0 } },
      { id: "amm", kind: "ammeter", label: "Ammeter", value: 0, position: { x: 0, y: 160 } },
      { id: "r1", kind: "resistor", label: "R1 100Ω", value: 100, position: { x: -220, y: 340 } },
      { id: "r2", kind: "resistor", label: "R2 220Ω", value: 220, position: { x: 220, y: 340 } },
    ],
    edges: [
      { id: "e1", source: "src", sourceHandle: "b", target: "amm", targetHandle: "a" },
      { id: "e2", source: "amm", sourceHandle: "b", target: "r1", targetHandle: "a" },
      { id: "e3", source: "amm", sourceHandle: "b", target: "r2", targetHandle: "a" },
      { id: "e4", source: "r1", sourceHandle: "b", target: "src", targetHandle: "a" },
      { id: "e5", source: "r2", sourceHandle: "b", target: "src", targetHandle: "a" },
    ],
    fault: { componentId: "r1", type: "short" },
  },
  {
    slug: "led-indicator",
    title: "LED Indicator Circuit",
    difficulty: "easy",
    description: "A 9V supply, a 220Ω current-limiting resistor, and an LED indicator light — wired in series. The LED isn't lighting up.",
    nodes: [
      { id: "src", kind: "voltage-source", label: "Battery 9V", value: 9, position: { x: 0, y: 0 } },
      { id: "r1", kind: "resistor", label: "R1 220Ω", value: 220, position: { x: 260, y: 130 } },
      { id: "led", kind: "led", label: "LED", value: 50, position: { x: 0, y: 320 } },
    ],
    edges: [
      { id: "e1", source: "src", sourceHandle: "b", target: "r1", targetHandle: "a" },
      { id: "e2", source: "r1", sourceHandle: "b", target: "led", targetHandle: "a" },
      { id: "e3", source: "led", sourceHandle: "b", target: "src", targetHandle: "a" },
    ],
    fault: { componentId: "led", type: "open" },
  },
  {
    slug: "motor-drive",
    title: "Motor Drive Circuit",
    difficulty: "medium",
    description: "A 24V supply powers a small DC motor through a protective series resistor, with an ammeter monitoring the line. The motor isn't spinning at all.",
    nodes: [
      { id: "src", kind: "voltage-source", label: "Battery 24V", value: 24, position: { x: 0, y: 0 } },
      { id: "fuse", kind: "resistor", label: "Protection R 10Ω", value: 10, position: { x: 280, y: 100 } },
      { id: "amm", kind: "ammeter", label: "Ammeter", value: 0, position: { x: 280, y: 320 } },
      { id: "motor", kind: "motor", label: "Motor", value: 24, position: { x: 0, y: 420 } },
    ],
    edges: [
      { id: "e1", source: "src", sourceHandle: "b", target: "fuse", targetHandle: "a" },
      { id: "e2", source: "fuse", sourceHandle: "b", target: "amm", targetHandle: "a" },
      { id: "e3", source: "amm", sourceHandle: "b", target: "motor", targetHandle: "a" },
      { id: "e4", source: "motor", sourceHandle: "b", target: "src", targetHandle: "a" },
    ],
    fault: { componentId: "fuse", type: "open" },
  },
];

export const FAULT_FINDER_BY_SLUG: Record<string, FaultFinderScenario> = Object.fromEntries(
  FAULT_FINDER_SCENARIOS.map((s) => [s.slug, s]),
);

/** Only what's safe to send to the client — the fault identity/type never leaves the server directly. */
export function publicNetlist(scenario: FaultFinderScenario): { nodes: CircuitNode[]; edges: CircuitEdge[] } {
  return { nodes: scenario.nodes, edges: scenario.edges };
}

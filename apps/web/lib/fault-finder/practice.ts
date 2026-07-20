import { prisma } from "@studentos/db";
import { solveDcCircuit } from "@/lib/circuits/solve";
import { FAULT_FINDER_BY_SLUG } from "@/lib/fault-finder/catalog";
import type { CircuitReading } from "@/lib/circuits/types";

/** Probe a single component with a real multimeter reading — solved fresh server-side with the
 *  scenario's real (hidden) fault applied. Never returns the full readings map or the fault
 *  identity, only what this one probe would show — same "hidden data stays server-side" policy
 *  as DSA's hidden test cases. */
export function probeComponent(slug: string, componentId: string): CircuitReading | null {
  const scenario = FAULT_FINDER_BY_SLUG[slug];
  if (!scenario) return null;
  if (!scenario.nodes.some((n) => n.id === componentId)) return null;

  const result = solveDcCircuit(scenario.nodes, scenario.edges, [scenario.fault]);
  if (!result.ok) return { nodeId: componentId, connected: false };
  return result.readings[componentId] ?? { nodeId: componentId, connected: false };
}

export type DiagnosisResult = {
  correct: boolean;
  actualComponentId: string;
  actualComponentLabel: string;
  actualType: "open" | "short";
  explanation: string;
};

const FAULT_EXPLANATION: Record<"open" | "short", string> = {
  open: "it had failed OPEN — the branch is effectively broken, so no current can flow through it (and anything sharing that series path reads 0A).",
  short: "it had failed SHORT (collapsed to ~0Ω) — current takes the path of least resistance through it, causing an abnormally high current in that branch.",
};

/** Deterministic scoring — the correct fault is known catalog data, no AI needed. */
export async function submitDiagnosis(
  userId: string,
  slug: string,
  guessComponentId: string,
  guessFaultType: "open" | "short",
): Promise<DiagnosisResult> {
  const scenario = FAULT_FINDER_BY_SLUG[slug];
  if (!scenario) throw new Error("Unknown scenario.");

  const actual = scenario.fault;
  const actualNode = scenario.nodes.find((n) => n.id === actual.componentId)!;
  const correct = guessComponentId === actual.componentId && guessFaultType === actual.type;

  const explanation = correct
    ? `Correct! ${actualNode.label} was the fault — ${FAULT_EXPLANATION[actual.type]}`
    : `Not quite. The actual fault was in ${actualNode.label} — ${FAULT_EXPLANATION[actual.type]}`;

  await prisma.faultFinderAttempt.create({
    data: { userId, scenarioSlug: slug, guessComponentId, guessFaultType, correct },
  });

  return { correct, actualComponentId: actual.componentId, actualComponentLabel: actualNode.label, actualType: actual.type, explanation };
}

export type FaultFinderProgress = { attemptedSlugs: string[]; solvedSlugs: string[]; totalAttempts: number };

export async function getFaultFinderProgress(userId: string): Promise<FaultFinderProgress> {
  const attempts = await prisma.faultFinderAttempt.findMany({
    where: { userId },
    select: { scenarioSlug: true, correct: true },
  });
  return {
    attemptedSlugs: [...new Set(attempts.map((a) => a.scenarioSlug))],
    solvedSlugs: [...new Set(attempts.filter((a) => a.correct).map((a) => a.scenarioSlug))],
    totalAttempts: attempts.length,
  };
}

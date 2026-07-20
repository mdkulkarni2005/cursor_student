/**
 * Branch-aware capabilities. Department SEEDS a sensible default for the coding track (DSA + the
 * coding interview round + system design later), but it's a default, NOT a lock — a non-CS student
 * ("mechanical but in IT") can opt in, and a CS student can opt out.
 *
 * Gating is applied to DEFAULT navigation only (hide from nav/home grid, don't auto-select the
 * coding round). It FAILS OPEN: a missing/unknown value shows everything.
 */
export const CODING_DEPARTMENTS = [
  "Computer Engineering",
  "Information Technology",
  "Artificial Intelligence & Machine Learning",
  "Data Science",
];

/** The default coding-track value to pre-tick at onboarding for a department. */
export function defaultCodingForDepartment(dept?: string | null): boolean {
  return !!dept && CODING_DEPARTMENTS.includes(dept);
}

/** Whether to surface coding features (DSA, coding interview) by default. Fail-open. */
export function codingEnabledFor(user: { codingEnabled?: boolean | null }): boolean {
  return user.codingEnabled !== false;
}

/**
 * Branch-specific tool registry — the non-coding-track analogue of CODING_DEPARTMENTS above.
 * Unlike coding, this is derived purely from `department` (no stored per-user override): the
 * Settings page lets a student change department any time, so re-deriving on every read keeps
 * gating correct with zero migration. Departments not listed here (including "Other") get an
 * empty feature set and see the "coming soon" state instead of these tools.
 */
export const BRANCH_FEATURES: Record<string, string[]> = {
  "Mechanical Engineering": ["mech-solver", "drawing-viva"],
  "Civil Engineering": ["structural-checker", "boq-estimator", "load-diagram-visualizer", "material-test-simulator"],
  "Electrical Engineering": ["ee-solver", "circuit-builder", "fault-finder"],
  "Electronics & Telecommunication": ["ece-solver", "digital-logic-sim", "signal-playground", "opamp-trainer"],
  "Chemical Engineering": ["chem-solver", "reaction-lab", "process-flow-builder", "property-lookup"],
  "Artificial Intelligence & Machine Learning": ["ai-ml-solver", "transformer-visualizer", "neural-network-visualizer"],
  "Data Science": ["data-science-solver", "csv-profiler"],
};

/** All branch-specific feature slugs a department unlocks. Fails open to an empty list. */
export function branchFeaturesFor(department?: string | null): string[] {
  return (department && BRANCH_FEATURES[department]) || [];
}

/** Whether a given department has a specific branch tool unlocked. */
export function hasBranchFeature(department: string | null | undefined, feature: string): boolean {
  return branchFeaturesFor(department).includes(feature);
}

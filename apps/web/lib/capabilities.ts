/**
 * Branch-aware capabilities. Department SEEDS a sensible default for the coding track (DSA + the
 * coding interview round + system design later), but it's a default, NOT a lock — a non-CS student
 * ("mechanical but in IT") can opt in, and a CS student can opt out.
 *
 * Gating is applied to DEFAULT navigation only (hide from nav/home grid, don't auto-select the
 * coding round). It FAILS OPEN: a missing/unknown value shows everything.
 */
export const CODING_DEPARTMENTS = ["Computer Engineering", "Information Technology"];

/** The default coding-track value to pre-tick at onboarding for a department. */
export function defaultCodingForDepartment(dept?: string | null): boolean {
  return !!dept && CODING_DEPARTMENTS.includes(dept);
}

/** Whether to surface coding features (DSA, coding interview) by default. Fail-open. */
export function codingEnabledFor(user: { codingEnabled?: boolean | null }): boolean {
  return user.codingEnabled !== false;
}

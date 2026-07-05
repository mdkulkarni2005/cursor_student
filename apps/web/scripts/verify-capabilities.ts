/**
 * Branch-aware capability gating — defaults seed from department, but it's fail-open and toggleable.
 *   pnpm --filter web verify:capabilities
 */
import assert from "node:assert";
import { codingEnabledFor, defaultCodingForDepartment, branchFeaturesFor, hasBranchFeature, CODING_DEPARTMENTS } from "../lib/capabilities.js";
import { BRANCH_TOOL_CARDS } from "../lib/branch-tools.js";

/** Mirrors the exact branch decision in app/dashboard/page.tsx's "Branch Tools" section. */
function dashboardBranchSection(department: string | null): "none" | "cards" | "coming-soon" {
  if (department && CODING_DEPARTMENTS.includes(department)) return "none";
  const unlocked = branchFeaturesFor(department);
  const cards = BRANCH_TOOL_CARDS.filter((c) => unlocked.includes(c.feature));
  return cards.length > 0 ? "cards" : "coming-soon";
}

let pass = 0;
function ok(name: string, cond: boolean) { assert(cond, `FAILED: ${name}`); console.log(`  ✓ ${name}`); pass++; }

console.log("Branch capability gating\n");

// Department seeds the default.
ok("CS → coding default on", defaultCodingForDepartment("Computer Engineering") === true);
ok("IT → coding default on", defaultCodingForDepartment("Information Technology") === true);
ok("Mechanical → coding default off", defaultCodingForDepartment("Mechanical Engineering") === false);
ok("unknown/empty → default off", defaultCodingForDepartment(null) === false);

// Gating is fail-open: only an explicit false hides coding.
ok("explicit true → shown", codingEnabledFor({ codingEnabled: true }) === true);
ok("explicit false → hidden", codingEnabledFor({ codingEnabled: false }) === false);
ok("missing → shown (fail-open)", codingEnabledFor({}) === true);
ok("null → shown (fail-open)", codingEnabledFor({ codingEnabled: null }) === true);

// Branch-specific tools — derived purely from department, no stored override.
ok("Mechanical → mech-solver unlocked", hasBranchFeature("Mechanical Engineering", "mech-solver"));
ok("Mechanical → drawing-viva unlocked", hasBranchFeature("Mechanical Engineering", "drawing-viva"));
ok("Mechanical → not ee-solver", !hasBranchFeature("Mechanical Engineering", "ee-solver"));
ok("Civil → structural-checker + boq-estimator", branchFeaturesFor("Civil Engineering").length === 2);
ok("Electrical → ee-solver unlocked", hasBranchFeature("Electrical Engineering", "ee-solver"));
ok("ECE → ece-solver unlocked", hasBranchFeature("Electronics & Telecommunication", "ece-solver"));
ok("Chemical → chem-solver unlocked", hasBranchFeature("Chemical Engineering", "chem-solver"));
ok("Computer Engineering → no branch tools (has coding track instead)", branchFeaturesFor("Computer Engineering").length === 0);
ok("Other/unknown → empty (coming soon)", branchFeaturesFor("Other").length === 0);
ok("null department → empty, fail-open to no crash", branchFeaturesFor(null).length === 0);

// Dashboard "Branch Tools" section — the exact bug class to guard against: an unlisted/"Other"
// department must see an explicit "coming soon", not nothing.
ok("Mechanical → real cards on dashboard", dashboardBranchSection("Mechanical Engineering") === "cards");
ok("Civil → real cards on dashboard", dashboardBranchSection("Civil Engineering") === "cards");
ok("CS → no branch section (has coding track)", dashboardBranchSection("Computer Engineering") === "none");
ok("IT → no branch section (has coding track)", dashboardBranchSection("Information Technology") === "none");
ok("\"Other\" → coming-soon, NOT nothing", dashboardBranchSection("Other") === "coming-soon");
ok("null department → coming-soon, NOT nothing", dashboardBranchSection(null) === "coming-soon");

console.log(`\n✅ ${pass} capability checks passed.`);

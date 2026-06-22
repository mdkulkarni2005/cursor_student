/**
 * Branch-aware capability gating — defaults seed from department, but it's fail-open and toggleable.
 *   pnpm --filter web verify:capabilities
 */
import assert from "node:assert";
import { codingEnabledFor, defaultCodingForDepartment } from "../lib/capabilities.js";

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

console.log(`\n✅ ${pass} capability checks passed.`);

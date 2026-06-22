/**
 * Phase B reliability primitives — bounded transient retry, the rate limiter, and friendly errors.
 *   pnpm --filter web verify:reliability
 */
import assert from "node:assert";
import { withAiRetry, isTransientError } from "@studentos/ai";
import { rateLimit, friendlyError, RateLimitError } from "../lib/reliability.js";

let pass = 0;
function ok(name: string, cond: boolean) {
  assert(cond, `FAILED: ${name}`);
  console.log(`  ✓ ${name}`);
  pass++;
}

async function main() {
  console.log("Phase B reliability primitives\n");

  // 1. Transient classification.
  ok("429 is transient", isTransientError({ statusCode: 429 }));
  ok("503 is transient", isTransientError({ statusCode: 503 }));
  ok('"overloaded" is transient', isTransientError({ message: "Model is overloaded" }));
  ok("isRetryable:true honored", isTransientError({ isRetryable: true }));
  ok("400 is permanent", !isTransientError({ statusCode: 400 }));
  ok("validation error is permanent", !isTransientError({ message: "schema validation failed" }));
  ok("isRetryable:false honored", !isTransientError({ isRetryable: false }));

  // 2. withAiRetry: retries transient, then succeeds.
  let calls = 0;
  const recovered = await withAiRetry(async () => {
    calls++;
    if (calls < 3) throw { statusCode: 503, message: "overloaded" };
    return "ok";
  }, { tries: 3, baseDelayMs: 5 });
  ok("retries transient failures then succeeds", recovered === "ok" && calls === 3);

  // 3. Permanent error fails FAST (no retries).
  let permCalls = 0;
  let threw = false;
  try {
    await withAiRetry(async () => { permCalls++; throw { statusCode: 400, message: "bad request" }; }, { tries: 3, baseDelayMs: 5 });
  } catch { threw = true; }
  ok("permanent error fails fast (1 call, no retry)", threw && permCalls === 1);

  // 4. Always-transient gives up after `tries` (never an infinite loop).
  let loopCalls = 0;
  let gaveUp = false;
  try {
    await withAiRetry(async () => { loopCalls++; throw { statusCode: 503 }; }, { tries: 3, baseDelayMs: 5 });
  } catch { gaveUp = true; }
  ok("always-transient gives up after `tries` (bounded, no infinite loop)", gaveUp && loopCalls === 3);

  // 5. Rate limiter: allows up to limit, then blocks.
  const u = "user-test";
  for (let i = 0; i < 3; i++) rateLimit(u, "t", 3, 60_000);
  let blocked = false;
  try { rateLimit(u, "t", 3, 60_000); } catch (e) { blocked = e instanceof RateLimitError; }
  ok("rate limiter blocks the (limit+1)th call", blocked);
  ok("different action has its own bucket", (() => { try { rateLimit(u, "other", 3, 60_000); return true; } catch { return false; } })());

  // 6. friendlyError: scary → generic, authored → passthrough.
  ok("scary provider error → generic", friendlyError(new Error("AI gateway 529 overloaded")) === "Something hiccuped on our side — please try again in a moment.");
  ok("authored message passes through", friendlyError(new Error("This presentation has no slides to convert.")) === "This presentation has no slides to convert.");
  ok("RateLimitError message passes through", friendlyError(new RateLimitError(5000)).includes("going a bit fast"));

  console.log(`\n✅ ${pass} reliability checks passed.`);
}

main().then(() => process.exit(0)).catch((e) => { console.error("\n❌", e.message); process.exit(1); });

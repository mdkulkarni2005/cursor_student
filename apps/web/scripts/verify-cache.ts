/**
 * Structural verification of the prompt cache-control layer.
 *
 * WHAT THIS PROVES: the cache breakpoint (providerOptions.anthropic.cacheControl) is attached to
 * the system block when caching is enabled, omitted when disabled/stubbed, and that the
 * cache-token reader parses providerMetadata correctly.
 *
 * WHAT THIS DOES NOT PROVE: that caching actually engages on the gateway. That can ONLY be seen
 * from real cache-token counts on a live call (watch the `[ai-cache] …` server log on the 2nd
 * turn of the assistant or assignment tutor after adding credits). See docs/MANUAL_TESTING.md.
 */
import assert from "node:assert";
import { cachedSystem, cacheEnabled, readCacheUsage, ANTHROPIC_CACHE_CONTROL } from "@studentos/ai";

function expect(name: string, cond: boolean) {
  assert(cond, `FAILED: ${name}`);
  console.log(`  ✓ ${name}`);
}

console.log("Prompt cache-control layer — structural checks\n");

// 1. Enabled for real calls.
delete process.env.AI_DRIVER;
delete process.env.AI_CACHE;
expect("cacheEnabled() true for real (gateway) calls", cacheEnabled() === true);

const real = cachedSystem("SYSTEM PROMPT") as Record<string, unknown>;
expect("system message has role=system", real.role === "system");
expect("system breakpoint = anthropic ephemeral cacheControl",
  JSON.stringify(real.providerOptions) === JSON.stringify(ANTHROPIC_CACHE_CONTROL));
expect("breakpoint type is 'ephemeral'", ANTHROPIC_CACHE_CONTROL.anthropic.cacheControl.type === "ephemeral");

// 2. Stub never caches (never hits the gateway).
process.env.AI_DRIVER = "stub";
expect("cacheEnabled() false under stub", cacheEnabled() === false);
const stubbed = cachedSystem("SYSTEM PROMPT") as Record<string, unknown>;
expect("no providerOptions under stub", stubbed.providerOptions === undefined);

// 3. Explicit kill switch.
delete process.env.AI_DRIVER;
process.env.AI_CACHE = "off";
expect("cacheEnabled() false with AI_CACHE=off", cacheEnabled() === false);
expect("no providerOptions with AI_CACHE=off", (cachedSystem("x") as Record<string, unknown>).providerOptions === undefined);
delete process.env.AI_CACHE;

// 4. Cache-token reader (the real-proof path) parses both shapes; ignores empty/Gemini.
expect("readCacheUsage null when no anthropic metadata", readCacheUsage(undefined) === null);
expect("readCacheUsage null when zero tokens",
  readCacheUsage({ anthropic: { cacheReadInputTokens: 0 } }) === null);
const camel = readCacheUsage({ anthropic: { cacheCreationInputTokens: 1200, cacheReadInputTokens: 0 } });
expect("reads camelCase cacheCreationInputTokens", camel?.write === 1200);
const snake = readCacheUsage({ anthropic: { cache_read_input_tokens: 1180 } });
expect("reads snake_case cache_read_input_tokens", snake?.read === 1180);

console.log("\n✅ Structural checks passed. (Real cache behavior is gateway-only — see the [ai-cache] log on turn 2.)");

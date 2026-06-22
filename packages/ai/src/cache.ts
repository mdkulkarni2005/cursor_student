
import type { ModelMessage } from "ai";

/** Anthropic ephemeral cache breakpoint. Attach to the LAST block of a stable prefix. */
export const ANTHROPIC_CACHE_CONTROL = {
  anthropic: { cacheControl: { type: "ephemeral" as const } },
} as const;

/**
 * Caching is on by default for real (gateway) calls. The stub never caches (it never hits the
 * gateway), and `AI_CACHE=off` is an explicit kill switch for debugging cost comparisons.
 */
export function cacheEnabled(): boolean {
  return process.env.AI_DRIVER !== "stub" && process.env.AI_CACHE !== "off";
}

/**
 * Turn a system prompt string into a system message carrying a cache breakpoint (when caching is
 * enabled). Use this as the FIRST message of the two multi-turn flows; the history/new turn
 * follow uncached. On the Gemini fallback the `anthropic` providerOptions is simply ignored.
 */
export function cachedSystem(system: string): ModelMessage {
  if (!cacheEnabled()) {
    return { role: "system", content: system };
  }
  return { role: "system", content: system, providerOptions: ANTHROPIC_CACHE_CONTROL };
}

/** Cache-token counts returned by the model — the only real proof caching engaged. */
export type CacheUsage = { write: number; read: number };

/**
 * Extract cache-token counts from a call's providerMetadata. Returns null when the provider
 * reported none (e.g. Gemini fallback, prefix under the min size, or caching disabled). Reads
 * both camelCase (AI SDK) and snake_case (raw Anthropic) defensively, since the gateway may
 * surface either shape.
 */
export function readCacheUsage(providerMetadata?: unknown): CacheUsage | null {
  const meta = providerMetadata as Record<string, Record<string, unknown>> | undefined;
  const a = meta?.anthropic;
  if (!a) return null;
  const num = (...keys: string[]): number => {
    for (const k of keys) {
      const v = a[k];
      if (typeof v === "number" && v > 0) return v;
    }
    return 0;
  };
  const write = num("cacheCreationInputTokens", "cache_creation_input_tokens");
  const read = num("cacheReadInputTokens", "cache_read_input_tokens");
  if (!write && !read) return null;
  return { write, read };
}

/**
 * Log the cache-token counts for a call (no-op when none reported). This is the line to watch in
 * the server logs after adding credits to confirm the cache is live: a non-zero `read` on the
 * SECOND turn of a flow means caching is working through the gateway.
 */
export function logCacheUsage(label: string, providerMetadata?: unknown): CacheUsage | null {
  const u = readCacheUsage(providerMetadata);
  if (u) console.log(`[ai-cache] ${label}: cache write=${u.write} read=${u.read} tokens`);
  return u;
}

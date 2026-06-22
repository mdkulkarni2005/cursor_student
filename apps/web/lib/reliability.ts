/**
 * App-side reliability: turn any failure into a calm, user-safe message (never a raw stack or
 * provider error), and an in-memory per-user rate limiter so nobody can loop our paid endpoints.
 * (Server-side state — only ever called from server actions / route handlers.)
 *
 * NOTE: the limiter is per-process (in-memory) — fine for now, but move to a shared store
 * (Neon/Upstash) before a real public launch, since serverless runs many instances.
 */

export class RateLimitError extends Error {
  constructor(public readonly retryAfterMs: number) {
    super("You're going a bit fast — give it a few seconds and try again.");
    this.name = "RateLimitError";
  }
}

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

/**
 * Fixed-window limiter. Throws `RateLimitError` when a user exceeds `limit` calls to `action`
 * within `windowMs`. Call at the ENTRY of a user-initiated action — never around internal retries.
 */
export function rateLimit(userId: string, action: string, limit = 20, windowMs = 60_000): void {
  const key = `${userId}:${action}`;
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  if (b.count >= limit) throw new RateLimitError(b.resetAt - now);
  b.count++;
}

// Errors that would scare/confuse a user (provider/infra/parse internals) → genericize.
const SCARY =
  /gateway|anthropic|gemini|openai|provider|fetch failed|network|socket|timeout|timed out|econnreset|etimedout|enotfound|\bjson\b|schema|zod|unexpected token|cannot read|undefined|null\b|status\s?\d{3}|\b5\d{2}\b|429|529|overloaded|stack|piston/i;

/**
 * Map any error to a user-safe string. Errors WE authored (quota hit, "no slides to convert",
 * template hints, rate-limit) are already friendly and pass through; scary provider/infra errors
 * become a calm generic line.
 */
export function friendlyError(err: unknown): string {
  if (err instanceof RateLimitError) return err.message;
  const msg = err instanceof Error ? err.message : String(err);
  if (!msg || SCARY.test(msg)) return "Something hiccuped on our side — please try again in a moment.";
  return msg;
}

/**
 * App-side reliability: turn any failure into a calm, user-safe message (never a raw stack or
 * provider error), and a per-user rate limiter so nobody can loop our paid endpoints — including
 * a user who copies our own frontend's request and replays it in a script.
 *
 * The limiter is backed by Upstash Redis (shared across every instance — required once you run
 * more than one process, since an in-memory counter is trivially bypassed by hitting a different
 * instance). If UPSTASH_REDIS_REST_URL/TOKEN aren't set (local dev with no Upstash account yet),
 * it falls back to an in-memory limiter — same pattern as AI_DRIVER=stub elsewhere in this repo.
 */
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export class RateLimitError extends Error {
  constructor(public readonly retryAfterMs: number) {
    super("You're going a bit fast — give it a few seconds and try again.");
    this.name = "RateLimitError";
  }
}

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN })
    : null;

if (!redis) {
  console.warn(
    "[reliability] UPSTASH_REDIS_REST_URL/TOKEN not set — rate limiting is falling back to an " +
      "in-memory, per-process limiter. Fine for local dev; NOT safe once more than one instance runs.",
  );
}

// One Ratelimit instance per (limit, windowMs) pair, cached so we don't recreate it on every call.
const limiters = new Map<string, Ratelimit>();
function limiterFor(limit: number, windowMs: number): Ratelimit {
  const key = `${limit}:${windowMs}`;
  let rl = limiters.get(key);
  if (!rl) {
    rl = new Ratelimit({
      redis: redis!,
      limiter: Ratelimit.slidingWindow(limit, `${windowMs} ms`),
      prefix: "krackit:ratelimit",
    });
    limiters.set(key, rl);
  }
  return rl;
}

// In-memory fallback — only used when Redis isn't configured (see warning above).
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();
function rateLimitInMemory(userId: string, action: string, limit: number, windowMs: number): void {
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

/**
 * Sliding-window limiter, shared across every app instance via Redis. Throws `RateLimitError`
 * when a user exceeds `limit` calls to `action` within `windowMs`. Call at the ENTRY of a
 * user-initiated action — never around internal retries.
 */
export async function rateLimit(userId: string, action: string, limit = 20, windowMs = 60_000): Promise<void> {
  if (!redis) return rateLimitInMemory(userId, action, limit, windowMs);

  const { success, reset } = await limiterFor(limit, windowMs).limit(`${userId}:${action}`);
  if (!success) throw new RateLimitError(Math.max(0, reset - Date.now()));
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

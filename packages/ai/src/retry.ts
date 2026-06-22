/**
 * Bounded transient-retry for AI calls. Wraps a call so a transient blip (provider overloaded /
 * 429 / 5xx / network / timeout) is retried a couple of times with backoff, while a PERMANENT error
 * (schema/validation/4xx) fails fast — no point retrying a bad request, and never an unbounded loop.
 *
 * Applied at the orchestration boundary (where we call into the AI layer), NOT inside every module.
 * The looped Claude→Gemini paths already fall back; this adds resilience when BOTH blip transiently,
 * and gives the single-model `streamAssistant` path a real retry it didn't have.
 */

/** Is this error worth retrying (transient infra), vs a permanent request problem? */
export function isTransientError(err: unknown): boolean {
  if (!err) return false;
  const e = err as { isRetryable?: boolean; statusCode?: number; status?: number; response?: { status?: number }; message?: string };

  // The AI SDK tags many provider errors directly.
  if (e.isRetryable === true) return true;
  if (e.isRetryable === false) return false;

  const status = e.statusCode ?? e.status ?? e.response?.status;
  if (typeof status === "number") {
    if (status === 408 || status === 425 || status === 429) return true; // timeout / too-early / rate-limit
    if (status >= 500) return true; // 5xx server/overloaded
    if (status >= 400) return false; // other 4xx = permanent (bad request, auth, not found)
  }

  const msg = String(e.message ?? err).toLowerCase();
  return /overloaded|rate.?limit|too many requests|timeout|timed out|econnreset|etimedout|enotfound|fetch failed|network|socket hang|connection|temporarily|503|502|529/.test(msg);
}

export type RetryOptions = { tries?: number; baseDelayMs?: number; label?: string };

/** Run `fn`, retrying transient failures up to `tries` times (default 3) with jittered backoff. */
export async function withAiRetry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const tries = Math.max(1, opts.tries ?? 3);
  const base = opts.baseDelayMs ?? 350;
  let lastError: unknown;

  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      // Last attempt, or a permanent error → give up immediately.
      if (attempt === tries || !isTransientError(err)) throw err;
      const delay = base * 2 ** (attempt - 1) + Math.random() * 150;
      if (opts.label) console.warn(`[ai-retry] ${opts.label}: transient failure (attempt ${attempt}/${tries}), retrying in ${Math.round(delay)}ms`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}

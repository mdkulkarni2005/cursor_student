/**
 * Rough $/1M-token pricing for models we route through the Vercel AI Gateway, used ONLY to
 * attribute AI spend to a user/document for the admin cost dashboard. The Gateway's own
 * `/v1/credits` balance is the source of truth for total platform spend — this table exists
 * because the Gateway has no concept of "which of our users caused this call."
 */
const MODEL_PRICING_USD_PER_M: Record<string, { input: number; output: number }> = {
  "anthropic/claude-sonnet-4.6": { input: 3, output: 15 },
  "google/gemini-3.5-flash": { input: 0.15, output: 0.6 },
  stub: { input: 0, output: 0 },
};

/** Flat per-image cost estimate (image models aren't token-priced). */
const IMAGE_COST_CENTS = 4;

export type TokenUsage = { inputTokens?: number; outputTokens?: number };

/** Cents attributable to one generateObject/generateText call, given its model + token usage. */
export function costCentsFromUsage(model: string, usage: TokenUsage | undefined): number {
  const pricing = MODEL_PRICING_USD_PER_M[model] ?? MODEL_PRICING_USD_PER_M[Object.keys(MODEL_PRICING_USD_PER_M).find((m) => model.startsWith(m.split("/")[0])) ?? ""] ?? { input: 3, output: 15 };
  const input = usage?.inputTokens ?? 0;
  const output = usage?.outputTokens ?? 0;
  const dollars = (input / 1_000_000) * pricing.input + (output / 1_000_000) * pricing.output;
  return Math.round(dollars * 100);
}

export function imageCostCents(): number {
  return process.env.AI_DRIVER === "stub" ? 0 : IMAGE_COST_CENTS;
}

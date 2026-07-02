/**
 * Static DSA problem catalog — lives in code (no table, no seed), referenced by slug. Split by
 * difficulty across easy.ts/medium.ts/hard.ts to keep individual files scannable as the catalog
 * grows. New problems must be authored via scripts/dsa-verify (never hand-guessed `expected`
 * values — AI-generated problems have hallucinated wrong outputs before, which is poison for
 * practice).
 */
import { CATALOG_EASY } from "./easy";
import { CATALOG_MEDIUM } from "./medium";
import { CATALOG_HARD } from "./hard";

export type { DsaDifficulty, DsaProblem } from "./types";

export const DSA_PROBLEMS: import("./types").DsaProblem[] = [...CATALOG_EASY, ...CATALOG_MEDIUM, ...CATALOG_HARD];

export const DSA_BY_SLUG: Record<string, import("./types").DsaProblem> = Object.fromEntries(
  DSA_PROBLEMS.map((p) => [p.slug, p])
);

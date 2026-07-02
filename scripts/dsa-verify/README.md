# DSA problem authoring pipeline

Adds new DSA problems the safe way: `expected` values are computed by running a real reference
solution through the execution engine, never hand-typed. AI-generated problems have hallucinated
wrong expected outputs before — a wrong `expected` silently fails a correct student solution.

## Adding a problem

1. Pick a `slug` (kebab-case, matches the eventual catalog entry) and a `difficulty`.
2. Stick to problems expressible as a single `solve(...)` function over plain JSON args/return —
   no linked-list nodes, no stateful op-sequence classes (that's the deferred `reverse-linked-list`
   / `lru-cache` case). This keeps every new problem gradeable in python/js/ts.
3. Write `references/<slug>.py` — a correct Python solution defining `def solve(...)`.
4. Write `cases/<slug>.json`:
   ```json
   { "tests": [
     { "args": [[2, 7, 11, 15], 9], "sample": true },
     { "args": [[3, 2, 4], 6], "sample": true },
     { "args": [[3, 3], 6] }
   ] }
   ```
   Mark 2–3 tests `"sample": true` — these become the visible tests the Run button checks; the
   rest are hidden, Submit-only. Sample test args should match whatever `examples` you'll write in
   the catalog entry, so what's displayed and what Run checks never drift. Include real edge cases
   in the hidden tests (empty input, duplicates, negative numbers, single element, etc).
5. Run the pipeline (requires `PISTON_URL` pointed at a reachable Piston, e.g. local docker
   compose — `pnpm run dev:services`):
   ```
   pnpm dsa:verify <slug>
   ```
   It runs your reference solution against every test case (twice each, to catch
   nondeterminism), and prints a ready-to-paste `tests: [...]` array with real computed `expected`
   values.
6. Only if it prints `✅` for your slug: paste the generated `tests` array into
   `apps/web/lib/dsa/judging/<difficulty>.ts`, alongside a matching entry with `params`, `tsSig`,
   and the correct `compare` mode:
   - `"exact"` — most problems (order-sensitive, deterministic output).
   - `"unordered"` — output is a list/set whose element order doesn't matter (e.g. grouping
     problems). Picking `"exact"` here silently fails correct solutions — this is the most common
     authoring mistake.
   - `"float-eps"` — output is a float; compares within `1e-6`.
7. Add the matching entry to `apps/web/lib/dsa/catalog/<difficulty>.ts` — `slug`, `title`,
   `difficulty`, `tags` (drawn only from `apps/web/lib/dsa/tags.ts`'s `DSA_TAGS` — free-typing new
   tag strings fragments the browse-page filter), `prompt`, and `examples` that match your sample
   tests.
8. Never commit `references/*.py` content into anything under `apps/web` — these are answer keys
   and must never reach the client bundle. They live only in this `scripts/dsa-verify/` directory.

## Verifying everything

```
pnpm dsa:verify
```

Runs every reference solution under `references/` against its `cases/*.json`. Do this before any
batch of new problems is merged.

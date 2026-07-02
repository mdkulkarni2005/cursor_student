import type { Language } from "@studentos/execution";

export type CompareMode = "exact" | "unordered" | "float-eps";

export type ProblemJudging = {
  /** Parameter names for `solve(...)`, in order (also drives the starter stub). */
  params: string[];
  /** Full TypeScript signature for the starter. */
  tsSig: string;
  compare: CompareMode;
  /** `sample: true` tests are visible to the student and used by Run; the rest are Submit-only. */
  tests: { args: unknown[]; expected: unknown; sample?: boolean }[];
};

export type { Language };

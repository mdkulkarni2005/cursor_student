/**
 * DSA judging metadata — the centralized, version-controlled test cases (LeetCode-style: few but
 * powerful, edge cases included). Students implement a single `solve(...)` entry point; the
 * execution engine feeds each test's `args` as JSON and compares the returned value.
 *
 * Covers the 10 structurally-clean problems (plain-JSON args/return). reverse-linked-list and
 * lru-cache need a node type / a design-class op-sequence — deferred to a later step and stay
 * review-only until then (NOT auto-graded, never a fake pass).
 *
 * Expected values are hand-verified — a wrong expected is a false-negative that punishes a correct
 * solution, the exact failure this feature must avoid.
 */
import type { Language } from "@studentos/execution";

export type CompareMode = "exact" | "unordered" | "float-eps";

export type ProblemJudging = {
  /** Parameter names for `solve(...)`, in order (also drives the starter stub). */
  params: string[];
  /** Full TypeScript signature for the starter. */
  tsSig: string;
  compare: CompareMode;
  tests: { args: unknown[]; expected: unknown }[];
};

export const JUDGING: Record<string, ProblemJudging> = {
  "two-sum": {
    params: ["nums", "target"],
    tsSig: "function solve(nums: number[], target: number): number[]",
    compare: "exact",
    tests: [
      { args: [[2, 7, 11, 15], 9], expected: [0, 1] },
      { args: [[3, 2, 4], 6], expected: [1, 2] },
      { args: [[3, 3], 6], expected: [0, 1] },
      { args: [[-1, -2, -3, -4, -5], -8], expected: [2, 4] },
      { args: [[0, 4, 3, 0], 0], expected: [0, 3] },
    ],
  },
  "valid-parentheses": {
    params: ["s"],
    tsSig: "function solve(s: string): boolean",
    compare: "exact",
    tests: [
      { args: ["()"], expected: true },
      { args: ["()[]{}"], expected: true },
      { args: ["(]"], expected: false },
      { args: ["([)]"], expected: false },
      { args: ["{[]}"], expected: true },
      { args: [""], expected: true },
    ],
  },
  "binary-search": {
    params: ["nums", "target"],
    tsSig: "function solve(nums: number[], target: number): number",
    compare: "exact",
    tests: [
      { args: [[-1, 0, 3, 5, 9, 12], 9], expected: 4 },
      { args: [[-1, 0, 3, 5, 9, 12], 2], expected: -1 },
      { args: [[5], 5], expected: 0 },
      { args: [[5], -5], expected: -1 },
      { args: [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 7], expected: 6 },
    ],
  },
  "max-subarray": {
    params: ["nums"],
    tsSig: "function solve(nums: number[]): number",
    compare: "exact",
    tests: [
      { args: [[-2, 1, -3, 4, -1, 2, 1, -5, 4]], expected: 6 },
      { args: [[1]], expected: 1 },
      { args: [[5, 4, -1, 7, 8]], expected: 23 },
      { args: [[-1]], expected: -1 },
      { args: [[-2, -1]], expected: -1 },
    ],
  },
  "merge-intervals": {
    params: ["intervals"],
    tsSig: "function solve(intervals: number[][]): number[][]",
    compare: "unordered",
    tests: [
      { args: [[[1, 3], [2, 6], [8, 10], [15, 18]]], expected: [[1, 6], [8, 10], [15, 18]] },
      { args: [[[1, 4], [4, 5]]], expected: [[1, 5]] },
      { args: [[[1, 4], [2, 3]]], expected: [[1, 4]] },
      { args: [[[1, 4]]], expected: [[1, 4]] },
      { args: [[[2, 3], [4, 5], [6, 7], [1, 10]]], expected: [[1, 10]] },
    ],
  },
  "group-anagrams": {
    params: ["strs"],
    tsSig: "function solve(strs: string[]): string[][]",
    compare: "unordered",
    tests: [
      { args: [["eat", "tea", "tan", "ate", "nat", "bat"]], expected: [["bat"], ["nat", "tan"], ["ate", "eat", "tea"]] },
      { args: [[""]], expected: [[""]] },
      { args: [["a"]], expected: [["a"]] },
      { args: [["abc", "bca", "cab", "xyz"]], expected: [["abc", "bca", "cab"], ["xyz"]] },
    ],
  },
  "number-of-islands": {
    params: ["grid"],
    tsSig: "function solve(grid: string[][]): number",
    compare: "exact",
    tests: [
      { args: [[["1", "1", "0"], ["1", "0", "0"], ["0", "0", "1"]]], expected: 2 },
      { args: [[["1", "1", "1"], ["0", "1", "0"], ["1", "1", "1"]]], expected: 1 },
      { args: [[["0"]]], expected: 0 },
      { args: [[["1"]]], expected: 1 },
      { args: [[["1", "0", "1", "0", "1"]]], expected: 3 },
    ],
  },
  "course-schedule": {
    params: ["numCourses", "prerequisites"],
    tsSig: "function solve(numCourses: number, prerequisites: number[][]): boolean",
    compare: "exact",
    tests: [
      { args: [2, [[1, 0]]], expected: true },
      { args: [2, [[1, 0], [0, 1]]], expected: false },
      { args: [1, []], expected: true },
      { args: [3, [[0, 1], [1, 2]]], expected: true },
      { args: [3, [[0, 1], [1, 2], [2, 0]]], expected: false },
    ],
  },
  "trapping-rain-water": {
    params: ["height"],
    tsSig: "function solve(height: number[]): number",
    compare: "exact",
    tests: [
      { args: [[0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]], expected: 6 },
      { args: [[4, 2, 0, 3, 2, 5]], expected: 9 },
      { args: [[]], expected: 0 },
      { args: [[1, 1, 1]], expected: 0 },
      { args: [[5, 4, 1, 2]], expected: 1 },
    ],
  },
  "median-two-sorted": {
    params: ["nums1", "nums2"],
    tsSig: "function solve(nums1: number[], nums2: number[]): number",
    compare: "float-eps",
    tests: [
      { args: [[1, 3], [2]], expected: 2.0 },
      { args: [[1, 2], [3, 4]], expected: 2.5 },
      { args: [[], [1]], expected: 1.0 },
      { args: [[2], []], expected: 2.0 },
      { args: [[1, 3], [2, 7]], expected: 2.5 },
    ],
  },
};

/** Problems with auto-grading wired (the rest stay review-only for now). */
export function isGraded(slug: string): boolean {
  return slug in JUDGING;
}

/** Per-language starter stub the editor pre-fills. java/cpp land in the next step. */
export function starterFor(slug: string, language: Language): string | undefined {
  const j = JUDGING[slug];
  if (!j) return undefined;
  const args = j.params.join(", ");
  switch (language) {
    case "python":
      return `def solve(${args}):\n    # Write your solution here\n    `;
    case "javascript":
      return `function solve(${args}) {\n  // Write your solution here\n}`;
    case "typescript":
      return `${j.tsSig} {\n  // Write your solution here\n}`;
    default:
      return undefined;
  }
}

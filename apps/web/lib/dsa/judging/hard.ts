import type { ProblemJudging } from "./types";

export const JUDGING_HARD: Record<string, ProblemJudging> = {
  "trapping-rain-water": {
    params: ["height"],
    tsSig: "function solve(height: number[]): number",
    compare: "exact",
    tests: [
      { args: [[0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]], expected: 6, sample: true },
      { args: [[4, 2, 0, 3, 2, 5]], expected: 9, sample: true },
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
      { args: [[1, 3], [2]], expected: 2.0, sample: true },
      { args: [[1, 2], [3, 4]], expected: 2.5, sample: true },
      { args: [[], [1]], expected: 1.0 },
      { args: [[2], []], expected: 2.0 },
      { args: [[1, 3], [2, 7]], expected: 2.5 },
    ],
  },
  "word-break": {
    params: ["s", "wordDict"],
    tsSig: "function solve(s: string, wordDict: string[]): boolean",
    compare: "exact",
    tests: [
      { args: ["leetcode", ["leet", "code"]], expected: true, sample: true },
      { args: ["applepenapple", ["apple", "pen"]], expected: true, sample: true },
      { args: ["catsandog", ["cats", "dog", "sand", "and", "cat"]], expected: false },
      { args: ["", ["a"]], expected: true },
      { args: ["a", ["b"]], expected: false },
    ],
  },
};

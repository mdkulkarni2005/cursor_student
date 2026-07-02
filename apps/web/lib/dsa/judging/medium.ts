import type { ProblemJudging } from "./types";

export const JUDGING_MEDIUM: Record<string, ProblemJudging> = {
  "max-subarray": {
    params: ["nums"],
    tsSig: "function solve(nums: number[]): number",
    compare: "exact",
    tests: [
      { args: [[-2, 1, -3, 4, -1, 2, 1, -5, 4]], expected: 6, sample: true },
      { args: [[1]], expected: 1, sample: true },
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
      { args: [[[1, 3], [2, 6], [8, 10], [15, 18]]], expected: [[1, 6], [8, 10], [15, 18]], sample: true },
      { args: [[[1, 4], [4, 5]]], expected: [[1, 5]], sample: true },
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
      { args: [["eat", "tea", "tan", "ate", "nat", "bat"]], expected: [["bat"], ["nat", "tan"], ["ate", "eat", "tea"]], sample: true },
      { args: [[""]], expected: [[""]], sample: true },
      { args: [["a"]], expected: [["a"]] },
      { args: [["abc", "bca", "cab", "xyz"]], expected: [["abc", "bca", "cab"], ["xyz"]] },
    ],
  },
  "number-of-islands": {
    params: ["grid"],
    tsSig: "function solve(grid: string[][]): number",
    compare: "exact",
    tests: [
      { args: [[["1", "1", "0"], ["1", "0", "0"], ["0", "0", "1"]]], expected: 2, sample: true },
      { args: [[["1", "1", "1"], ["0", "1", "0"], ["1", "1", "1"]]], expected: 1, sample: true },
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
      { args: [2, [[1, 0]]], expected: true, sample: true },
      { args: [2, [[1, 0], [0, 1]]], expected: false, sample: true },
      { args: [1, []], expected: true },
      { args: [3, [[0, 1], [1, 2]]], expected: true },
      { args: [3, [[0, 1], [1, 2], [2, 0]]], expected: false },
    ],
  },
  "longest-unique-substring": {
    params: ["s"],
    tsSig: "function solve(s: string): number",
    compare: "exact",
    tests: [
      { args: ["abcabcbb"], expected: 3, sample: true },
      { args: ["bbbbb"], expected: 1, sample: true },
      { args: ["pwwkew"], expected: 3 },
      { args: [""], expected: 0 },
      { args: ["au"], expected: 2 },
    ],
  },
  "product-except-self": {
    params: ["nums"],
    tsSig: "function solve(nums: number[]): number[]",
    compare: "exact",
    tests: [
      { args: [[1, 2, 3, 4]], expected: [24, 12, 8, 6], sample: true },
      { args: [[-1, 1, 0, -3, 3]], expected: [0, 0, 9, 0, 0], sample: true },
      { args: [[2, 3]], expected: [3, 2] },
      { args: [[1, 1, 1, 1]], expected: [1, 1, 1, 1] },
      { args: [[5]], expected: [1] },
    ],
  },
};

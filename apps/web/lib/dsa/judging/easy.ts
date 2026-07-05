import type { ProblemJudging } from "./types";

export const JUDGING_EASY: Record<string, ProblemJudging> = {
  "two-sum": {
    params: ["nums", "target"],
    tsSig: "function solve(nums: number[], target: number): number[]",
    compare: "exact",
    tests: [
      { args: [[2, 7, 11, 15], 9], expected: [0, 1], sample: true },
      { args: [[3, 2, 4], 6], expected: [1, 2], sample: true },
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
      { args: ["()[]{}"], expected: true, sample: true },
      { args: ["(]"], expected: false, sample: true },
      { args: ["()"], expected: true },
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
      { args: [[-1, 0, 3, 5, 9, 12], 9], expected: 4, sample: true },
      { args: [[-1, 0, 3, 5, 9, 12], 2], expected: -1, sample: true },
      { args: [[5], 5], expected: 0 },
      { args: [[5], -5], expected: -1 },
      { args: [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 7], expected: 6 },
    ],
  },
  "contains-duplicate": {
    params: ["nums"],
    tsSig: "function solve(nums: number[]): boolean",
    compare: "exact",
    tests: [
      { args: [[1, 2, 3, 1]], expected: true, sample: true },
      { args: [[1, 2, 3, 4]], expected: false, sample: true },
      { args: [[1, 1, 1, 3, 3, 4, 3, 2, 4, 2]], expected: true },
      { args: [[]], expected: false },
      { args: [[7]], expected: false },
    ],
  },
  "climbing-stairs": {
    params: ["n"],
    tsSig: "function solve(n: number): number",
    compare: "exact",
    tests: [
      { args: [2], expected: 2, sample: true },
      { args: [3], expected: 3, sample: true },
      { args: [1], expected: 1 },
      { args: [5], expected: 8 },
      { args: [10], expected: 89 },
    ],
  },
  "fizzbuzz": {
    params: ["n"],
    tsSig: "function solve(n: number): string[]",
    compare: "exact",
    tests: [
      { args: [5], expected: ["1", "2", "Fizz", "4", "Buzz"], sample: true },
      { args: [1], expected: ["1"], sample: true },
      { args: [15], expected: ["1", "2", "Fizz", "4", "Buzz", "Fizz", "7", "8", "Fizz", "Buzz", "11", "Fizz", "13", "14", "FizzBuzz"] },
    ],
  },
  "reverse-string": {
    params: ["s"],
    tsSig: "function solve(s: string): string",
    compare: "exact",
    tests: [
      { args: ["hello"], expected: "olleh", sample: true },
      { args: ["a"], expected: "a", sample: true },
      { args: [""], expected: "" },
      { args: ["racecar"], expected: "racecar" },
    ],
  },
  "palindrome-check": {
    params: ["s"],
    tsSig: "function solve(s: string): boolean",
    compare: "exact",
    tests: [
      { args: ["racecar"], expected: true, sample: true },
      { args: ["hello"], expected: false, sample: true },
      { args: ["A man a plan a canal Panama"], expected: true },
      { args: [""], expected: true },
    ],
  },
  "factorial": {
    params: ["n"],
    tsSig: "function solve(n: number): number",
    compare: "exact",
    tests: [
      { args: [5], expected: 120, sample: true },
      { args: [0], expected: 1, sample: true },
      { args: [1], expected: 1 },
      { args: [10], expected: 3628800 },
    ],
  },
  "sum-of-array": {
    params: ["nums"],
    tsSig: "function solve(nums: number[]): number",
    compare: "exact",
    tests: [
      { args: [[1, 2, 3, 4, 5]], expected: 15, sample: true },
      { args: [[]], expected: 0, sample: true },
      { args: [[-1, -2, 3]], expected: 0 },
      { args: [[100]], expected: 100 },
    ],
  },
  "find-maximum": {
    params: ["nums"],
    tsSig: "function solve(nums: number[]): number",
    compare: "exact",
    tests: [
      { args: [[3, 1, 4, 1, 5, 9, 2, 6]], expected: 9, sample: true },
      { args: [[-5, -1, -10]], expected: -1, sample: true },
      { args: [[7]], expected: 7 },
    ],
  },
  "count-vowels": {
    params: ["s"],
    tsSig: "function solve(s: string): number",
    compare: "exact",
    tests: [
      { args: ["Programming"], expected: 3, sample: true },
      { args: ["xyz"], expected: 0, sample: true },
      { args: ["AEIOU"], expected: 5 },
      { args: [""], expected: 0 },
    ],
  },
  "is-prime": {
    params: ["n"],
    tsSig: "function solve(n: number): boolean",
    compare: "exact",
    tests: [
      { args: [7], expected: true, sample: true },
      { args: [15], expected: false, sample: true },
      { args: [1], expected: false },
      { args: [2], expected: true },
      { args: [97], expected: true },
    ],
  },
  "fibonacci-nth": {
    params: ["n"],
    tsSig: "function solve(n: number): number",
    compare: "exact",
    tests: [
      { args: [6], expected: 8, sample: true },
      { args: [10], expected: 55, sample: true },
      { args: [0], expected: 0 },
      { args: [1], expected: 1 },
    ],
  },
};

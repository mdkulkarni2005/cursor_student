import type { DsaProblem } from "./types";

export const CATALOG_EASY: DsaProblem[] = [
  {
    slug: "two-sum",
    title: "Two Sum",
    difficulty: "easy",
    tags: ["Array", "Hash Map"],
    prompt: "Given an array of integers `nums` and an integer `target`, return the indices of the two numbers that add up to `target`. Each input has exactly one solution; you may not use the same element twice.",
    examples: [{ input: "nums = [2,7,11,15], target = 9", output: "[0,1]", explanation: "nums[0] + nums[1] = 9" }],
  },
  {
    slug: "valid-parentheses",
    title: "Valid Parentheses",
    difficulty: "easy",
    tags: ["Stack", "String"],
    prompt: "Given a string `s` containing just '()[]{}', determine if the input string is valid — brackets must close in the correct order.",
    examples: [{ input: 's = "()[]{}"', output: "true" }, { input: 's = "(]"', output: "false" }],
  },
  {
    slug: "reverse-linked-list",
    title: "Reverse Linked List",
    difficulty: "easy",
    tags: ["Linked List", "Recursion"],
    prompt: "Given the head of a singly linked list, reverse the list and return the new head.",
    examples: [{ input: "head = [1,2,3,4,5]", output: "[5,4,3,2,1]" }],
  },
  {
    slug: "binary-search",
    title: "Binary Search",
    difficulty: "easy",
    tags: ["Binary Search", "Array"],
    prompt: "Given a sorted array `nums` and a `target`, return its index, or -1 if it doesn't exist. Must run in O(log n).",
    examples: [{ input: "nums = [-1,0,3,5,9,12], target = 9", output: "4" }],
  },
  {
    slug: "contains-duplicate",
    title: "Contains Duplicate",
    difficulty: "easy",
    tags: ["Array", "Hash Map"],
    prompt: "Given an integer array `nums`, return true if any value appears at least twice in the array, and false if every element is distinct.",
    examples: [
      { input: "nums = [1,2,3,1]", output: "true" },
      { input: "nums = [1,2,3,4]", output: "false" },
    ],
  },
  {
    slug: "climbing-stairs",
    title: "Climbing Stairs",
    difficulty: "easy",
    tags: ["Dynamic Programming", "Math"],
    prompt: "You're climbing a staircase of `n` steps. Each move you can climb 1 or 2 steps. Return the number of distinct ways to reach the top.",
    examples: [
      { input: "n = 2", output: "2", explanation: "1+1 or 2" },
      { input: "n = 3", output: "3", explanation: "1+1+1, 1+2, 2+1" },
    ],
  },
];

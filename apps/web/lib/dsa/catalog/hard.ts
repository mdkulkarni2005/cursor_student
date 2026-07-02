import type { DsaProblem } from "./types";

export const CATALOG_HARD: DsaProblem[] = [
  {
    slug: "trapping-rain-water",
    title: "Trapping Rain Water",
    difficulty: "hard",
    tags: ["Array", "Two Pointers", "Stack"],
    prompt: "Given `n` non-negative integers representing an elevation map (each bar width 1), compute how much water can be trapped after raining.",
    examples: [{ input: "height = [0,1,0,2,1,0,1,3,2,1,2,1]", output: "6" }],
  },
  {
    slug: "median-two-sorted",
    title: "Median of Two Sorted Arrays",
    difficulty: "hard",
    tags: ["Binary Search", "Array", "Divide and Conquer"],
    prompt: "Given two sorted arrays `nums1` and `nums2`, return the median of the combined sorted array. Aim for O(log(m+n)).",
    examples: [{ input: "nums1 = [1,3], nums2 = [2]", output: "2.0" }],
  },
  {
    slug: "word-break",
    title: "Word Break",
    difficulty: "hard",
    tags: ["Dynamic Programming", "String"],
    prompt: "Given a string `s` and a dictionary of strings `wordDict`, return true if `s` can be segmented into a space-separated sequence of one or more dictionary words (words may be reused).",
    examples: [
      { input: 's = "leetcode", wordDict = ["leet","code"]', output: "true" },
      { input: 's = "catsandog", wordDict = ["cats","dog","sand","and","cat"]', output: "false" },
    ],
  },
];

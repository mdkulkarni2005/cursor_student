/**
 * Static DSA problem catalog — lives in code (no table, no seed), referenced by slug.
 * AI-generated problems hallucinate wrong expected outputs, which is poison for practice,
 * so these are hand-picked classics with verified examples.
 */
export type DsaDifficulty = "easy" | "medium" | "hard";

export type DsaProblem = {
  slug: string;
  title: string;
  difficulty: DsaDifficulty;
  tags: string[];
  prompt: string;
  examples: { input: string; output: string; explanation?: string }[];
};

export const DSA_PROBLEMS: DsaProblem[] = [
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
    slug: "max-subarray",
    title: "Maximum Subarray",
    difficulty: "medium",
    tags: ["Array", "Dynamic Programming"],
    prompt: "Given an integer array `nums`, find the contiguous subarray with the largest sum and return that sum (Kadane's algorithm).",
    examples: [{ input: "nums = [-2,1,-3,4,-1,2,1,-5,4]", output: "6", explanation: "[4,-1,2,1] has sum 6" }],
  },
  {
    slug: "merge-intervals",
    title: "Merge Intervals",
    difficulty: "medium",
    tags: ["Array", "Sorting"],
    prompt: "Given an array of intervals `[start, end]`, merge all overlapping intervals and return the non-overlapping result.",
    examples: [{ input: "[[1,3],[2,6],[8,10],[15,18]]", output: "[[1,6],[8,10],[15,18]]" }],
  },
  {
    slug: "group-anagrams",
    title: "Group Anagrams",
    difficulty: "medium",
    tags: ["Hash Map", "String", "Sorting"],
    prompt: "Given an array of strings, group the anagrams together. Return the groups in any order.",
    examples: [{ input: '["eat","tea","tan","ate","nat","bat"]', output: '[["bat"],["nat","tan"],["ate","eat","tea"]]' }],
  },
  {
    slug: "lru-cache",
    title: "LRU Cache",
    difficulty: "medium",
    tags: ["Hash Map", "Linked List", "Design"],
    prompt: "Design a data structure for a Least Recently Used (LRU) cache with O(1) `get(key)` and `put(key, value)`. Evict the least recently used key when capacity is exceeded.",
    examples: [{ input: "capacity = 2; put(1,1); put(2,2); get(1); put(3,3); get(2)", output: "get(1)=1, get(2)=-1 (evicted)" }],
  },
  {
    slug: "number-of-islands",
    title: "Number of Islands",
    difficulty: "medium",
    tags: ["Graph", "BFS", "DFS"],
    prompt: "Given a 2D grid of '1' (land) and '0' (water), count the number of islands. An island is land connected 4-directionally.",
    examples: [{ input: '[["1","1","0"],["1","0","0"],["0","0","1"]]', output: "2" }],
  },
  {
    slug: "course-schedule",
    title: "Course Schedule",
    difficulty: "medium",
    tags: ["Graph", "Topological Sort"],
    prompt: "Given `numCourses` and prerequisite pairs `[a, b]` (take b before a), return true if you can finish all courses (i.e. the graph has no cycle).",
    examples: [{ input: "numCourses = 2, prerequisites = [[1,0]]", output: "true" }],
  },
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
];

export const DSA_BY_SLUG: Record<string, DsaProblem> = Object.fromEntries(DSA_PROBLEMS.map((p) => [p.slug, p]));

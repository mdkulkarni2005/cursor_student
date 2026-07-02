/**
 * Canonical tag vocabulary — every problem's `tags` must draw only from this list so browse-page
 * filtering doesn't fragment on spelling drift (e.g. "Hash Map" vs "HashMap").
 */
export const DSA_TAGS = [
  "Array",
  "Hash Map",
  "String",
  "Stack",
  "Two Pointers",
  "Sliding Window",
  "Binary Search",
  "Sorting",
  "Linked List",
  "Recursion",
  "Tree",
  "Graph",
  "BFS",
  "DFS",
  "Dynamic Programming",
  "Backtracking",
  "Greedy",
  "Heap",
  "Trie",
  "Bit Manipulation",
  "Math",
  "Design",
  "Topological Sort",
  "Union Find",
  "Divide and Conquer",
] as const;

export type DsaTag = (typeof DSA_TAGS)[number];

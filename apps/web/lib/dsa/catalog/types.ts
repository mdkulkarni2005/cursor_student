export type DsaDifficulty = "easy" | "medium" | "hard";

export type DsaProblem = {
  slug: string;
  title: string;
  difficulty: DsaDifficulty;
  tags: string[];
  prompt: string;
  examples: { input: string; output: string; explanation?: string }[];
};

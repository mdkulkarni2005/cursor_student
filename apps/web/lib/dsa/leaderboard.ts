import { prisma } from "@studentos/db";

export type LeaderRow = {
  userId: string;
  name: string;
  department: string | null;
  solved: number;
  /** V-Score: 100 points per distinct solved problem. */
  vScore: number;
  rank: number;
};

export type LeaderboardData = {
  top: LeaderRow[];
  me: LeaderRow | null;
  totalRanked: number;
};

/**
 * Real leaderboard built from DsaAttempt: distinct solved problems per user → V-Score.
 * Ranks every user with at least one solve; returns the top N plus the current user's
 * own row (even if they fall outside the top N).
 */
export async function getLeaderboard(currentUserId: string, topN = 20): Promise<LeaderboardData> {
  // Distinct (user, problem) pairs that were solved — dedupes repeat solves of the same problem.
  const solves = await prisma.dsaAttempt.findMany({
    where: { solved: true },
    select: { userId: true, problemSlug: true },
    distinct: ["userId", "problemSlug"],
  });

  const countByUser = new Map<string, number>();
  for (const s of solves) countByUser.set(s.userId, (countByUser.get(s.userId) ?? 0) + 1);

  const userIds = [...countByUser.keys()];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, department: true },
  });
  const userById = new Map(users.map((u) => [u.id, u]));

  const ranked: LeaderRow[] = userIds
    .map((id) => {
      const solved = countByUser.get(id) ?? 0;
      const u = userById.get(id);
      return {
        userId: id,
        name: u?.name ?? "Anonymous",
        department: u?.department ?? null,
        solved,
        vScore: solved * 100,
        rank: 0,
      };
    })
    .sort((a, b) => b.vScore - a.vScore || a.name.localeCompare(b.name))
    .map((row, i) => ({ ...row, rank: i + 1 }));

  const me = ranked.find((r) => r.userId === currentUserId) ?? null;

  return { top: ranked.slice(0, topN), me, totalRanked: ranked.length };
}

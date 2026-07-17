import { prisma } from "@studentos/db";
import { requireAdmin } from "@/lib/admin";
import { NotAuthorized } from "@/components/not-authorized";

export const metadata = { title: "DSA problems — Admin" };

export default async function DsaProblemsPage() {
  const guard = await requireAdmin();
  if (!guard.ok) return <NotAuthorized reason={guard.reason} />;

  // The problem catalog itself lives in code (apps/web/lib/dsa/catalog + scripts/dsa-verify),
  // authored/verified via `pnpm dsa:verify` — not a DB table. This page is engagement stats
  // over DsaAttempt, grouped by the slug the catalog also keys on.
  const [attempts, byProblem] = await Promise.all([
    prisma.dsaAttempt.count(),
    prisma.dsaAttempt.groupBy({
      by: ["problemSlug"],
      _count: { _all: true },
      orderBy: { _count: { problemSlug: "desc" } },
    }),
  ]);

  const solvedByProblem = await prisma.dsaAttempt.groupBy({
    by: ["problemSlug"],
    where: { solved: true },
    _count: { _all: true },
  });
  const solvedMap = Object.fromEntries(solvedByProblem.map((s) => [s.problemSlug, s._count._all]));

  const usersByProblem = await prisma.dsaAttempt.findMany({
    select: { problemSlug: true, userId: true },
    distinct: ["problemSlug", "userId"],
  });
  const distinctUserCount: Record<string, number> = {};
  for (const row of usersByProblem) {
    distinctUserCount[row.problemSlug] = (distinctUserCount[row.problemSlug] ?? 0) + 1;
  }

  return (
    <>
      <div className="mb-5">
        <h1 className="font-display text-[26px] font-bold text-ink">DSA problems</h1>
        <p className="mt-1 text-[15px] text-muted">
          {attempts} total attempts across {byProblem.length} problems. The catalog itself is code
          (<code className="rounded bg-surface px-1 py-0.5 text-[13.5px]">apps/web/lib/dsa/catalog</code>),
          authored via the <code className="rounded bg-surface px-1 py-0.5 text-[13.5px]">scripts/dsa-verify</code>{" "}
          pipeline — this page is engagement stats, not an editor. Add or change problems with a code PR.
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line bg-card">
        <table className="w-full text-left text-[14.5px]">
          <thead className="border-b border-line text-[13px] uppercase tracking-wide text-faint">
            <tr>
              {["Slug", "Attempts", "Solved attempts", "Distinct solvers", "Solve rate"].map((h) => (
                <th key={h} className="px-3 py-2.5 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {byProblem.map((p) => {
              const total = p._count._all;
              const solved = solvedMap[p.problemSlug] ?? 0;
              const rate = total === 0 ? 0 : Math.round((solved / total) * 100);
              return (
                <tr key={p.problemSlug} className="border-b border-line/60 last:border-0 hover:bg-surface">
                  <td className="px-3 py-2.5 font-medium text-ink">{p.problemSlug}</td>
                  <td className="px-3 py-2.5 text-soft">{total}</td>
                  <td className="px-3 py-2.5 text-soft">{solved}</td>
                  <td className="px-3 py-2.5 text-soft">{distinctUserCount[p.problemSlug] ?? 0}</td>
                  <td className="px-3 py-2.5 text-soft">{rate}%</td>
                </tr>
              );
            })}
            {byProblem.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-faint">
                  No DSA attempts yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

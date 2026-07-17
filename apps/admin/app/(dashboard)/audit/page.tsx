import { prisma } from "@studentos/db";
import { requireAdmin } from "@/lib/admin";
import { NotAuthorized } from "@/components/not-authorized";

export const metadata = { title: "Audit log — Admin" };

const PAGE_SIZE = 50;

function fmtDateTime(d: Date): string {
  return new Date(d).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const guard = await requireAdmin();
  if (!guard.ok) return <NotAuthorized reason={guard.reason} />;

  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const [total, entries] = await Promise.all([
    prisma.adminAuditLog.count(),
    prisma.adminAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <div className="mb-5">
        <h1 className="font-display text-[26px] font-bold text-ink">Audit log</h1>
        <p className="mt-1 text-[15px] text-muted">
          {total} recorded action{total === 1 ? "" : "s"} — append-only, every mutating admin action lands here.
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line bg-card">
        <table className="w-full text-left text-[14.5px]">
          <thead className="border-b border-line text-[13px] uppercase tracking-wide text-faint">
            <tr>
              {["When", "Actor", "Action", "Target", "Details"].map((h) => (
                <th key={h} className="px-3 py-2.5 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-b border-line/60 last:border-0 hover:bg-surface align-top">
                <td className="whitespace-nowrap px-3 py-2.5 text-faint">{fmtDateTime(e.createdAt)}</td>
                <td className="px-3 py-2.5 text-soft">{e.actorEmail}</td>
                <td className="px-3 py-2.5 font-medium text-ink">{e.action}</td>
                <td className="px-3 py-2.5 text-soft">
                  {e.targetType}:{e.targetId}
                </td>
                <td className="max-w-[360px] px-3 py-2.5">
                  {(e.before || e.after) && (
                    <pre className="whitespace-pre-wrap break-all text-[13px] text-faint">
                      {e.before ? `before: ${JSON.stringify(e.before)}\n` : ""}
                      {e.after ? `after: ${JSON.stringify(e.after)}` : ""}
                    </pre>
                  )}
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-faint">
                  No admin actions recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2 text-[14.5px]">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <a
              key={p}
              href={`/audit?page=${p}`}
              className={`rounded-lg px-3 py-1.5 ${p === page ? "bg-cyan text-on-accent" : "border border-line text-soft hover:bg-surface"}`}
            >
              {p}
            </a>
          ))}
        </div>
      )}
    </>
  );
}

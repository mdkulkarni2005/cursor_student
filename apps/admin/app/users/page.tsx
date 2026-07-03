import Link from "next/link";
import { Prisma, prisma } from "@studentos/db";
import { requireAdmin } from "@/lib/admin";
import { NotAuthorized } from "@/components/not-authorized";
import { AdminShell } from "@/components/shell";

export const metadata = { title: "Users — Admin" };

const PAGE_SIZE = 30;

function fmtDate(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" });
}

const PLAN_STYLE: Record<string, string> = {
  FREE: "text-muted bg-surface",
  PRO: "text-cyan bg-cyan/12",
  PREMIUM: "text-indigo bg-indigo/12",
};

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; plan?: string; coding?: string; suspended?: string }>;
}) {
  const guard = await requireAdmin();
  if (!guard.ok) return <NotAuthorized reason={guard.reason} />;

  const { q = "", page: pageParam, plan = "", coding = "", suspended = "" } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const query = q.trim();

  const filters: Prisma.UserWhereInput[] = [];
  if (query) {
    filters.push({
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
        { department: { contains: query, mode: "insensitive" } },
      ],
    });
  }
  if (plan === "FREE" || plan === "PRO" || plan === "PREMIUM") filters.push({ plan });
  if (coding === "yes") filters.push({ codingEnabled: true });
  if (coding === "no") filters.push({ codingEnabled: false });
  if (suspended === "yes") filters.push({ suspended: true });

  const where: Prisma.UserWhereInput = filters.length ? { AND: filters } : {};
  const hasFilters = Boolean(query || plan || coding || suspended);

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { _count: { select: { documents: true, dsaAttempts: true, usageEvents: true } } },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <AdminShell>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[24px] font-bold text-ink">Users</h1>
          <p className="mt-1 text-[13px] text-muted">
            {total} total{hasFilters ? " matching filters" : ""}
          </p>
        </div>
        <form className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="Search name, email, department…"
            className="w-[240px] rounded-lg border border-line bg-input px-3 py-2 text-[13px] text-ink placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-cyan/30"
          />
          <select
            name="plan"
            defaultValue={plan}
            className="rounded-lg border border-line bg-input px-2.5 py-2 text-[13px] text-ink focus:outline-none focus:ring-2 focus:ring-cyan/30"
          >
            <option value="">All plans</option>
            <option value="FREE">Free</option>
            <option value="PRO">Pro</option>
            <option value="PREMIUM">Premium</option>
          </select>
          <select
            name="coding"
            defaultValue={coding}
            className="rounded-lg border border-line bg-input px-2.5 py-2 text-[13px] text-ink focus:outline-none focus:ring-2 focus:ring-cyan/30"
          >
            <option value="">Coding: any</option>
            <option value="yes">Coding: on</option>
            <option value="no">Coding: off</option>
          </select>
          <select
            name="suspended"
            defaultValue={suspended}
            className="rounded-lg border border-line bg-input px-2.5 py-2 text-[13px] text-ink focus:outline-none focus:ring-2 focus:ring-cyan/30"
          >
            <option value="">All accounts</option>
            <option value="yes">Suspended only</option>
          </select>
          <button
            type="submit"
            className="rounded-lg bg-cyan px-3 py-2 text-[12.5px] font-semibold text-on-accent hover:opacity-90"
          >
            Filter
          </button>
          {hasFilters && (
            <Link href="/users" className="text-[12px] font-medium text-faint hover:text-soft">
              Clear
            </Link>
          )}
        </form>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line bg-card">
        <table className="w-full text-left text-[12.5px]">
          <thead className="border-b border-line text-[11px] uppercase tracking-wide text-faint">
            <tr>
              {["User", "Dept", "Plan", "Coding", "Docs", "Gens", "DSA", "Opens", "Last seen", "Joined"].map((h) => (
                <th key={h} className="px-3 py-2.5 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-line/60 last:border-0 hover:bg-surface">
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <Link href={`/users/${u.id}`} className="font-medium text-ink hover:text-cyan">
                      {u.name ?? "—"}
                    </Link>
                    {u.suspended && (
                      <span className="rounded-full bg-danger/12 px-1.5 py-0.5 text-[10px] font-semibold text-danger">
                        suspended
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-faint">{u.email}</p>
                </td>
                <td className="px-3 py-2.5 text-soft">{u.department ?? "—"}</td>
                <td className="px-3 py-2.5">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${PLAN_STYLE[u.plan]}`}>
                    {u.plan}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  {u.codingEnabled ? <span className="text-success">✓</span> : <span className="text-faint">—</span>}
                </td>
                <td className="px-3 py-2.5 text-soft">{u._count.documents}</td>
                <td className="px-3 py-2.5 text-soft">{u._count.usageEvents}</td>
                <td className="px-3 py-2.5 text-soft">{u._count.dsaAttempts}</td>
                <td className="px-3 py-2.5 text-soft">{u.appOpens}</td>
                <td className="px-3 py-2.5 text-faint">{fmtDate(u.lastSeenAt)}</td>
                <td className="px-3 py-2.5 text-faint">{fmtDate(u.createdAt)}</td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-faint">
                  No users match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2 text-[12.5px]">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/users?${new URLSearchParams({
                ...(query ? { q: query } : {}),
                ...(plan ? { plan } : {}),
                ...(coding ? { coding } : {}),
                ...(suspended ? { suspended } : {}),
                page: String(p),
              })}`}
              className={`rounded-lg px-3 py-1.5 ${p === page ? "bg-cyan text-on-accent" : "border border-line text-soft hover:bg-surface"}`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </AdminShell>
  );
}

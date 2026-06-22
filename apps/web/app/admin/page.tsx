import { prisma } from "@studentos/db";
import { requireAdmin } from "@/lib/admin";

export const metadata = { title: "Admin — StudentOS" };

function fmtDate(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" });
}

const PLAN_STYLE: Record<string, string> = {
  FREE: "text-muted bg-white/5", PRO: "text-cyan bg-cyan/12", PREMIUM: "text-indigo bg-indigo/12",
};

export default async function AdminPage() {
  await requireAdmin();

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { documents: true, dsaAttempts: true, usageEvents: true } } },
  });

  const totals = users.reduce(
    (a, u) => ({
      docs: a.docs + u._count.documents,
      gens: a.gens + u._count.usageEvents,
      dsa: a.dsa + u._count.dsaAttempts,
      paid: a.paid + (u.plan === "FREE" ? 0 : 1),
    }),
    { docs: 0, gens: 0, dsa: 0, paid: 0 },
  );

  const cards = [
    { label: "Users", value: users.length },
    { label: "Paid users", value: totals.paid },
    { label: "Documents", value: totals.docs },
    { label: "Generations (metered)", value: totals.gens },
    { label: "DSA attempts", value: totals.dsa },
  ];

  return (
    <div className="min-h-screen bg-canvas px-5 py-8">
      <div className="mx-auto max-w-[1100px]">
        <div className="mb-1 flex items-center gap-2">
          <h1 className="font-display text-[24px] font-bold text-ink">Admin</h1>
          <span className="rounded-full border border-cyan/25 bg-cyan/10 px-2.5 py-0.5 text-[11px] font-semibold text-cyan">role: admin</span>
        </div>
        <p className="mb-5 text-[13px] text-muted">Read-only overview. (Per-token AI cost tracking is a later addition.)</p>

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {cards.map((c) => (
            <div key={c.label} className="rounded-2xl border border-line bg-card p-4">
              <p className="font-display text-[26px] font-bold text-ink">{c.value}</p>
              <p className="text-[12px] text-faint">{c.label}</p>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto rounded-2xl border border-line bg-card">
          <table className="w-full text-left text-[12.5px]">
            <thead className="border-b border-line text-[11px] uppercase tracking-wide text-faint">
              <tr>
                {["User", "Dept", "Plan", "Coding", "Docs", "Gens", "DSA", "Opens", "Last seen", "Joined"].map((h) => (
                  <th key={h} className="px-3 py-2.5 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-line/60 last:border-0 hover:bg-white/[0.02]">
                  <td className="px-3 py-2.5">
                    <p className="font-medium text-ink">{u.name ?? "—"}</p>
                    <p className="text-[11px] text-faint">{u.email}</p>
                  </td>
                  <td className="px-3 py-2.5 text-soft">{u.department ?? "—"}</td>
                  <td className="px-3 py-2.5"><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${PLAN_STYLE[u.plan]}`}>{u.plan}</span></td>
                  <td className="px-3 py-2.5">{u.codingEnabled ? <span className="text-success">✓</span> : <span className="text-faint">—</span>}</td>
                  <td className="px-3 py-2.5 text-soft">{u._count.documents}</td>
                  <td className="px-3 py-2.5 text-soft">{u._count.usageEvents}</td>
                  <td className="px-3 py-2.5 text-soft">{u._count.dsaAttempts}</td>
                  <td className="px-3 py-2.5 text-soft">{u.appOpens}</td>
                  <td className="px-3 py-2.5 text-faint">{fmtDate(u.lastSeenAt)}</td>
                  <td className="px-3 py-2.5 text-faint">{fmtDate(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

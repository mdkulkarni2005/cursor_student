import Link from "next/link";
import { prisma } from "@studentos/db";
import { requireAdmin } from "@/lib/admin";
import { NotAuthorized } from "@/components/not-authorized";
import { AdminShell } from "@/components/shell";

export const metadata = { title: "Payments — Admin" };

function fmtDateTime(d: Date): string {
  return new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

const STATUS_STYLE: Record<string, string> = {
  CAPTURED: "text-success bg-success/12",
  FAILED: "text-danger bg-danger/12",
  REFUNDED: "text-faint bg-surface",
};

export default async function PaymentsPage() {
  const guard = await requireAdmin();
  if (!guard.ok) return <NotAuthorized reason={guard.reason} />;

  const [payments, totals] = await Promise.all([
    prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        user: { select: { id: true, name: true, email: true } },
        recruiter: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.payment.groupBy({ by: ["status"], _sum: { amountCents: true }, _count: { _all: true } }),
  ]);

  const capturedTotal = totals.find((t) => t.status === "CAPTURED")?._sum.amountCents ?? 0;

  return (
    <AdminShell>
      <div className="mb-6">
        <h1 className="font-display text-[24px] font-bold text-ink">Payments</h1>
        <p className="mt-1 text-[13px] text-muted">
          {payments.length} most recent transactions across all users. Populated by the Razorpay webhook once
          billing is live.
        </p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {totals.map((t) => (
          <div key={t.status} className="rounded-2xl border border-line bg-card p-4">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-faint">{t.status}</p>
            <p className="font-display text-[20px] font-bold text-ink">₹{((t._sum.amountCents ?? 0) / 100).toFixed(2)}</p>
            <p className="text-[11px] text-faint">{t._count._all} transaction{t._count._all === 1 ? "" : "s"}</p>
          </div>
        ))}
        {totals.length === 0 && (
          <div className="rounded-2xl border border-line bg-card p-4 sm:col-span-3">
            <p className="text-[13px] text-faint">No payments recorded yet.</p>
          </div>
        )}
      </div>

      {payments.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-line bg-card">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-line text-[11px] uppercase tracking-wide text-faint">
                <th className="px-4 py-3 font-semibold">User</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Method</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Razorpay ID</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-line/60 last:border-0">
                  <td className="px-4 py-3">
                    {p.user ? (
                      <Link href={`/users/${p.user.id}`} className="text-cyan hover:underline">
                        {p.user.name ?? p.user.email}
                      </Link>
                    ) : p.recruiter ? (
                      <Link href={`/recruiters/${p.recruiter.id}`} className="text-indigo hover:underline">
                        {p.recruiter.name ?? p.recruiter.email} <span className="text-faint">(recruiter)</span>
                      </Link>
                    ) : (
                      <span className="text-faint">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink">{p.currency} {(p.amountCents / 100).toFixed(2)}</td>
                  <td className="px-4 py-3 text-muted">{p.method ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[p.status]}`}>{p.status}</span>
                  </td>
                  <td className="px-4 py-3 text-muted">{fmtDateTime(p.createdAt)}</td>
                  <td className="px-4 py-3 text-faint">{p.razorpayPaymentId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-[11px] text-faint">Captured total shown above: ₹{(capturedTotal / 100).toFixed(2)}.</p>
    </AdminShell>
  );
}

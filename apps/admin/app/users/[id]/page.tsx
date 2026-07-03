import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@studentos/db";
import { requireAdmin } from "@/lib/admin";
import { NotAuthorized } from "@/components/not-authorized";
import { AdminShell } from "@/components/shell";
import { PlanSelector } from "./plan-selector";
import { AccountOps } from "./account-ops";

export const metadata = { title: "User — Admin" };

function fmtDateTime(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

const SUB_STATUS_STYLE: Record<string, string> = {
  ACTIVE: "text-success bg-success/12",
  PAST_DUE: "text-warning bg-warning/12",
  CANCELED: "text-faint bg-surface",
  EXPIRED: "text-danger bg-danger/12",
};

function periodStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (!guard.ok) return <NotAuthorized reason={guard.reason} />;

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      institution: true,
      subscription: true,
      documents: { orderBy: { createdAt: "desc" }, take: 10, select: { id: true, title: true, type: true, status: true, createdAt: true } },
      dsaAttempts: { orderBy: { createdAt: "desc" }, take: 10, select: { id: true, problemSlug: true, solved: true, createdAt: true } },
    },
  });

  if (!user) notFound();

  const [usageByKindAll, usageByKindPeriod] = await Promise.all([
    prisma.usageEvent.groupBy({ by: ["kind"], where: { userId: id }, _count: { _all: true } }),
    prisma.usageEvent.groupBy({ by: ["kind"], where: { userId: id, createdAt: { gte: periodStart() } }, _count: { _all: true } }),
  ]);

  const periodCountByKind = Object.fromEntries(usageByKindPeriod.map((r) => [r.kind, r._count._all]));

  return (
    <AdminShell>
      <Link href="/users" className="mb-4 inline-block text-[12.5px] font-medium text-cyan hover:underline">
        ← All users
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-[24px] font-bold text-ink">{user.name ?? "Unnamed"}</h1>
            {user.suspended && (
              <span className="rounded-full bg-danger/12 px-2 py-0.5 text-[11px] font-semibold text-danger">
                suspended
              </span>
            )}
          </div>
          <p className="mt-1 text-[13px] text-muted">{user.email}</p>
        </div>
        <PlanSelector userId={user.id} plan={user.plan} />
      </div>

      <div className="mb-6">
        <AccountOps
          userId={user.id}
          suspended={user.suspended}
          codingEnabled={user.codingEnabled}
          email={user.email}
        />
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-line bg-card p-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-faint">Profile</p>
          <dl className="space-y-1.5 text-[13px]">
            <div className="flex justify-between"><dt className="text-muted">Department</dt><dd className="text-ink">{user.department ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Semester</dt><dd className="text-ink">{user.semester ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Career goal</dt><dd className="text-ink">{user.careerGoal ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Institution</dt><dd className="text-ink">{user.institution?.name ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Coding enabled</dt><dd className="text-ink">{user.codingEnabled ? "Yes" : "No"}</dd></div>
          </dl>
        </div>

        <div className="rounded-2xl border border-line bg-card p-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-faint">Payment status</p>
          {user.subscription ? (
            <dl className="space-y-1.5 text-[13px]">
              <div className="flex justify-between">
                <dt className="text-muted">Status</dt>
                <dd>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${SUB_STATUS_STYLE[user.subscription.status]}`}>
                    {user.subscription.status}
                  </span>
                </dd>
              </div>
              <div className="flex justify-between"><dt className="text-muted">Plan</dt><dd className="text-ink">{user.subscription.plan}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Period ends</dt><dd className="text-ink">{fmtDateTime(user.subscription.currentPeriodEnd)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Razorpay sub</dt><dd className="text-ink">{user.subscription.razorpaySubId ?? "—"}</dd></div>
            </dl>
          ) : (
            <p className="text-[13px] text-faint">No subscription record — user is on the {user.plan} plan by default (no billing history).</p>
          )}
        </div>

        <div className="rounded-2xl border border-line bg-card p-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-faint">Activity</p>
          <dl className="space-y-1.5 text-[13px]">
            <div className="flex justify-between"><dt className="text-muted">App opens</dt><dd className="text-ink">{user.appOpens}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Last seen</dt><dd className="text-ink">{fmtDateTime(user.lastSeenAt)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Joined</dt><dd className="text-ink">{fmtDateTime(user.createdAt)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Legal accepted</dt><dd className="text-ink">{fmtDateTime(user.acceptedLegalAt)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Suspended</dt><dd className="text-ink">{user.suspended ? `Yes (${fmtDateTime(user.suspendedAt)})` : "No"}</dd></div>
          </dl>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-line bg-card p-4">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-faint">Credit consumption (generations)</p>
        <div className="grid grid-cols-3 gap-3">
          {["ASSIGNMENT", "REPORT", "PPT"].map((kind) => {
            const all = usageByKindAll.find((r) => r.kind === kind)?._count._all ?? 0;
            const period = periodCountByKind[kind] ?? 0;
            return (
              <div key={kind} className="rounded-xl border border-line/60 bg-surface p-3">
                <p className="text-[11px] font-medium text-faint">{kind}</p>
                <p className="font-display text-[20px] font-bold text-ink">{period}</p>
                <p className="text-[11px] text-faint">this month · {all} all-time</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-line bg-card p-4">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-faint">Recent documents</p>
          {user.documents.length === 0 ? (
            <p className="text-[13px] text-faint">None yet.</p>
          ) : (
            <ul className="space-y-2 text-[13px]">
              {user.documents.map((d) => (
                <li key={d.id} className="flex items-center justify-between border-b border-line/60 pb-2 last:border-0 last:pb-0">
                  <span className="truncate text-ink">{d.title || d.type}</span>
                  <span className="ml-2 shrink-0 text-[11px] text-faint">{d.status} · {fmtDateTime(d.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-line bg-card p-4">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-faint">Recent DSA attempts</p>
          {user.dsaAttempts.length === 0 ? (
            <p className="text-[13px] text-faint">None yet.</p>
          ) : (
            <ul className="space-y-2 text-[13px]">
              {user.dsaAttempts.map((a) => (
                <li key={a.id} className="flex items-center justify-between border-b border-line/60 pb-2 last:border-0 last:pb-0">
                  <span className="truncate text-ink">{a.problemSlug}</span>
                  <span className="ml-2 shrink-0 text-[11px] text-faint">
                    {a.solved ? <span className="text-success">solved</span> : "attempted"} · {fmtDateTime(a.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AdminShell>
  );
}

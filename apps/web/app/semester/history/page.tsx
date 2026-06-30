import Link from "next/link";
import { prisma } from "@studentos/db";
import { AppShell } from "@/components/app-shell";
import { requireOnboardedUser, shellUserFrom } from "@/lib/user";
import { LayersIcon } from "@/components/icons";

export const metadata = { title: "Academic Timeline — Vidyas OS" };

export default async function SemesterHistoryPage() {
  const user = await requireOnboardedUser();
  const workspaces = await prisma.workspace.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { subjects: true, documents: true } } },
  });

  const current = workspaces[0] ?? null;
  const past = workspaces.slice(1);
  const totalSubjects = workspaces.reduce((n, w) => n + w._count.subjects, 0);
  const totalFiles = workspaces.reduce((n, w) => n + w._count.documents, 0);

  return (
    <AppShell user={shellUserFrom(user)}>
      <div className="mx-auto max-w-[1180px]">
        {/* Header */}
        <div className="mb-9">
          <nav className="mb-2 flex items-center gap-2 text-[13px] text-muted">
            <Link href="/dashboard" className="hover:text-cyan">Dashboard</Link>
            <span>›</span>
            <Link href="/semester" className="font-semibold text-cyan">Semester Hub</Link>
          </nav>
          <h1 className="font-display text-[30px] font-semibold tracking-tight text-ink">Academic Timeline</h1>
          <p className="mt-2 text-[14px] text-muted">Your semesters, subjects and generated work across terms.</p>
        </div>

        {/* Bento */}
        <div className="grid grid-cols-12 gap-6">
          {/* Current semester */}
          <div className="col-span-12 lg:col-span-8">
            <div className="relative h-full overflow-hidden rounded-2xl border border-line bg-card p-8">
              <div className="pointer-events-none absolute -right-12 -top-12 size-48 rounded-full bg-cyan/5 blur-3xl" />
              <div className="relative">
                <span className="mb-6 inline-flex items-center gap-1 rounded-full bg-teal/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-teal">
                  Current Semester
                </span>
                {current ? (
                  <>
                    <h2 className="font-display text-[22px] font-semibold text-ink">{current.name}</h2>
                    <p className="mt-2 max-w-lg text-[14px] text-muted">
                      {current._count.subjects} subject{current._count.subjects === 1 ? "" : "s"} ·{" "}
                      {current._count.documents} file{current._count.documents === 1 ? "" : "s"} generated this term.
                    </p>
                    <Link href="/semester" className="mt-5 inline-block rounded-xl bg-cyan px-5 py-2.5 text-[13.5px] font-semibold text-on-accent">
                      Open Semester Hub →
                    </Link>
                  </>
                ) : (
                  <p className="text-[14px] text-muted">No semester yet — visit the Semester Hub to start one.</p>
                )}
              </div>
            </div>
          </div>

          {/* Aggregate stats */}
          <div className="col-span-12 flex flex-col gap-6 lg:col-span-4">
            <div className="flex-1 rounded-2xl border border-line bg-card p-6">
              <h3 className="mb-2 font-display text-[16px] font-semibold text-ink">Lifetime Subjects</h3>
              <p className="font-display text-[40px] font-bold leading-none text-ink">{totalSubjects}</p>
              <p className="mt-3 text-[13px] text-muted">across {workspaces.length} semester{workspaces.length === 1 ? "" : "s"}</p>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-line bg-card p-6">
              <div>
                <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">Total Files</h3>
                <p className="font-display text-[24px] font-semibold text-ink">{totalFiles}</p>
              </div>
              <span className="flex size-12 items-center justify-center rounded-full bg-cyan/12 text-cyan">
                <LayersIcon size={22} />
              </span>
            </div>
          </div>

          {/* History table */}
          <div className="col-span-12 mt-2">
            <div className="overflow-hidden rounded-2xl border border-line bg-card">
              <div className="border-b border-line p-6">
                <h3 className="font-display text-[18px] font-semibold text-ink">Past Semesters</h3>
              </div>
              {past.length === 0 ? (
                <p className="p-10 text-center text-[13.5px] text-muted">
                  No past semesters yet. Each new term becomes a workspace you can archive here.
                </p>
              ) : (
                <table className="w-full text-left text-[13.5px]">
                  <thead className="border-b border-line bg-surface/50 text-[12px] uppercase tracking-wide text-muted">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Semester</th>
                      <th className="px-6 py-4 font-semibold">Subjects</th>
                      <th className="px-6 py-4 font-semibold">Files</th>
                      <th className="px-6 py-4 text-right font-semibold">Started</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {past.map((w) => (
                      <tr key={w.id} className="transition-colors hover:bg-surface/40">
                        <td className="px-6 py-4 font-semibold text-ink">{w.name}</td>
                        <td className="px-6 py-4 text-muted">{w._count.subjects}</td>
                        <td className="px-6 py-4 text-muted">{w._count.documents}</td>
                        <td className="px-6 py-4 text-right text-muted">
                          {w.createdAt.toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

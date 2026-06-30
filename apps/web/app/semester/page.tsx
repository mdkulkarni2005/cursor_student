import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { requireOnboardedUser, shellUserFrom } from "@/lib/user";
import { getSemesterData } from "@/lib/semester";
import { AddSubjectButton } from "@/components/semester/add-subject";
import { CodeIcon, LayersIcon, Sparkle, PencilIcon } from "@/components/icons";

export const metadata = { title: "Semester Hub — Vidyas OS" };

const SUBJECT_ICONS = [CodeIcon, LayersIcon, Sparkle];
const ACCENTS = [
  { bg: "bg-cyan/12", text: "text-cyan", bar: "bg-cyan", halo: "bg-cyan/5" },
  { bg: "bg-teal/12", text: "text-teal", bar: "bg-teal", halo: "bg-teal/5" },
  { bg: "bg-surface", text: "text-faint", bar: "bg-faint", halo: "bg-faint/5" },
];

function dueLabel(dueAt: Date): { text: string; urgent: boolean } {
  const ms = dueAt.getTime() - Date.now();
  const hours = Math.round(ms / 3_600_000);
  if (ms < 0) return { text: "Overdue", urgent: true };
  if (hours < 24) return { text: `Due in ${Math.max(1, hours)}h`, urgent: true };
  const days = Math.round(hours / 24);
  return { text: days <= 1 ? "Due tomorrow" : `Due in ${days} days`, urgent: days <= 2 };
}

export default async function SemesterHubPage() {
  const user = await requireOnboardedUser();
  const data = await getSemesterData(user);
  const totalFiles = data.subjects.reduce((n, s) => n + s.fileCount, 0);

  return (
    <AppShell user={shellUserFrom(user)}>
      <div className="mx-auto max-w-[1180px]">
        {/* Header */}
        <header className="mb-9 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-[30px] font-semibold tracking-tight text-ink">Semester Hub</h1>
            <div className="mt-2 flex items-center gap-3 text-[13.5px] text-muted">
              <span>{data.semester ? `Semester ${data.semester}` : "Current Semester"}</span>
              <span className="size-1.5 rounded-full bg-line-strong" />
              <span>{data.subjects.length} subject{data.subjects.length === 1 ? "" : "s"}</span>
            </div>
          </div>
          <div className="flex gap-3">
            <Link
              href="/semester/history"
              className="rounded-xl border border-line bg-card px-5 py-2.5 text-[13.5px] font-medium text-muted transition-colors hover:bg-surface"
            >
              Archive View
            </Link>
            <AddSubjectButton variant="header" />
          </div>
        </header>

        {/* Overview bento */}
        <div className="mb-12 grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Stats */}
          <div className="flex flex-col justify-between rounded-3xl border border-line bg-card p-7 lg:col-span-8">
            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-cyan">This Semester</p>
              <h2 className="font-display text-[22px] font-semibold text-ink">Your workspace at a glance</h2>
            </div>
            <div className="mt-8 grid grid-cols-3 gap-6 border-t border-line pt-6">
              {[
                { label: "Active Subjects", value: String(data.subjects.length) },
                { label: "Files in Vault", value: String(totalFiles) },
                { label: "Upcoming Deadlines", value: String(data.deadlines.length) },
              ].map((s) => (
                <div key={s.label}>
                  <p className="mb-1 text-[12px] text-muted">{s.label}</p>
                  <p className="font-display text-[24px] font-bold text-ink">{s.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Deadlines */}
          <div className="rounded-3xl border border-line bg-card p-6 lg:col-span-4">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink">Critical Deadlines</h2>
              {data.deadlines.length > 0 && (
                <span className="flex size-6 items-center justify-center rounded-full bg-danger/12 text-[13px] font-bold text-danger">!</span>
              )}
            </div>
            {data.deadlines.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-line bg-surface/50 p-5 text-center text-[13px] text-muted">
                No deadlines yet. They&apos;ll show here as you add them per subject.
              </p>
            ) : (
              <div className="space-y-3.5">
                {data.deadlines.map((d) => {
                  const due = dueLabel(d.dueAt);
                  return (
                    <div key={d.id} className="flex items-center gap-4 rounded-2xl border border-line bg-surface/60 p-4">
                      <div className={`flex size-10 items-center justify-center rounded-xl ${due.urgent ? "bg-danger/12 text-danger" : "bg-cyan/12 text-cyan"}`}>
                        <PencilIcon size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-medium text-ink">{d.title}</p>
                        <p className={`text-[12.5px] ${due.urgent ? "text-danger" : "text-muted"}`}>
                          {due.text}{d.subjectName ? ` · ${d.subjectName}` : ""}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Active subjects */}
        <div className="mb-4">
          <h2 className="mb-7 font-display text-[22px] font-semibold text-ink">Active Subjects</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {data.subjects.map((s, i) => {
              const a = ACCENTS[i % ACCENTS.length];
              const Icon = SUBJECT_ICONS[i % SUBJECT_ICONS.length];
              return (
                <Link
                  key={s.id}
                  href={`/semester/${s.id}`}
                  className="group relative overflow-hidden rounded-3xl border border-line bg-card p-7 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)]"
                >
                  <div className={`pointer-events-none absolute -right-16 -top-16 size-32 rounded-full ${a.halo} transition-transform duration-500 group-hover:scale-150`} />
                  <div className="mb-7 flex items-center justify-between">
                    <div className={`flex size-14 items-center justify-center rounded-2xl ${a.bg} ${a.text}`}>
                      <Icon size={28} />
                    </div>
                    {s.code && <span className="rounded-md bg-surface px-2 py-1 text-[11px] font-semibold text-muted">{s.code}</span>}
                  </div>
                  <h3 className="mb-2 font-display text-[19px] font-semibold text-ink">{s.name}</h3>
                  <p className="mb-6 text-[13.5px] text-muted">
                    {s.fileCount} file{s.fileCount === 1 ? "" : "s"} in this workspace.
                  </p>
                  <div className="flex items-center justify-between border-t border-line pt-5">
                    <span className={`text-[12px] font-semibold ${a.text}`}>Open workspace →</span>
                    <span className="text-[12px] text-muted">{s.fileCount} Files</span>
                  </div>
                </Link>
              );
            })}

            <AddSubjectButton variant="ghost" />
          </div>
        </div>
      </div>
    </AppShell>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { requireOnboardedUser, shellUserFrom } from "@/lib/user";
import { getSubjectDetail } from "@/lib/semester";
import { DocumentRow } from "@/components/document-row";
import { Sparkle } from "@/components/icons";

export const metadata = { title: "Subject — Vidyas OS" };

function dueLabel(dueAt: Date): string {
  const ms = dueAt.getTime() - Date.now();
  if (ms < 0) return "Overdue";
  const days = Math.round(ms / 86_400_000);
  if (days <= 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days} days`;
}

export default async function SubjectDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const user = await requireOnboardedUser();
  const { slug } = await params;
  const subject = await getSubjectDetail(user, slug);
  if (!subject) notFound();

  return (
    <AppShell user={shellUserFrom(user)}>
      <div className="mx-auto max-w-[1180px]">
        {/* Header */}
        <div className="mb-8">
          <nav className="mb-2 flex items-center gap-2 text-[13px] text-muted">
            <Link href="/semester" className="hover:text-cyan">Semester Hub</Link>
            <span>›</span>
            <span className="font-semibold text-cyan">{subject.name}</span>
          </nav>
          <h1 className="font-display text-[34px] font-semibold tracking-tight text-cyan">{subject.name}</h1>
          <p className="mt-1 text-[14px] text-muted">{subject.code ?? "Course workspace"}</p>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {[
            { label: "Files", value: String(subject.documents.length) },
            { label: "Upcoming Deadlines", value: String(subject.deadlines.length) },
            { label: "Course Code", value: subject.code ?? "—" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-line bg-card p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{s.label}</p>
              <p className="mt-1 font-display text-[24px] font-bold text-ink">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Left */}
          <div className="col-span-12 space-y-6 lg:col-span-8">
            {/* AI study guide */}
            <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-cyan to-indigo p-7 text-on-accent">
              <div className="mb-3 flex items-center gap-2">
                <Sparkle size={20} />
                <h2 className="font-display text-[18px] font-semibold">AI Study Guide</h2>
              </div>
              <p className="text-[14px] opacity-95">
                Generate a report, viva set or quiz for <strong>{subject.name}</strong> — it&apos;s wired to your
                workspace and stays in this subject.
              </p>
              <Link href="/reports" className="mt-4 inline-block rounded-xl bg-card px-5 py-2.5 text-[13.5px] font-bold text-cyan shadow-lg">
                Generate material
              </Link>
            </div>

            {/* Files */}
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-[18px] font-semibold text-ink">Files & Documents</h2>
                <Link href="/vault" className="text-[13px] font-bold text-cyan hover:underline">Open Vault</Link>
              </div>
              {subject.documents.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-line bg-card p-10 text-center">
                  <p className="font-display text-[16px] font-semibold text-ink">No files yet</p>
                  <p className="mt-1 text-[13.5px] text-muted">Documents you generate for this subject will appear here.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {subject.documents.map((d) => (
                    <DocumentRow key={d.id} doc={d} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right */}
          <div className="col-span-12 space-y-6 lg:col-span-4">
            <div className="rounded-2xl border border-line bg-card p-6">
              <h3 className="mb-4 font-display text-[15px] font-semibold text-ink">Upcoming</h3>
              {subject.deadlines.length === 0 ? (
                <p className="text-[13px] text-muted">No deadlines for this subject yet.</p>
              ) : (
                <div className="space-y-4">
                  {subject.deadlines.map((d) => (
                    <div key={d.id} className="border-l-2 border-cyan pl-3">
                      <p className="text-[13.5px] font-bold text-ink">{d.title}</p>
                      <p className="text-[11.5px] text-muted">{dueLabel(d.dueAt)} · {d.kind}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

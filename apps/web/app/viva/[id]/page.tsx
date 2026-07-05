import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@studentos/db";
import { AppShell } from "@/components/app-shell";
import { requireStudentRoute, shellUserFrom } from "@/lib/user";
import { generateVivaAction } from "@/lib/actions/viva";
import { SubmitButton } from "@/components/ui/button";

type VivaQ = { question: string; answer: string; difficulty: "easy" | "medium" | "hard" };

// The mockup labels questions by likelihood ("High/Medium frequency", "Advanced").
const FREQ: Record<string, { label: string; cls: string }> = {
  hard: { label: "Advanced", cls: "bg-danger/12 text-danger" },
  medium: { label: "Medium Frequency", cls: "bg-warning/15 text-warning" },
  easy: { label: "High Frequency", cls: "bg-teal/12 text-teal" },
};

export default async function VivaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireStudentRoute();

  const doc = await prisma.document.findFirst({ where: { id, ownerId: user.id }, include: { viva: true } });
  if (!doc) notFound();

  const questions = (doc.viva?.questions as VivaQ[] | undefined) ?? [];
  const counts = {
    easy: questions.filter((q) => q.difficulty === "easy").length,
    medium: questions.filter((q) => q.difficulty === "medium").length,
    hard: questions.filter((q) => q.difficulty === "hard").length,
  };

  return (
    <AppShell user={await shellUserFrom(user)}>
      <div className="mx-auto max-w-[1080px]">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <Link href="/viva" className="text-[12.5px] text-muted transition-colors hover:text-cyan">← Viva prep</Link>
            <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-cyan">AI-Powered Viva Coach</p>
            <h1 className="font-display text-[26px] font-bold leading-tight text-ink">{doc.title}</h1>
            <p className="mt-1 text-[13.5px] text-muted">Master your academic panel with AI-generated predictions based on your work.</p>
          </div>
          <div className="flex gap-2">
            <form action={generateVivaAction}>
              <input type="hidden" name="sourceId" value={doc.id} />
              <SubmitButton loadingText="Regenerating…" className="rounded-xl border border-line bg-card px-4 py-2.5 text-[13px] font-semibold text-soft transition-colors hover:border-cyan/40 hover:text-cyan disabled:opacity-60">Regenerate</SubmitButton>
            </form>
            <Link href="/interview" className="rounded-xl bg-cyan px-4 py-2.5 text-[13.5px] font-semibold text-on-accent transition-transform hover:-translate-y-0.5">▶ Start Mock Session</Link>
          </div>
        </div>

        {questions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line-strong bg-card p-10 text-center">
            <p className="text-[14px] text-muted">No viva generated yet for this document.</p>
            <form action={generateVivaAction} className="mt-3">
              <input type="hidden" name="sourceId" value={doc.id} />
              <SubmitButton loadingText="Generating…" className="rounded-xl bg-cyan px-4 py-2.5 text-[13.5px] font-semibold text-on-accent transition-transform hover:-translate-y-0.5 disabled:opacity-60">Generate viva</SubmitButton>
            </form>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
            {/* Left rail */}
            <aside className="space-y-4">
              <div className="rounded-2xl border border-line bg-card p-5">
                <h2 className="mb-3 text-[11px] font-bold uppercase tracking-wide text-muted">Coverage</h2>
                <div className="space-y-2.5">
                  {([["High frequency", counts.easy, "bg-teal"], ["Medium frequency", counts.medium, "bg-warning"], ["Advanced", counts.hard, "bg-danger"]] as const).map(([l, n, c]) => (
                    <div key={l} className="flex items-center justify-between text-[13px]">
                      <span className="flex items-center gap-2 text-soft"><span className={`size-2.5 rounded-full ${c}`} />{l}</span>
                      <span className="font-semibold text-ink">{n}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-cyan/25 bg-cyan/[0.06] p-5">
                <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-cyan">Panel Tip</p>
                <p className="text-[13px] leading-relaxed text-soft">Examiners frequently ask about practical trade-offs. Be ready to explain the &ldquo;why&rdquo; behind each answer, not just the definition.</p>
              </div>
            </aside>

            {/* Questions */}
            <div>
              <h2 className="mb-4 flex items-center gap-2 font-display text-[18px] font-semibold text-ink">
                Predicted Panel Questions
                <span className="rounded-full bg-cyan/10 px-2.5 py-0.5 text-[11px] font-semibold text-cyan">{questions.length} found</span>
              </h2>
              <div className="space-y-3">
                {questions.map((q, i) => {
                  const f = FREQ[q.difficulty] ?? FREQ.medium;
                  return (
                    <details key={i} className="group rounded-2xl border border-line bg-card p-5">
                      <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
                        <span className="font-display text-[14.5px] font-semibold text-ink">Q{i + 1}. {q.question}</span>
                        <span className="flex shrink-0 items-center gap-2">
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${f.cls}`}>{f.label}</span>
                          <span className="text-[12px] font-semibold text-cyan group-open:hidden">Show Answer ▾</span>
                        </span>
                      </summary>
                      <p className="mt-3 border-t border-line pt-3 text-[13.5px] leading-relaxed text-soft">{q.answer}</p>
                    </details>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

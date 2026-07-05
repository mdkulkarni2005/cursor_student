import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@studentos/db";
import { AppShell } from "@/components/app-shell";
import { requireStudentRoute, shellUserFrom } from "@/lib/user";
import { regenerateDrawingVivaAction } from "@/lib/actions/drawing-viva";
import { hasBranchFeature } from "@/lib/capabilities";
import { GeneratingPoller } from "@/components/reports/generating-poller";
import { DeleteDocButton } from "@/components/delete-doc-button";
import { AIGeneratedNotice } from "@/components/ai-generated-notice";
import { SubmitButton } from "@/components/ui/button";
import { DRAWING_VIVA_STAGES } from "@/lib/drawing-viva/generate";
import { stageOf } from "@/lib/jobs";

type VivaQ = { question: string; answer: string; difficulty: "easy" | "medium" | "hard" };

const FREQ: Record<string, { label: string; cls: string }> = {
  hard: { label: "Advanced", cls: "bg-danger/12 text-danger" },
  medium: { label: "Medium Frequency", cls: "bg-warning/15 text-warning" },
  easy: { label: "High Frequency", cls: "bg-teal/12 text-teal" },
};

export default async function DrawingVivaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireStudentRoute();
  if (!hasBranchFeature(user.department, "drawing-viva")) notFound();

  const doc = await prisma.document.findFirst({
    where: { id, ownerId: user.id, type: "DRAWING_VIVA" },
    include: { viva: true, job: true },
  });
  if (!doc) notFound();

  const stage = stageOf(doc.job?.pending);
  const questions = (doc.viva?.questions as VivaQ[] | undefined) ?? [];
  const counts = {
    easy: questions.filter((q) => q.difficulty === "easy").length,
    medium: questions.filter((q) => q.difficulty === "medium").length,
    hard: questions.filter((q) => q.difficulty === "hard").length,
  };

  return (
    <AppShell user={await shellUserFrom(user)}>
      <div className="mx-auto max-w-[1080px]">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <Link href="/drawing-viva" className="text-[12.5px] text-muted transition-colors hover:text-cyan">← Drawing viva prep</Link>
            <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-cyan">AI-Powered Drawing Viva Coach</p>
            <h1 className="font-display text-[26px] font-bold leading-tight text-ink">{doc.title}</h1>
          </div>
          <div className="flex gap-2">
            {doc.status === "READY" ? (
              <form action={regenerateDrawingVivaAction}>
                <input type="hidden" name="docId" value={doc.id} />
                <SubmitButton loadingText="Regenerating…" className="rounded-xl border border-line bg-card px-4 py-2.5 text-[13px] font-semibold text-soft transition-colors hover:border-cyan/40 hover:text-cyan disabled:opacity-60">Regenerate</SubmitButton>
              </form>
            ) : null}
            <DeleteDocButton docId={doc.id} kind="drawing viva set" />
          </div>
        </div>

        {doc.status === "GENERATING" ? (
          <GeneratingPoller stages={DRAWING_VIVA_STAGES} current={stage} />
        ) : doc.status === "FAILED" ? (
          <div className="rounded-xl border border-danger/25 bg-danger/10 p-4 text-[13.5px] text-danger">
            Couldn&apos;t analyze this drawing: {doc.job?.error ?? "unknown error"}. Try again.
          </div>
        ) : questions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line-strong bg-card p-10 text-center">
            <p className="text-[14px] text-muted">No viva questions generated yet.</p>
          </div>
        ) : (
          <>
            <AIGeneratedNotice subject="viva prediction" />
            <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
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
                  <p className="text-[13px] leading-relaxed text-soft">Be ready to point at the specific dimension/symbol on your drawing when explaining a GD&T answer — examiners often ask you to trace it live.</p>
                </div>
              </aside>

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
          </>
        )}
      </div>
    </AppShell>
  );
}

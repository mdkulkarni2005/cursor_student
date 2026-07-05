import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@studentos/db";
import { AppShell } from "@/components/app-shell";
import { requireStudentRoute, shellUserFrom } from "@/lib/user";
import { askBranchSolverAction } from "@/lib/actions/branch-solver";
import { hasBranchFeature } from "@/lib/capabilities";
import { branchSolverFeature } from "@/lib/branch-solver/features";
import { GeneratingPoller } from "@/components/reports/generating-poller";
import { DeleteDocButton } from "@/components/delete-doc-button";
import { SubmitButton } from "@/components/ui/button";
import { AIGeneratedNotice } from "@/components/ai-generated-notice";
import { BRANCH_SOLVER_STAGES } from "@/lib/branch-solver/generate";
import { stageOf } from "@/lib/jobs";

type Turn = { speaker: "student" | "tutor"; content: string };
type SolutionData = {
  questionSummary?: string;
  approach?: string;
  steps?: { heading: string; detail: string }[];
  finalAnswer?: string;
  code?: string;
  conversation?: Turn[];
};

export default async function BranchSolverDetailPage({
  params,
}: {
  params: Promise<{ feature: string; id: string }>;
}) {
  const { feature: slug, id } = await params;
  const user = await requireStudentRoute();

  const feature = branchSolverFeature(slug);
  if (!feature || !hasBranchFeature(user.department, slug)) notFound();

  const doc = await prisma.document.findFirst({
    where: { id, ownerId: user.id, type: "BRANCH_SOLVER", feature: slug },
    include: { content: true, exports: true, job: true },
  });
  if (!doc) notFound();

  const sol = (doc.content?.data ?? {}) as SolutionData;
  const hasExport = doc.exports.length > 0;
  const stage = stageOf(doc.job?.pending);

  return (
    <AppShell user={await shellUserFrom(user)}>
      <div className="mx-auto max-w-[1100px]">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <Link href={`/solve/${slug}`} className="text-[12.5px] text-muted transition-colors hover:text-cyan">← {feature.label}</Link>
            <h1 className="mt-1 font-display text-[24px] font-bold leading-tight text-ink">{doc.title}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {doc.status === "READY" && hasExport ? (
              <a href={`/solve/${slug}/${doc.id}/download`} className="rounded-xl bg-cyan px-4 py-2.5 text-[13.5px] font-semibold text-on-accent transition-transform hover:-translate-y-0.5">⬆ Export</a>
            ) : null}
            <DeleteDocButton docId={doc.id} kind="solution" />
          </div>
        </div>

        {doc.status === "GENERATING" ? (
          <GeneratingPoller stages={BRANCH_SOLVER_STAGES} current={stage} />
        ) : doc.status === "FAILED" ? (
          <div className="rounded-xl border border-danger/25 bg-danger/10 p-4 text-[13.5px] text-danger">
            Couldn&apos;t solve this: {doc.job?.error ?? "unknown error"}. Try again.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
            <div className="min-w-0 space-y-5 rounded-2xl border border-line bg-card p-6">
              {doc.status === "READY" ? <AIGeneratedNotice subject="solution" /> : null}

              {sol.questionSummary ? (
                <div className="rounded-xl border border-line bg-surface p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Question</p>
                  <p className="mt-1 text-[13.5px] leading-relaxed text-soft">{sol.questionSummary}</p>
                </div>
              ) : null}

              {sol.approach ? (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Approach</p>
                  <p className="mt-1 text-[13.5px] leading-relaxed text-soft">{sol.approach}</p>
                </div>
              ) : null}

              {sol.steps && sol.steps.length > 0 ? (
                <ol className="space-y-3">
                  {sol.steps.map((s, i) => (
                    <li key={i} className="flex gap-3.5 rounded-xl border border-line p-4">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-cyan/12 text-[12px] font-bold text-cyan">{i + 1}</span>
                      <div className="min-w-0">
                        <p className="text-[13.5px] font-semibold text-ink">{s.heading}</p>
                        <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed text-soft">{s.detail}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : null}

              {sol.code ? (
                <pre className="overflow-x-auto rounded-xl border border-line bg-[#0b0f1a] p-4 font-mono text-[12.5px] text-white/90">{sol.code}</pre>
              ) : null}

              {sol.finalAnswer ? (
                <div className="rounded-xl border border-cyan/25 bg-cyan/10 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-cyan">Final Answer</p>
                  <p className="mt-1 text-[13.5px] leading-relaxed text-ink">{sol.finalAnswer}</p>
                </div>
              ) : null}
            </div>

            {doc.status === "READY" ? (
              <aside className="rounded-2xl border border-line bg-card p-5">
                <div className="mb-1 flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-indigo/15 text-indigo">🎓</span>
                  <h2 className="font-display text-[15px] font-semibold text-ink">Vidyas AI Tutor</h2>
                </div>
                <p className="mb-4 text-[12px] text-muted">Not sure about a step, formula, or unit? Ask — if your feedback changes the answer, the solution updates too.</p>

                {sol.conversation && sol.conversation.length > 0 ? (
                  <div className="mb-3 space-y-2.5">
                    {sol.conversation.map((t, i) => (
                      <div key={i} className={t.speaker === "student" ? "flex justify-end" : "flex justify-start"}>
                        <div className={t.speaker === "student"
                          ? "max-w-[88%] rounded-2xl rounded-br-sm bg-cyan px-3.5 py-2.5 text-[13px] text-on-accent"
                          : "max-w-[88%] whitespace-pre-line rounded-2xl rounded-bl-sm border border-line bg-surface px-3.5 py-2.5 text-[13px] text-soft"}>
                          {t.content}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}

                <form action={askBranchSolverAction} className="space-y-2">
                  <input type="hidden" name="docId" value={doc.id} />
                  <input type="hidden" name="feature" value={slug} />
                  <textarea name="message" required rows={3} placeholder="Ask a follow-up… e.g. Redo step 2, check the units."
                    className="w-full resize-none rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[13px] text-ink outline-none transition-colors focus:border-cyan/50 placeholder:text-faint" />
                  <SubmitButton loadingText="Sending…" className="w-full rounded-xl bg-cyan py-2.5 text-[13px] font-semibold text-on-accent transition-transform hover:-translate-y-0.5 disabled:opacity-60">Send</SubmitButton>
                </form>
              </aside>
            ) : null}
          </div>
        )}
      </div>
    </AppShell>
  );
}

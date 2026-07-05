import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@studentos/db";
import { AppShell } from "@/components/app-shell";
import { requireStudentRoute, shellUserFrom } from "@/lib/user";
import { askLabReportAction } from "@/lib/actions/lab-reports";
import { GeneratingPoller } from "@/components/reports/generating-poller";
import { DeleteDocButton } from "@/components/delete-doc-button";
import { SubmitButton } from "@/components/ui/button";
import { AIGeneratedNotice } from "@/components/ai-generated-notice";
import { LAB_REPORT_STAGES } from "@/lib/lab-reports/generate";
import { stageOf } from "@/lib/jobs";

type Turn = { speaker: "student" | "tutor"; content: string };
type ReportData = {
  aim?: string;
  apparatus?: string[];
  theory?: string;
  procedure?: string[];
  observations?: { columns: string[]; rows: string[][] };
  calculations?: string;
  result?: string;
  conclusion?: string;
  precautions?: string[];
  conversation?: Turn[];
};

export default async function LabReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireStudentRoute();

  const doc = await prisma.document.findFirst({
    where: { id, ownerId: user.id, type: "LAB_REPORT" },
    include: { content: true, exports: true, job: true },
  });
  if (!doc) notFound();

  const r = (doc.content?.data ?? {}) as ReportData;
  const hasExport = doc.exports.length > 0;
  const stage = stageOf(doc.job?.pending);

  return (
    <AppShell user={await shellUserFrom(user)}>
      <div className="mx-auto max-w-[1100px]">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <Link href="/lab-reports" className="text-[12.5px] text-muted transition-colors hover:text-cyan">← All lab reports</Link>
            <h1 className="mt-1 font-display text-[24px] font-bold leading-tight text-ink">{doc.title}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {doc.status === "READY" && hasExport ? (
              <a href={`/lab-reports/${doc.id}/download`} className="rounded-xl bg-cyan px-4 py-2.5 text-[13.5px] font-semibold text-on-accent transition-transform hover:-translate-y-0.5">⬆ Export</a>
            ) : null}
            <DeleteDocButton docId={doc.id} kind="lab report" />
          </div>
        </div>

        {doc.status === "GENERATING" ? (
          <GeneratingPoller stages={LAB_REPORT_STAGES} current={stage} />
        ) : doc.status === "FAILED" ? (
          <div className="rounded-xl border border-danger/25 bg-danger/10 p-4 text-[13.5px] text-danger">
            Couldn&apos;t generate this: {doc.job?.error ?? "unknown error"}. Try again.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
            <div className="min-w-0 space-y-5 rounded-2xl border border-line bg-card p-6">
              {doc.status === "READY" ? <AIGeneratedNotice subject="lab report" /> : null}

              {r.aim ? (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Aim</p>
                  <p className="mt-1 text-[13.5px] leading-relaxed text-soft">{r.aim}</p>
                </div>
              ) : null}

              {r.apparatus?.length ? (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Apparatus / Materials</p>
                  <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[13.5px] leading-relaxed text-soft">
                    {r.apparatus.map((a, i) => <li key={i}>{a}</li>)}
                  </ul>
                </div>
              ) : null}

              {r.theory ? (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Theory</p>
                  <p className="mt-1 text-[13.5px] leading-relaxed text-soft">{r.theory}</p>
                </div>
              ) : null}

              {r.procedure?.length ? (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Procedure</p>
                  <ol className="mt-1.5 list-decimal space-y-1 pl-5 text-[13.5px] leading-relaxed text-soft">
                    {r.procedure.map((p, i) => <li key={i}>{p}</li>)}
                  </ol>
                </div>
              ) : null}

              {r.observations?.columns?.length ? (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Observations</p>
                  <div className="mt-2 overflow-x-auto rounded-lg border border-line">
                    <table className="w-full text-[13px]">
                      <thead>
                        <tr className="bg-surface">
                          {r.observations.columns.map((c, i) => (
                            <th key={i} className="border-b border-line px-3 py-2 text-left font-semibold text-ink">{c}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {r.observations.rows.map((row, i) => (
                          <tr key={i} className="border-b border-line last:border-0">
                            {row.map((cell, j) => <td key={j} className="px-3 py-2 text-soft">{cell}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              {r.calculations ? (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Calculations</p>
                  <p className="mt-1 whitespace-pre-line text-[13.5px] leading-relaxed text-soft">{r.calculations}</p>
                </div>
              ) : null}

              {r.result ? (
                <div className="rounded-xl border border-cyan/25 bg-cyan/10 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-cyan">Result</p>
                  <p className="mt-1 text-[13.5px] leading-relaxed text-ink">{r.result}</p>
                </div>
              ) : null}

              {r.precautions?.length ? (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Precautions</p>
                  <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[13.5px] leading-relaxed text-soft">
                    {r.precautions.map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
                </div>
              ) : null}

              {r.conclusion ? (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Conclusion</p>
                  <p className="mt-1 text-[13.5px] leading-relaxed text-soft">{r.conclusion}</p>
                </div>
              ) : null}
            </div>

            {doc.status === "READY" ? (
              <aside className="rounded-2xl border border-line bg-card p-5">
                <div className="mb-1 flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-indigo/15 text-indigo">🎓</span>
                  <h2 className="font-display text-[15px] font-semibold text-ink">Vidyas AI Tutor</h2>
                </div>
                <p className="mb-4 text-[12px] text-muted">Spot a wrong reading or want the conclusion reworded? Ask — the report updates if your feedback changes it.</p>

                {r.conversation && r.conversation.length > 0 ? (
                  <div className="mb-3 space-y-2.5">
                    {r.conversation.map((t, i) => (
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

                <form action={askLabReportAction} className="space-y-2">
                  <input type="hidden" name="docId" value={doc.id} />
                  <textarea name="message" required rows={3} placeholder="e.g. Trial 2 reading should be 0.6A, not 0.8A."
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

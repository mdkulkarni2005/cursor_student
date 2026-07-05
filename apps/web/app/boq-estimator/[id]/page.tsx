import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@studentos/db";
import { AppShell } from "@/components/app-shell";
import { requireStudentRoute, shellUserFrom } from "@/lib/user";
import { askBoqAction } from "@/lib/actions/boq-estimator";
import { hasBranchFeature } from "@/lib/capabilities";
import { GeneratingPoller } from "@/components/reports/generating-poller";
import { DeleteDocButton } from "@/components/delete-doc-button";
import { SubmitButton } from "@/components/ui/button";
import { AIGeneratedNotice } from "@/components/ai-generated-notice";
import { BOQ_STAGES } from "@/lib/boq-estimator/generate";
import { stageOf } from "@/lib/jobs";

type Turn = { speaker: "student" | "tutor"; content: string };
type BOQData = {
  title?: string;
  items?: { description: string; unit: string; quantity: number; rate: number; amount: number }[];
  assumptions?: string[];
  totalAmount?: number;
  conversation?: Turn[];
};

function inr(n: number): string {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export default async function BoqDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireStudentRoute();
  if (!hasBranchFeature(user.department, "boq-estimator")) notFound();

  const doc = await prisma.document.findFirst({
    where: { id, ownerId: user.id, type: "BRANCH_SOLVER", feature: "boq-estimator" },
    include: { content: true, exports: true, job: true },
  });
  if (!doc) notFound();

  const est = (doc.content?.data ?? {}) as BOQData;
  const hasExport = doc.exports.length > 0;
  const stage = stageOf(doc.job?.pending);

  return (
    <AppShell user={await shellUserFrom(user)}>
      <div className="mx-auto max-w-[1100px]">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <Link href="/boq-estimator" className="text-[12.5px] text-muted transition-colors hover:text-cyan">← BOQ Estimator</Link>
            <h1 className="mt-1 font-display text-[24px] font-bold leading-tight text-ink">{doc.title}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {doc.status === "READY" && hasExport ? (
              <a href={`/boq-estimator/${doc.id}/download`} className="rounded-xl bg-cyan px-4 py-2.5 text-[13.5px] font-semibold text-on-accent transition-transform hover:-translate-y-0.5">⬆ Export</a>
            ) : null}
            <DeleteDocButton docId={doc.id} kind="estimate" />
          </div>
        </div>

        {doc.status === "GENERATING" ? (
          <GeneratingPoller stages={BOQ_STAGES} current={stage} />
        ) : doc.status === "FAILED" ? (
          <div className="rounded-xl border border-danger/25 bg-danger/10 p-4 text-[13.5px] text-danger">
            Couldn&apos;t generate this: {doc.job?.error ?? "unknown error"}. Try again.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
            <div className="min-w-0 space-y-5 rounded-2xl border border-line bg-card p-6">
              {doc.status === "READY" ? <AIGeneratedNotice subject="estimate" /> : null}

              {est.items?.length ? (
                <div className="overflow-x-auto rounded-lg border border-line">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="bg-surface">
                        {["#", "Description", "Unit", "Qty", "Rate", "Amount"].map((c) => (
                          <th key={c} className="border-b border-line px-3 py-2 text-left font-semibold text-ink">{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {est.items.map((item, i) => (
                        <tr key={i} className="border-b border-line last:border-0">
                          <td className="px-3 py-2 text-soft">{i + 1}</td>
                          <td className="px-3 py-2 text-soft">{item.description}</td>
                          <td className="px-3 py-2 text-soft">{item.unit}</td>
                          <td className="px-3 py-2 text-soft">{item.quantity}</td>
                          <td className="px-3 py-2 text-soft">{inr(item.rate)}</td>
                          <td className="px-3 py-2 text-soft">{inr(item.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-surface">
                        <td colSpan={5} className="px-3 py-2 text-right font-semibold text-ink">Grand Total</td>
                        <td className="px-3 py-2 font-semibold text-ink">{inr(est.totalAmount ?? 0)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : null}

              {est.assumptions?.length ? (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Assumptions</p>
                  <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[13.5px] leading-relaxed text-soft">
                    {est.assumptions.map((a, i) => <li key={i}>{a}</li>)}
                  </ul>
                </div>
              ) : null}
            </div>

            {doc.status === "READY" ? (
              <aside className="rounded-2xl border border-line bg-card p-5">
                <div className="mb-1 flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-indigo/15 text-indigo">🎓</span>
                  <h2 className="font-display text-[15px] font-semibold text-ink">Vidyas AI Tutor</h2>
                </div>
                <p className="mb-4 text-[12px] text-muted">Spot a wrong quantity or rate? Ask — the estimate updates if your feedback changes it.</p>

                {est.conversation && est.conversation.length > 0 ? (
                  <div className="mb-3 space-y-2.5">
                    {est.conversation.map((t, i) => (
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

                <form action={askBoqAction} className="space-y-2">
                  <input type="hidden" name="docId" value={doc.id} />
                  <textarea name="message" required rows={3} placeholder="e.g. Excavation quantity should be 12 cum, not 10."
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

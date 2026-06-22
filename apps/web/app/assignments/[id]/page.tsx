import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@studentos/db";
import { AppShell } from "@/components/app-shell";
import { requireOnboardedUser, shellUserFrom } from "@/lib/user";
import { askAssignmentAction } from "@/lib/actions/assignments";
import { GeneratingPoller } from "@/components/reports/generating-poller";
import { DeleteDocButton } from "@/components/delete-doc-button";
import { ASSIGNMENT_STAGES } from "@/lib/assignments/generate";
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

export default async function AssignmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireOnboardedUser();

  const doc = await prisma.document.findFirst({
    where: { id, ownerId: user.id, type: "ASSIGNMENT" },
    include: { content: true, exports: true, job: true },
  });
  if (!doc) notFound();

  const sol = (doc.content?.data ?? {}) as SolutionData;
  const hasExport = doc.exports.length > 0;
  const stage = stageOf(doc.job?.pending);

  return (
    <AppShell user={shellUserFrom(user)}>
      <div className="mx-auto max-w-[760px]">
        <Link href="/assignments" className="text-[13px] text-muted transition-colors hover:text-soft">
          ← All assignments
        </Link>

        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <h1 className="min-w-0 font-display text-[22px] font-bold leading-tight text-ink">{doc.title}</h1>
          <div className="flex shrink-0 items-center gap-2">
            {doc.status === "READY" && hasExport ? (
              <a
                href={`/assignments/${doc.id}/download`}
                className="rounded-xl bg-accent-gradient px-4 py-2.5 text-[13.5px] font-semibold text-on-accent shadow-[0_6px_18px_rgba(34,211,238,0.3)] transition-transform hover:-translate-y-0.5"
              >
                Download DOCX
              </a>
            ) : null}
            <DeleteDocButton docId={doc.id} kind="assignment" />
          </div>
        </div>

        {doc.status === "GENERATING" ? (
          <GeneratingPoller stages={ASSIGNMENT_STAGES} current={stage} />
        ) : doc.status === "FAILED" ? (
          <div className="mt-6 rounded-xl border border-danger/25 bg-danger/10 p-4 text-[13.5px] text-danger">
            Couldn&apos;t solve this: {doc.job?.error ?? "unknown error"}. Try again.
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-line bg-card p-6">
            {sol.questionSummary ? (
              <>
                <h2 className="font-display text-[14px] font-semibold text-ink">Question</h2>
                <p className="mb-5 mt-1.5 text-[13.5px] leading-relaxed text-soft">{sol.questionSummary}</p>
              </>
            ) : null}

            {sol.approach ? (
              <>
                <h2 className="font-display text-[14px] font-semibold text-ink">Approach</h2>
                <p className="mb-5 mt-1.5 text-[13.5px] leading-relaxed text-soft">{sol.approach}</p>
              </>
            ) : null}

            {sol.steps && sol.steps.length > 0 ? (
              <div className="mb-5">
                <h2 className="mb-2 font-display text-[14px] font-semibold text-ink">Solution</h2>
                <ol className="space-y-3">
                  {sol.steps.map((s, i) => (
                    <li key={i} className="rounded-xl border border-line bg-surface/50 p-3.5">
                      <p className="text-[13px] font-semibold text-ink">{s.heading}</p>
                      <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed text-soft">{s.detail}</p>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}

            {sol.code ? (
              <div className="mb-5">
                <h2 className="mb-2 font-display text-[14px] font-semibold text-ink">Code</h2>
                <pre className="overflow-x-auto rounded-xl border border-line bg-base p-4 font-mono text-[12.5px] text-soft">
                  {sol.code}
                </pre>
              </div>
            ) : null}

            {sol.finalAnswer ? (
              <div className="rounded-xl border border-cyan/25 bg-cyan/10 p-4">
                <h2 className="font-display text-[13px] font-semibold text-cyan">Final answer</h2>
                <p className="mt-1 text-[13.5px] leading-relaxed text-ink">{sol.finalAnswer}</p>
              </div>
            ) : null}
          </div>
        )}

        {/* Multi-turn tutoring (#8.2) — ask which formula, question a step, request a redo. */}
        {doc.status === "READY" ? (
          <div className="mt-5 rounded-2xl border border-line bg-card p-5">
            <h2 className="font-display text-[15px] font-semibold text-ink">Ask the tutor</h2>
            <p className="mb-3 mt-0.5 text-[12.5px] text-muted">
              Not sure about a step or formula? Ask — if your feedback changes the answer, the solution &
              download update too.
            </p>

            {sol.conversation && sol.conversation.length > 0 ? (
              <div className="mb-3 space-y-2.5">
                {sol.conversation.map((t, i) => (
                  <div key={i} className={t.speaker === "student" ? "flex justify-end" : "flex justify-start"}>
                    <div
                      className={
                        t.speaker === "student"
                          ? "max-w-[85%] rounded-2xl rounded-br-sm bg-accent-gradient px-3.5 py-2.5 text-[13px] text-on-accent"
                          : "max-w-[85%] whitespace-pre-line rounded-2xl rounded-bl-sm border border-line bg-surface px-3.5 py-2.5 text-[13px] text-soft"
                      }
                    >
                      {t.content}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            <form action={askAssignmentAction} className="flex items-end gap-2">
              <input type="hidden" name="docId" value={doc.id} />
              <textarea
                name="message"
                required
                rows={2}
                placeholder="e.g. Should I use the quadratic formula here? / Redo step 3, I think it's wrong."
                className="flex-1 resize-none rounded-xl border border-line-strong bg-surface px-3.5 py-2.5 text-[13.5px] text-ink outline-none transition-colors focus:border-cyan/50 placeholder:text-faint"
              />
              <button
                type="submit"
                className="shrink-0 rounded-xl bg-accent-gradient px-4 py-2.5 text-[13.5px] font-semibold text-on-accent shadow-[0_6px_18px_rgba(34,211,238,0.3)] transition-transform hover:-translate-y-0.5"
              >
                Send
              </button>
            </form>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}

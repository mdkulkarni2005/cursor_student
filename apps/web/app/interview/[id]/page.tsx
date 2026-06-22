import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { requireOnboardedUser, shellUserFrom } from "@/lib/user";
import { getInterview } from "@/lib/interview/generate";
import { InterviewActive } from "@/components/interview/interview-active";

const ROUND_LABEL: Record<string, string> = { technical: "Technical", behavioral: "Behavioral", coding: "Coding / DSA" };

function scoreColor(n: number) {
  return n >= 75 ? "text-success bg-success/12" : n >= 50 ? "text-warning bg-warning/12" : "text-danger bg-danger/12";
}

export default async function InterviewSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireOnboardedUser();
  const loaded = await getInterview(user.id, id);
  if (!loaded) notFound();

  const { state } = loaded;
  const answered = state.transcript.filter((t) => t.speaker === "candidate").length;
  const lastTurn = state.transcript[state.transcript.length - 1];
  const awaitingAnswer = state.phase === "active" && lastTurn?.speaker === "interviewer";
  const isRunnable = lastTurn?.runnable === true;
  const ev = state.evaluation;

  return (
    <AppShell user={shellUserFrom(user)}>
      <div className="mx-auto max-w-[780px]">
        <Link href="/interview" className="text-[13px] text-muted transition-colors hover:text-soft">← All interviews</Link>

        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-[24px] font-bold leading-tight text-ink">{loaded.title}</h1>
            <p className="mt-1 text-[13px] text-faint">
              {state.config.rounds.map((r) => ROUND_LABEL[r]).join(" · ")} ·{" "}
              {state.phase === "complete" ? "Completed" : `Question ${Math.min(answered + 1, state.questionPlan.length)} of ${state.questionPlan.length}`}
            </p>
          </div>
        </div>

        {/* Transcript */}
        <div className="mt-6 space-y-3">
          {state.transcript.map((t, i) => (
            <div key={i} className={t.speaker === "interviewer" ? "flex justify-start" : "flex justify-end"}>
              <div
                className={
                  t.speaker === "interviewer"
                    ? "max-w-[88%] rounded-2xl rounded-bl-sm border border-line bg-card px-4 py-3"
                    : "max-w-[88%] rounded-2xl rounded-br-sm bg-accent-gradient px-4 py-3 text-on-accent"
                }
              >
                {t.speaker === "interviewer" ? (
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-faint">
                    Interviewer{t.round ? ` · ${ROUND_LABEL[t.round]}` : ""}
                  </p>
                ) : null}
                <p className={`whitespace-pre-wrap text-[13.5px] leading-relaxed ${t.speaker === "interviewer" ? "text-soft" : ""} ${t.kind === "answer" && t.language ? "font-mono text-[12px]" : ""}`}>
                  {t.content}
                </p>
                {t.speaker === "candidate" && t.runOutput ? (
                  <div className="mt-2 rounded-lg bg-black/25 p-2 font-mono text-[11px] text-soft/90">
                    <span className="text-[9px] font-semibold uppercase tracking-wide text-faint">Ran ({t.language})</span>
                    <pre className="mt-1 whitespace-pre-wrap">{t.runOutput}</pre>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        {/* Answer area: live voice OR typed; coding questions get the editor, verbal get the answer box. */}
        {awaitingAnswer ? (
          <InterviewActive
            docId={id}
            isLast={answered + 1 >= state.questionPlan.length}
            view={{
              phase: "active",
              question: lastTurn?.content ?? "",
              kind: (lastTurn?.kind ?? "question") as "question" | "coding" | "answer",
              runnable: isRunnable,
              answered,
              total: state.questionPlan.length,
              evaluation: null,
            }}
          />
        ) : null}

        {/* Evaluation report */}
        {state.phase === "complete" && ev ? (
          <div className="mt-6 rounded-2xl border border-line bg-card p-6">
            <div className="flex items-center gap-4">
              <div className={`flex size-16 items-center justify-center rounded-full text-[22px] font-bold ${scoreColor(ev.overall)}`}>{ev.overall}</div>
              <div>
                <h2 className="font-display text-[16px] font-semibold text-ink">Evaluation</h2>
                <p className="text-[13px] text-muted">{ev.verdict}</p>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              {ev.areas.map((a, i) => (
                <div key={i} className="rounded-xl border border-line bg-surface/40 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-ink">{a.name}</p>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${scoreColor(a.score)}`}>{a.score}</span>
                  </div>
                  <p className="mt-1 text-[12.5px] text-soft">{a.notes}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {ev.strengths.length > 0 ? (
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-faint">Strengths</p>
                  <ul className="space-y-1">
                    {ev.strengths.map((s, i) => (
                      <li key={i} className="flex gap-1.5 text-[12.5px] text-soft"><span className="text-success">✓</span>{s}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {ev.improvements.length > 0 ? (
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-faint">Where to improve</p>
                  <ul className="space-y-1">
                    {ev.improvements.map((s, i) => (
                      <li key={i} className="flex gap-1.5 text-[12.5px] text-soft"><span className="text-cyan">→</span>{s}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            <Link href="/interview" className="mt-5 inline-block rounded-xl border border-line-strong bg-surface px-4 py-2 text-[13px] font-semibold text-soft transition-colors hover:border-cyan/40 hover:text-cyan">
              Practice again →
            </Link>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}

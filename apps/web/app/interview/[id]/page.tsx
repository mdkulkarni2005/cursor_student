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
    <AppShell user={await shellUserFrom(user)}>
      <div className={`mx-auto ${state.phase === "complete" && ev ? "max-w-[1000px]" : "max-w-[780px]"}`}>
        <Link href="/interview" className="text-[13px] text-muted transition-colors hover:text-cyan">← All interviews</Link>

        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-[24px] font-bold leading-tight text-ink">{loaded.title}</h1>
            <p className="mt-1 text-[13px] text-faint">
              {state.config.rounds.map((r) => ROUND_LABEL[r]).join(" · ")} ·{" "}
              {state.phase === "complete" ? "Completed" : "In progress"}
            </p>
          </div>
        </div>

        {/* Transcript — only shown AFTER the interview ends. During a live interview the
            questions are spoken (you listen, like a real interview), not displayed as text. */}
        {state.phase === "complete" ? (
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
        ) : null}

        {/* Answer area: live voice (VAPI assistant) OR typed fallback. */}
        {awaitingAnswer ? (
          <InterviewActive
            docId={id}
            isLast={answered + 1 >= state.questionPlan.length}
            view={{
              question: lastTurn?.content ?? "",
              kind: (lastTurn?.kind ?? "question") as "question" | "coding" | "answer",
              runnable: isRunnable,
            }}
            live={{
              role: state.config.role,
              candidateName: user.name ?? "",
              questions: state.questions ?? [],
            }}
          />
        ) : null}

        {/* Evaluation report */}
        {state.phase === "complete" && ev ? (
          <div className="mt-6 space-y-6">
            {/* Score header */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-card p-6">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-cyan">Evaluation Report</p>
                <h2 className="font-display text-[22px] font-bold text-ink">{state.config.role || loaded.title}</h2>
                <p className="mt-1 text-[13.5px] text-muted">{ev.verdict}</p>
              </div>
              <div className={`flex size-[82px] flex-col items-center justify-center rounded-2xl ${scoreColor(ev.overall)}`}>
                <span className="font-display text-[30px] font-bold leading-none">{ev.overall}</span>
                <span className="text-[10px] font-semibold uppercase opacity-80">/ 100</span>
              </div>
            </div>

            {/* Proficiency bars */}
            <div className="rounded-2xl border border-line bg-card p-6">
              <h3 className="mb-5 font-display text-[16px] font-semibold text-ink">Performance Breakdown</h3>
              <div className="grid grid-cols-1 gap-x-10 gap-y-5 sm:grid-cols-2">
                {ev.areas.map((a, i) => {
                  const tone = a.score >= 75 ? "bg-success" : a.score >= 50 ? "bg-warning" : "bg-danger";
                  return (
                    <div key={i}>
                      <div className="mb-1.5 flex items-center justify-between text-[13px]">
                        <span className="font-medium text-soft">{a.name}</span>
                        <span className="font-bold text-ink">{a.score}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-surface">
                        <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.min(100, a.score)}%` }} />
                      </div>
                      {a.notes ? <p className="mt-1.5 text-[12px] leading-relaxed text-muted">{a.notes}</p> : null}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Improvement roadmap */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {ev.strengths.length > 0 ? (
                <div className="rounded-2xl border border-line bg-card p-6">
                  <h3 className="mb-3 flex items-center gap-2 font-display text-[15px] font-semibold text-ink"><span className="text-success">✓</span> Strengths</h3>
                  <ul className="space-y-2">
                    {ev.strengths.map((s, i) => (<li key={i} className="flex gap-2 text-[13px] text-soft"><span className="mt-0.5 text-success">•</span>{s}</li>))}
                  </ul>
                </div>
              ) : null}
              {ev.improvements.length > 0 ? (
                <div className="rounded-2xl border border-cyan/25 bg-cyan/[0.05] p-6">
                  <h3 className="mb-3 flex items-center gap-2 font-display text-[15px] font-semibold text-ink"><span className="text-cyan">✦</span> Personalized Improvement Roadmap</h3>
                  <ul className="space-y-2">
                    {ev.improvements.map((s, i) => (<li key={i} className="flex gap-2 text-[13px] text-soft"><span className="mt-0.5 text-cyan">→</span>{s}</li>))}
                  </ul>
                </div>
              ) : null}
            </div>

            <Link href="/interview" className="inline-block rounded-xl bg-cyan px-5 py-2.5 text-[13.5px] font-semibold text-on-accent transition-transform hover:-translate-y-0.5">Practice again →</Link>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}

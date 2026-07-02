"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { suggestResumeOptimizationsAction, applyResumeOptimizationAction, claimKeywordsAction, rescoreResumeAction } from "@/lib/actions/resume";
import type { ResumeOptimization, ResumeEditPayload, UnclaimedKeyword } from "@/lib/resume/optimize";
import { METRIC_TOKEN } from "@/lib/resume/optimize-shared";

type Card = ResumeOptimization & { state: "idle" | "applying" | "done" | "error"; msg?: string; metricValues: string[] };

function afterText(edit: ResumeEditPayload): string {
  if (edit.kind === "skills") return edit.after.map((g) => `${g.category}: ${g.items.join(", ")}`).join(" | ");
  return edit.after;
}
function beforeText(edit: ResumeEditPayload): string {
  if (edit.kind === "skills") return edit.before.map((g) => `${g.category}: ${g.items.join(", ")}`).join(" | ") || "(none)";
  return edit.before || "(empty)";
}
function resolveEdits(edits: ResumeEditPayload[], metricValues: string[]): ResumeEditPayload[] {
  return edits.map((edit, i) =>
    edit.kind === "bullet" && edit.after.includes(METRIC_TOKEN) ? { ...edit, after: edit.after.replaceAll(METRIC_TOKEN, metricValues[i] || "") } : edit,
  );
}

function jumpToContactFields() {
  const el = document.getElementById("resume-contact-phone");
  el?.scrollIntoView({ behavior: "smooth", block: "center" });
  (el as HTMLInputElement | null)?.focus();
}

/**
 * "Find improvements" → the AI proposes targeted, pre-verified rewrites (each group already proven,
 * by simulation, to raise the real ATS score). Each card is an Approve/Skip unit with a before/after
 * diff per field; only Approve persists and re-renders the resume. Skip costs nothing.
 *
 * Two gaps the AI is never allowed to close on its own — missing keywords not evidenced anywhere in
 * the resume, and contact info — are surfaced separately: a self-tick checklist (the student is the
 * source of truth on their own skills) and a plain callout pointing at the manual contact fields.
 */
export function ResumeOptimizer({ docId, targetRole, jobDescription }: { docId: string; targetRole?: string; jobDescription?: string }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [cards, setCards] = useState<Card[]>([]);
  const [keywords, setKeywords] = useState<UnclaimedKeyword[]>([]);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [claiming, setClaiming] = useState(false);
  const [contactGap, setContactGap] = useState<{ points: number } | null>(null);
  const [scores, setScores] = useState<{ current: number; potential: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, startLoad] = useTransition();
  const [role, setRole] = useState(targetRole ?? "");
  const [jd, setJd] = useState(jobDescription ?? "");

  function suggest() {
    setError(null);
    startLoad(async () => {
      if (role.trim() || jd.trim()) {
        const fd = new FormData();
        fd.set("docId", docId);
        fd.set("targetRole", role);
        fd.set("jobDescription", jd);
        await rescoreResumeAction(fd);
      }
      const res = await suggestResumeOptimizationsAction(docId);
      if (res.error) { setError(res.error); return; }
      setReady(true);
      setScores({ current: res.currentScore, potential: res.potentialScore });
      setCards(res.suggestions.map((s) => ({ ...s, state: "idle" as const, metricValues: s.edits.map(() => "") })));
      setKeywords(res.unclaimedKeywords);
      setChecked(new Set());
      setContactGap(res.contactGap);
    });
  }

  function patch(id: string, p: Partial<Card>) {
    setCards((cs) => cs.map((c) => (c.id === id ? { ...c, ...p } : c)));
  }
  function setMetric(id: string, i: number, value: string) {
    setCards((cs) => cs.map((c) => (c.id === id ? { ...c, metricValues: c.metricValues.map((v, idx) => (idx === i ? value : v)) } : c)));
  }
  function skip(id: string) {
    setCards((cs) => cs.filter((c) => c.id !== id));
  }
  async function approve(card: Card) {
    patch(card.id, { state: "applying", msg: undefined });
    const edits = resolveEdits(card.edits, card.metricValues);
    const res = await applyResumeOptimizationAction(docId, edits);
    if (res.ok) {
      patch(card.id, { state: "done" });
      if (res.score !== undefined) setScores((s) => (s ? { ...s, current: res.score! } : s));
      router.refresh();
    } else {
      patch(card.id, { state: "error", msg: res.error });
    }
  }

  function missingMetrics(c: Card): boolean {
    return c.edits.some((e, i) => e.kind === "bullet" && e.after.includes(METRIC_TOKEN) && !c.metricValues[i]?.trim());
  }

  function toggleKeyword(k: string) {
    setChecked((s) => {
      const next = new Set(s);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });
  }
  async function claimSelected() {
    if (checked.size === 0) return;
    setClaiming(true);
    const list = [...checked];
    const res = await claimKeywordsAction(docId, list);
    setClaiming(false);
    if (res.ok) {
      setKeywords((ks) => ks.filter((k) => !checked.has(k.keyword)));
      setChecked(new Set());
      if (res.score !== undefined) setScores((s) => (s ? { ...s, current: res.score! } : s));
      router.refresh();
    } else {
      setError(res.error ?? "Couldn't add those skills right now.");
    }
  }

  const nothingLeft = ready && cards.length === 0 && keywords.length === 0 && !contactGap;

  return (
    <div className="rounded-2xl border border-teal/25 bg-teal/[0.06] p-5">
      <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-teal">Optimize</p>
      <p className="mb-3 text-[13px] leading-relaxed text-soft">
        Find concrete, ATS-checked improvements — each one is proven to raise your real score before it&apos;s shown. Approve the ones you want.
      </p>

      <details className="mb-3 text-[12.5px] text-teal">
        <summary className="cursor-pointer font-semibold">Target a specific role / job ↓</summary>
        <div className="mt-3 space-y-2">
          <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Target role (e.g. Backend Engineer)" className="w-full rounded-lg border border-line bg-card px-3 py-2 text-[13px] text-ink outline-none focus:border-teal/50" />
          <textarea value={jd} onChange={(e) => setJd(e.target.value)} rows={3} placeholder="Or paste the job description…" className="w-full resize-none rounded-lg border border-line bg-card px-3 py-2 text-[13px] text-ink outline-none focus:border-teal/50" />
        </div>
      </details>

      {!ready ? (
        <button onClick={suggest} disabled={loading} className="w-full rounded-xl bg-teal py-2.5 text-[13px] font-semibold text-white disabled:opacity-60">
          {loading ? "Finding improvements…" : "✦ Find improvements"}
        </button>
      ) : (
        <>
          {scores ? (
            <p className="mb-3 text-[12.5px] font-semibold text-teal">
              Score {scores.current} / 100
              {scores.potential > scores.current ? ` · +${scores.potential - scores.current} pts available below` : ""}
            </p>
          ) : null}

          {nothingLeft ? (
            <p className="rounded-lg border border-dashed border-line bg-surface/50 px-3 py-3 text-center text-[12.5px] text-muted">
              Nothing left to fix — your ATS checks already pass. 🎉
            </p>
          ) : (
            <div className="space-y-2.5">
              {contactGap ? (
                <div className="rounded-xl border border-warning/30 bg-warning/10 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[12.5px] font-semibold text-ink">Contact info incomplete</p>
                    <span className="shrink-0 rounded-full bg-success/12 px-2 py-0.5 text-[11px] font-bold text-success">+{contactGap.points} pts</span>
                  </div>
                  <p className="mt-1 text-[12px] text-soft">
                    Add your phone and LinkedIn/GitHub below — we can&apos;t invent these for you, but they&apos;re quick to fill in.
                  </p>
                  <button onClick={jumpToContactFields} className="mt-2 rounded-lg border border-line px-3 py-1.5 text-[12px] font-semibold text-teal hover:underline">
                    Jump to Personal Information ↓
                  </button>
                </div>
              ) : null}

              {keywords.length > 0 ? (
                <div className="rounded-xl border border-line p-3">
                  <p className="text-[12.5px] font-semibold text-ink">Confirm skills you actually have</p>
                  <p className="mt-0.5 text-[12px] text-muted">
                    These keywords are missing from your resume. We won&apos;t add anything you don&apos;t tick — you&apos;re the one confirming it&apos;s true.
                  </p>
                  <div className="mt-2 space-y-1.5">
                    {keywords.map((k) => (
                      <label key={k.keyword} className="flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-line/60 px-2.5 py-1.5 hover:border-teal/40">
                        <span className="flex items-center gap-2 text-[12.5px] text-soft">
                          <input type="checkbox" checked={checked.has(k.keyword)} onChange={() => toggleKeyword(k.keyword)} />
                          {k.keyword}
                        </span>
                        <span className="shrink-0 text-[11px] font-bold text-success">+{k.points} pts</span>
                      </label>
                    ))}
                  </div>
                  <button
                    onClick={claimSelected}
                    disabled={checked.size === 0 || claiming}
                    className="mt-2 rounded-lg bg-accent-gradient px-3 py-1.5 text-[12px] font-semibold text-on-accent shadow-[0_4px_14px_rgba(79,70,229,0.3)] disabled:opacity-60"
                  >
                    {claiming ? "Adding…" : `✦ Add ${checked.size || ""} checked skill${checked.size === 1 ? "" : "s"}`.trim()}
                  </button>
                </div>
              ) : null}

              {cards.map((c) => (
                <div key={c.id} className="rounded-xl border border-line p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[12.5px] font-semibold text-ink">{c.checkLabel}</p>
                    <span className="shrink-0 rounded-full bg-success/12 px-2 py-0.5 text-[11px] font-bold text-success">+{c.delta} pts</span>
                  </div>

                  {c.state === "done" ? (
                    <p className="mt-2 text-[12px] font-semibold text-success">✓ Applied</p>
                  ) : (
                    <>
                      <div className="mt-1.5 space-y-2">
                        {c.edits.map((e, i) => (
                          <div key={i} className="border-t border-line/60 pt-1.5 first:border-t-0 first:pt-0">
                            <p className="text-[12px] text-faint line-through">{beforeText(e)}</p>
                            <p className="mt-0.5 text-[12.5px] text-soft">{afterText(e).replaceAll(METRIC_TOKEN, "＿＿")}</p>
                            {e.kind === "bullet" && e.after.includes(METRIC_TOKEN) ? (
                              <input
                                value={c.metricValues[i] ?? ""}
                                onChange={(ev) => setMetric(c.id, i, ev.target.value)}
                                placeholder="Real number/metric (e.g. 30%, 500 users)"
                                className="mt-1 w-full rounded-lg border border-line bg-card px-2.5 py-1.5 text-[12px] text-ink outline-none focus:border-teal/50"
                              />
                            ) : null}
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          onClick={() => approve(c)}
                          disabled={c.state === "applying" || missingMetrics(c)}
                          className="rounded-lg bg-accent-gradient px-3 py-1.5 text-[12px] font-semibold text-on-accent shadow-[0_4px_14px_rgba(79,70,229,0.3)] disabled:opacity-60"
                        >
                          {c.state === "applying" ? "Applying…" : "✦ Approve"}
                        </button>
                        {c.state !== "applying" ? (
                          <button onClick={() => skip(c.id)} className="rounded-lg border border-line px-3 py-1.5 text-[12px] font-semibold text-muted hover:text-soft">Skip</button>
                        ) : null}
                        {c.state === "error" ? <span className="text-[11.5px] text-warning">{c.msg}</span> : null}
                      </div>
                    </>
                  )}
                </div>
              ))}
              <button onClick={suggest} disabled={loading} className="w-full pt-1 text-[12px] font-semibold text-teal hover:underline disabled:opacity-60">
                {loading ? "…" : "↻ Refresh"}
              </button>
            </div>
          )}
        </>
      )}
      {error ? <p className="mt-2 text-[12px] text-warning">{error}</p> : null}
    </div>
  );
}

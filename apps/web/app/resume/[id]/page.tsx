import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@studentos/db";
import type { Resume } from "@studentos/documents";
import { AppShell } from "@/components/app-shell";
import { requireOnboardedUser, shellUserFrom } from "@/lib/user";
import { toggleResumeDensityAction, rescoreResumeAction } from "@/lib/actions/resume";
import type { ResumeMeta } from "@/lib/resume/generate";
import { RESUME_STAGES } from "@/lib/resume/generate";
import { ResumeEditor } from "@/components/resume/resume-editor";
import { GeneratingPoller } from "@/components/reports/generating-poller";
import { DeleteDocButton } from "@/components/delete-doc-button";
import { stageOf } from "@/lib/jobs";

function ContactLine({ c }: { c: Resume["contact"] }) {
  const bits = [c.phone, c.email, c.location, c.linkedin, c.github, c.portfolio].filter(Boolean);
  return <p className="text-center text-[12px] text-muted">{bits.join("  |  ")}</p>;
}

function Entry({
  left,
  right,
  sub,
  subRight,
  bullets,
  link,
}: {
  left: string;
  right?: string;
  sub?: string;
  subRight?: string;
  bullets?: string[];
  link?: string;
}) {
  return (
    <div className="mb-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[13.5px] font-semibold text-ink">{left}</p>
        {right ? <p className="shrink-0 text-[12px] text-faint">{right}</p> : null}
      </div>
      {sub || subRight ? (
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[12.5px] italic text-soft">{sub}</p>
          {subRight ? <p className="shrink-0 text-[12px] italic text-faint">{subRight}</p> : null}
        </div>
      ) : null}
      {bullets && bullets.length > 0 ? (
        <ul className="mt-1 space-y-0.5">
          {bullets.map((b, i) => (
            <li key={i} className="flex gap-1.5 text-[12.5px] text-soft">
              <span className="text-cyan">•</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {link ? <p className="mt-0.5 text-[12px] italic text-cyan">{link}</p> : null}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h2 className="mb-2 border-b border-line pb-1 font-display text-[13px] font-bold uppercase tracking-wide text-ink">
        {title}
      </h2>
      {children}
    </div>
  );
}

export default async function ResumeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireOnboardedUser();

  const doc = await prisma.document.findFirst({
    where: { id, ownerId: user.id, type: "RESUME" },
    include: { content: true, exports: true, job: true },
  });
  if (!doc) notFound();

  const r = (doc.content?.data ?? null) as Resume | null;
  const meta = (doc.quality ?? { density: "normal" }) as ResumeMeta;
  const density = meta.density ?? "normal";
  const ats = meta.ats ?? null;
  const hasExport = doc.exports.some((e) => e.format === "DOCX");

  // While generating in the background, show live progress instead of an empty resume.
  if (doc.status === "GENERATING") {
    return (
      <AppShell user={shellUserFrom(user)}>
        <div className="mx-auto max-w-[860px]">
          <Link href="/resume" className="text-[13px] text-muted transition-colors hover:text-soft">
            ← All resumes
          </Link>
          <h1 className="mt-3 font-display text-[24px] font-bold leading-tight text-ink">{doc.title}</h1>
          <GeneratingPoller stages={RESUME_STAGES} current={stageOf(doc.job?.pending)} />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell user={shellUserFrom(user)}>
      <div className="mx-auto max-w-[860px]">
        <Link href="/resume" className="text-[13px] text-muted transition-colors hover:text-soft">
          ← All resumes
        </Link>

        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-[24px] font-bold leading-tight text-ink">{doc.title}</h1>
            <p className="mt-1 text-[13px] text-faint">
              ATS format · {density === "tight" ? "one-page" : "standard"} ·{" "}
              {new Date(doc.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {doc.status === "READY" && hasExport ? (
              <>
                <form action={toggleResumeDensityAction}>
                  <input type="hidden" name="docId" value={doc.id} />
                  <input type="hidden" name="density" value={density === "tight" ? "normal" : "tight"} />
                  <button
                    type="submit"
                    className="rounded-xl border border-cyan/35 bg-cyan/10 px-3.5 py-2.5 text-[13px] font-semibold text-cyan transition-colors hover:bg-cyan/20"
                  >
                    {density === "tight" ? "Standard spacing" : "Fit to one page"}
                  </button>
                </form>
                <a
                  href={`/resume/${doc.id}/download`}
                  className="rounded-xl bg-accent-gradient px-4 py-2.5 text-[13.5px] font-semibold text-on-accent shadow-[0_6px_18px_rgba(34,211,238,0.3)] transition-transform hover:-translate-y-0.5"
                >
                  Download DOCX
                </a>
                <a
                  href={`/resume/${doc.id}/download/pdf`}
                  className="rounded-xl border border-line-strong bg-surface px-4 py-2.5 text-[13.5px] font-semibold text-soft transition-colors hover:border-cyan/40 hover:text-cyan"
                >
                  PDF
                </a>
              </>
            ) : null}
            <DeleteDocButton docId={doc.id} kind="resume" />
          </div>
        </div>

        {ats ? (
          <div className="mt-6 rounded-2xl border border-line bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`flex size-14 shrink-0 flex-col items-center justify-center rounded-full text-[18px] font-bold ${
                    ats.score >= 75 ? "bg-success/15 text-success" : ats.score >= 50 ? "bg-warning/15 text-warning" : "bg-danger/15 text-danger"
                  }`}
                >
                  {ats.score}
                </div>
                <div>
                  <p className="font-display text-[15px] font-semibold text-ink">ATS score</p>
                  <p className="text-[12.5px] text-muted">
                    Keyword match {ats.keywordCoverage}% {meta.targetRole ? `· vs ${meta.targetRole}` : ""}
                  </p>
                </div>
              </div>
              <details className="text-[12.5px] text-cyan">
                <summary className="cursor-pointer font-semibold">Target a specific role / job ↓</summary>
                <form action={rescoreResumeAction} className="mt-3 w-[300px] max-w-full space-y-2">
                  <input type="hidden" name="docId" value={doc.id} />
                  <input
                    name="targetRole"
                    defaultValue={meta.targetRole}
                    placeholder="Target role (e.g. Backend Engineer)"
                    className="w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-[13px] text-ink outline-none focus:border-cyan/50"
                  />
                  <textarea
                    name="jobDescription"
                    rows={4}
                    defaultValue={meta.jobDescription}
                    placeholder="Or paste the job description to score against it…"
                    className="w-full resize-none rounded-lg border border-line-strong bg-surface px-3 py-2 text-[13px] text-ink outline-none focus:border-cyan/50"
                  />
                  <button type="submit" className="rounded-lg bg-accent-gradient px-3.5 py-2 text-[12.5px] font-semibold text-on-accent">
                    Re-score →
                  </button>
                </form>
              </details>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-faint">Checks</p>
                <ul className="space-y-1">
                  {ats.checks.map((c, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-[12.5px] text-soft">
                      <span className={c.ok ? "text-success" : "text-danger"}>{c.ok ? "✓" : "✗"}</span>
                      <span>
                        {c.label}
                        {c.detail ? <span className="text-faint"> — {c.detail}</span> : null}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                {ats.missing.length > 0 ? (
                  <>
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-faint">Missing keywords</p>
                    <div className="mb-3 flex flex-wrap gap-1.5">
                      {ats.missing.slice(0, 10).map((k) => (
                        <span key={k} className="rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 text-[11.5px] text-warning">
                          {k}
                        </span>
                      ))}
                    </div>
                  </>
                ) : null}
                {ats.suggestions.length > 0 ? (
                  <>
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-faint">Suggestions</p>
                    <ul className="space-y-1">
                      {ats.suggestions.map((s, i) => (
                        <li key={i} className="flex gap-1.5 text-[12.5px] text-soft">
                          <span className="text-cyan">→</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {doc.status === "FAILED" ? (
          <div className="mt-6 rounded-xl border border-danger/25 bg-danger/10 p-4 text-[13.5px] text-danger">
            Generation failed: {doc.job?.error ?? "unknown error"}. Try generating again.
          </div>
        ) : r ? (
          <div className="mt-6 rounded-2xl border border-line bg-card p-7">
            <h2 className="text-center font-display text-[22px] font-bold tracking-wide text-ink">
              {r.contact.name.toUpperCase()}
            </h2>
            <div className="mb-5 mt-1">
              <ContactLine c={r.contact} />
            </div>

            {r.summary ? (
              <Section title="Professional Summary">
                <p className="text-[12.5px] leading-relaxed text-soft">{r.summary}</p>
              </Section>
            ) : null}

            {r.skills.length > 0 ? (
              <Section title="Skills">
                {r.skills.map((g, i) => (
                  <p key={i} className="mb-0.5 text-[12.5px] text-soft">
                    <span className="font-semibold text-ink">{g.category}:</span> {g.items.join(", ")}
                  </p>
                ))}
              </Section>
            ) : null}

            {r.experience.length > 0 ? (
              <Section title="Professional Experience">
                {r.experience.map((e, i) => (
                  <Entry
                    key={i}
                    left={e.organization}
                    right={[e.dates?.start, e.dates?.end].filter(Boolean).join(" - ")}
                    sub={e.role}
                    subRight={e.location}
                    bullets={e.bullets}
                  />
                ))}
              </Section>
            ) : null}

            {r.projects.length > 0 ? (
              <Section title="Projects & Outside Experience">
                {r.projects.map((p, i) => (
                  <Entry
                    key={i}
                    left={p.name}
                    right={[p.dates?.start, p.dates?.end].filter(Boolean).join(" - ")}
                    sub={p.role}
                    subRight={p.location}
                    bullets={p.bullets}
                    link={p.link ? "Link to project" : undefined}
                  />
                ))}
              </Section>
            ) : null}

            {r.education.length > 0 ? (
              <Section title="Education">
                {r.education.map((ed, i) => (
                  <Entry
                    key={i}
                    left={ed.institution}
                    right={[ed.dates?.start, ed.dates?.end].filter(Boolean).join(" - ")}
                    sub={ed.degree}
                    subRight={ed.location}
                  />
                ))}
              </Section>
            ) : null}
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-line bg-card p-6 text-[13.5px] text-muted">
            Generating your resume…
          </div>
        )}

        {r ? (
          <details open className="mt-5 rounded-2xl border border-line bg-card p-5">
            <summary className="cursor-pointer font-display text-[15px] font-semibold text-ink">
              Edit resume content
            </summary>
            <p className="mb-4 mt-1 text-[12.5px] text-muted">
              Edit any field below — saving re-renders the Word file in your locked format (font, spacing &amp; layout stay fixed, so it can&apos;t break) and re-scores ATS.
            </p>
            <ResumeEditor docId={doc.id} resume={r} />
          </details>
        ) : null}
      </div>
    </AppShell>
  );
}

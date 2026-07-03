import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@studentos/db";
import type { Resume } from "@studentos/documents";
import { AppShell } from "@/components/app-shell";
import { requireOnboardedUser, shellUserFrom } from "@/lib/user";
import { toggleResumeDensityAction } from "@/lib/actions/resume";
import type { ResumeMeta } from "@/lib/resume/generate";
import { RESUME_STAGES } from "@/lib/resume/generate";
import { ResumeEditor } from "@/components/resume/resume-editor";
import { ResumeOptimizer } from "@/components/resume/resume-optimizer";
import { GeneratingPoller } from "@/components/reports/generating-poller";
import { DeleteDocButton } from "@/components/delete-doc-button";
import { SubmitButton } from "@/components/ui/button";
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
      <AppShell user={await shellUserFrom(user)}>
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

  const score = ats?.score ?? (r ? completenessScore(r) : 0);
  const scoreTone = score >= 75 ? "text-success" : score >= 50 ? "text-warning" : "text-danger";

  return (
    <AppShell user={await shellUserFrom(user)}>
      <div className="mx-auto max-w-[1180px]">
        {/* Top bar */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <Link href="/resume" className="text-[12.5px] text-muted transition-colors hover:text-cyan">← All resumes</Link>
            <h1 className="mt-1 font-display text-[22px] font-bold leading-tight text-ink">{doc.title}</h1>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {doc.status === "READY" && hasExport ? (
              <>
                <form action={toggleResumeDensityAction}>
                  <input type="hidden" name="docId" value={doc.id} />
                  <input type="hidden" name="density" value={density === "tight" ? "normal" : "tight"} />
                  <SubmitButton className="rounded-xl border border-line bg-card px-3.5 py-2.5 text-[13px] font-semibold text-soft transition-colors hover:border-cyan/40 hover:text-cyan disabled:opacity-60">
                    {density === "tight" ? "Standard spacing" : "Fit to one page"}
                  </SubmitButton>
                </form>
                <a href={`/resume/${doc.id}/download/pdf`} className="flex items-center gap-1.5 rounded-xl bg-cyan px-4 py-2.5 text-[13.5px] font-semibold text-on-accent transition-transform hover:-translate-y-0.5">
                  ⬇ Download PDF
                </a>
                <a href={`/resume/${doc.id}/download`} className="rounded-xl border border-line bg-card px-4 py-2.5 text-[13.5px] font-semibold text-soft transition-colors hover:border-cyan/40 hover:text-cyan">
                  DOCX
                </a>
              </>
            ) : null}
            <DeleteDocButton docId={doc.id} kind="resume" />
          </div>
        </div>

        {doc.status === "FAILED" ? (
          <div className="rounded-xl border border-danger/25 bg-danger/10 p-4 text-[13.5px] text-danger">
            Generation failed: {doc.job?.error ?? "unknown error"}. Try generating again.
          </div>
        ) : !r ? (
          <div className="rounded-xl border border-line bg-card p-6 text-[13.5px] text-muted">Generating your resume…</div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,440px)_1fr]">
            {/* LEFT — editor rail */}
            <div className="space-y-5">
              {/* tabs */}
              <div className="flex gap-6 border-b border-line text-[14px]">
                <span className="-mb-px border-b-2 border-cyan pb-2.5 font-semibold text-cyan">Editor</span>
                <span className="pb-2.5 text-muted">Templates</span>
                <span className="pb-2.5 text-muted">History</span>
              </div>

              {/* Resume score */}
              <div className="rounded-2xl border border-line bg-card p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-display text-[15px] font-semibold text-ink">Resume Score</h2>
                    <p className="mt-0.5 text-[12.5px] text-muted">
                      {ats ? `Keyword match ${ats.keywordCoverage}%${meta.targetRole ? ` · vs ${meta.targetRole}` : ""}` : "Based on section completeness."}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`font-display text-[34px] font-bold leading-none ${scoreTone}`}>{score}</span>
                    <span className="text-[13px] text-muted"> / 100</span>
                  </div>
                </div>
                {ats && ats.missing.length > 0 ? (
                  <div className="mt-3 rounded-lg bg-warning/10 px-3 py-2 text-[12px] text-warning">
                    ⚡ Missing {ats.missing.length} high-impact keyword{ats.missing.length === 1 ? "" : "s"}: {ats.missing.slice(0, 4).join(", ")}
                  </div>
                ) : null}
              </div>

              {/* Optimize */}
              <ResumeOptimizer docId={doc.id} targetRole={meta.targetRole} jobDescription={meta.jobDescription} />

              {/* Editor form */}
              <div className="rounded-2xl border border-line bg-card p-5">
                <p className="mb-4 text-[12.5px] text-muted">
                  Edit any field — saving re-renders the Word file in your locked format and re-scores ATS.
                </p>
                <ResumeEditor docId={doc.id} resume={r} />
              </div>
            </div>

            {/* RIGHT — live A4 preview */}
            <div className="rounded-2xl border border-line bg-surface p-4 sm:p-8">
              <div className="mx-auto max-w-[640px] rounded-lg border border-line bg-white p-8 shadow-[0_10px_40px_rgba(15,23,42,0.10)]">
                <h2 className="text-center font-display text-[22px] font-bold tracking-wide text-ink">{r.contact.name.toUpperCase()}</h2>
                <div className="mb-5 mt-1"><ContactLine c={r.contact} /></div>

                {r.summary ? (
                  <Section title="Professional Summary"><p className="text-[12.5px] leading-relaxed text-soft">{r.summary}</p></Section>
                ) : null}
                {r.skills.length > 0 ? (
                  <Section title="Skills">
                    {r.skills.map((g, i) => (
                      <p key={i} className="mb-0.5 text-[12.5px] text-soft"><span className="font-semibold text-ink">{g.category}:</span> {g.items.join(", ")}</p>
                    ))}
                  </Section>
                ) : null}
                {r.experience.length > 0 ? (
                  <Section title="Professional Experience">
                    {r.experience.map((e, i) => (
                      <Entry key={i} left={e.organization} right={[e.dates?.start, e.dates?.end].filter(Boolean).join(" - ")} sub={e.role} subRight={e.location} bullets={e.bullets} />
                    ))}
                  </Section>
                ) : null}
                {r.projects.length > 0 ? (
                  <Section title="Projects & Outside Experience">
                    {r.projects.map((p, i) => (
                      <Entry key={i} left={p.name} right={[p.dates?.start, p.dates?.end].filter(Boolean).join(" - ")} sub={p.role} subRight={p.location} bullets={p.bullets} link={p.link ? "Link to project" : undefined} />
                    ))}
                  </Section>
                ) : null}
                {r.education.length > 0 ? (
                  <Section title="Education">
                    {r.education.map((ed, i) => (
                      <Entry key={i} left={ed.institution} right={[ed.dates?.start, ed.dates?.end].filter(Boolean).join(" - ")} sub={ed.degree} subRight={ed.location} />
                    ))}
                  </Section>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

/** A 0–100 completeness score used when no ATS score exists yet. */
function completenessScore(r: Resume): number {
  const checks = [
    Boolean(r.contact.email),
    Boolean(r.summary),
    r.skills.length > 0,
    r.experience.length > 0,
    r.projects.length > 0,
    r.education.length > 0,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

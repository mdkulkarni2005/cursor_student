import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicProfile } from "@/lib/public-profile";
import { CopyLinkButton } from "@/components/profile/copy-link-button";
import { CodeIcon, ResumeIcon } from "@/components/icons";

export const metadata = { title: "Academic Identity — krackit" };

export default async function PublicIdentityPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const profile = await getPublicProfile(handle);
  if (!profile) notFound();

  const tags = [profile.department, profile.semester ? `Semester ${profile.semester}` : null, profile.institution]
    .filter(Boolean) as string[];

  return (
    <div className="min-h-screen bg-canvas">
      {/* Public top bar — student side: SHARE only, no recruiter/hire action */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-line bg-base/90 px-5 backdrop-blur sm:px-8">
        <Link href="/" className="font-display text-[18px] font-bold text-cyan">krackit</Link>
        <div className="flex items-center gap-3">
          <span className="hidden text-[13px] text-muted sm:block">@{handle}</span>
          <CopyLinkButton className="flex items-center gap-2 rounded-lg border border-line bg-card px-4 py-2 text-[13px] font-medium text-soft hover:bg-surface" />
        </div>
      </header>

      <main className="mx-auto max-w-[1080px] px-5 py-10 sm:px-8">
        {/* Hero */}
        <div className="rounded-2xl border border-line bg-card p-8">
          <div className="flex items-start gap-6">
            <span className="flex size-20 shrink-0 items-center justify-center rounded-2xl bg-cyan/12 font-display text-[28px] font-bold text-cyan">
              {profile.initials}
            </span>
            <div className="min-w-0">
              <h1 className="font-display text-[32px] font-semibold leading-tight tracking-tight text-ink">{profile.name}</h1>
              <p className="mt-1 text-[15px] text-muted">{profile.headline}</p>
              {tags.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {tags.map((t, i) => (
                    <span key={t} className={`rounded-full px-3 py-1 text-[12px] font-medium ${i === 0 ? "border border-cyan/20 bg-cyan/10 text-cyan" : "bg-surface text-soft"}`}>{t}</span>
                  ))}
                </div>
              ) : null}
              {(profile.links.github || profile.links.linkedin || profile.links.portfolio) ? (
                <div className="mt-3 flex flex-wrap gap-3 text-[12.5px]">
                  {profile.links.github ? <a href={normalize(profile.links.github)} target="_blank" rel="noopener" className="flex items-center gap-1 text-muted hover:text-cyan"><CodeIcon size={14} /> GitHub</a> : null}
                  {profile.links.linkedin ? <a href={normalize(profile.links.linkedin)} target="_blank" rel="noopener" className="flex items-center gap-1 text-muted hover:text-cyan">in/ LinkedIn</a> : null}
                  {profile.links.portfolio ? <a href={normalize(profile.links.portfolio)} target="_blank" rel="noopener" className="flex items-center gap-1 text-muted hover:text-cyan">Portfolio</a> : null}
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {profile.resume ? (
              <a href={`/resume/${profile.resume.id}/download/pdf`} className="flex items-center gap-2 rounded-xl bg-cyan px-5 py-2.5 text-[13.5px] font-semibold text-on-accent">
                <ResumeIcon size={16} /> Download Résumé
              </a>
            ) : null}
            <CopyLinkButton />
          </div>
        </div>

        {/* Stats — real DSA activity, interview activity, GPA */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {[
            {
              value: String(profile.stats.solved),
              label: "DSA Problems Solved",
              sub: profile.stats.solved > 0
                ? `${profile.dsaByDifficulty.easy}E · ${profile.dsaByDifficulty.medium}M · ${profile.dsaByDifficulty.hard}H`
                : null,
            },
            { value: profile.stats.rank ? `#${profile.stats.rank}` : "—", label: "Global Rank", sub: null },
            { value: profile.stats.streak > 0 ? `${profile.stats.streak} 🔥` : "—", label: "Day Streak", sub: null },
            {
              value: String(profile.interviews.completed),
              label: "Interviews Completed",
              sub: profile.interviews.completionRate != null ? `${Math.round(profile.interviews.completionRate * 100)}% completion` : null,
            },
            ...(profile.gpa != null ? [{ value: profile.gpa.toFixed(2), label: "GPA", sub: null }] : []),
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-line bg-card p-5 text-center">
              <p className="font-display text-[24px] font-bold text-ink">{s.value}</p>
              <p className="mt-1 text-[11.5px] uppercase tracking-wide text-muted">{s.label}</p>
              {s.sub ? <p className="mt-1 text-[11px] text-faint">{s.sub}</p> : null}
            </div>
          ))}
        </div>

        {/* Skills + Projects — real */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-line bg-card p-7">
            <h3 className="mb-4 font-display text-[17px] font-semibold text-ink">Skills</h3>
            {profile.skills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((s) => (
                  <span key={s} className="rounded-full border border-line bg-surface px-3 py-1.5 text-[12.5px] font-medium text-soft">{s}</span>
                ))}
              </div>
            ) : (
              <p className="text-[13.5px] text-muted">No skills published yet — they come from the student&apos;s resume.</p>
            )}
          </div>

          <div className="rounded-2xl border border-line bg-card p-7">
            <h3 className="mb-4 font-display text-[17px] font-semibold text-ink">Projects</h3>
            {profile.projects.length > 0 ? (
              <div className="space-y-2.5">
                {profile.projects.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 rounded-xl border border-line p-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-warning/15 text-[16px]">⚙</span>
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] font-semibold text-ink">{p.name}</p>
                      <p className="text-[12px] text-muted">{p.summary}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[13.5px] text-muted">No projects published yet.</p>
            )}
          </div>
        </div>

        <footer className="mt-12 border-t border-line py-6 text-center text-[12px] text-muted">
          Verified academic identity issued by <span className="font-semibold text-cyan">krackit</span>
        </footer>
      </main>
    </div>
  );
}

/** Make a bare handle/URL clickable (resume contact fields may be "github.com/x" or "@x"). */
function normalize(v: string): string {
  const s = v.trim().replace(/^@/, "");
  if (/^https?:\/\//i.test(s)) return s;
  return `https://${s}`;
}

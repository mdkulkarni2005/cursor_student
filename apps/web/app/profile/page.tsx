import Link from "next/link";
import { prisma } from "@studentos/db";
import { AppShell } from "@/components/app-shell";
import { requireOnboardedUser, shellUserFrom } from "@/lib/user";
import { getDsaProgress } from "@/lib/dsa/practice";
import { getLeaderboard } from "@/lib/dsa/leaderboard";
import { getResume } from "@/lib/resume/generate";
import { ShareProfileButton } from "@/components/profile/share-button";
import { ResumeIcon } from "@/components/icons";

export const metadata = { title: "Profile — Vidyas OS" };

export default async function ProfilePage() {
  const user = await requireOnboardedUser();
  const [dsa, board, projects, resume] = await Promise.all([
    getDsaProgress(user.id),
    getLeaderboard(user.id),
    prisma.document.findMany({ where: { ownerId: user.id, type: "PROJECT" }, orderBy: { updatedAt: "desc" }, take: 3 }),
    prisma.document.findFirst({ where: { ownerId: user.id, type: "RESUME", status: "READY" }, orderBy: { updatedAt: "desc" } }),
  ]);

  // Real social links from the latest resume's contact block (if any).
  const resumeData = resume ? await getResume(user.id, resume.id) : null;
  const links = resumeData?.resume.contact;

  const initials = (user.name ?? "Student").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  const STATS = [
    { label: "Day Streak", value: dsa.streak.current > 0 ? `${dsa.streak.current}` : "0", tint: "text-cyan" },
    { label: "Solved", value: String(dsa.solvedCount), tint: "text-teal" },
    { label: "Global Rank", value: board.me ? `#${board.me.rank}` : "—", tint: "text-indigo" },
    { label: "Career Goal", value: user.careerGoal ? user.careerGoal.split(" ")[0] : "—", tint: "text-warning" },
  ];

  return (
    <AppShell user={shellUserFrom(user)}>
      <div className="mx-auto max-w-[1080px]">
        {/* Header card */}
        <div className="rounded-2xl border border-line bg-card p-6 sm:p-8">
          <div className="flex flex-col items-start justify-between gap-5 sm:flex-row">
            <div className="flex items-center gap-5">
              <span className="flex size-20 items-center justify-center rounded-2xl bg-cyan/12 font-display text-[26px] font-bold text-cyan">{initials}</span>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-[26px] font-bold leading-tight text-ink">{user.name ?? "Student"}</h1>
                  {user.semester ? <span className="rounded-full bg-cyan/10 px-2.5 py-1 text-[11px] font-semibold text-cyan">Sem {user.semester}</span> : null}
                </div>
                <p className="mt-1 text-[14px] text-muted">{user.careerGoal ?? "Student"}{user.department ? ` · ${user.department}` : ""}</p>
                {(links?.github || links?.linkedin) ? (
                  <div className="mt-2 flex gap-3 text-[12.5px]">
                    {links.github ? <a href={normalize(links.github)} target="_blank" rel="noopener" className="text-muted hover:text-cyan">GitHub</a> : null}
                    {links.linkedin ? <a href={normalize(links.linkedin)} target="_blank" rel="noopener" className="text-muted hover:text-cyan">LinkedIn</a> : null}
                  </div>
                ) : null}
              </div>
            </div>
            <ShareProfileButton />
          </div>

          {/* Stats */}
          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-line pt-6 sm:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label}>
                <p className={`font-display text-[26px] font-bold ${s.tint}`}>{s.value}</p>
                <p className="text-[11.5px] uppercase tracking-wide text-muted">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Top projects + resume */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-[18px] font-semibold text-ink">Top Projects</h2>
              <Link href="/projects" className="text-[13px] font-semibold text-cyan hover:underline">View Catalyst</Link>
            </div>
            {projects.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-line bg-card p-10 text-center text-[13.5px] text-muted">
                No projects yet — generate one in the Project Idea Catalyst.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {projects.map((p) => (
                  <Link key={p.id} href={`/projects/${p.id}`} className="group rounded-2xl border border-line bg-card p-5 transition-all hover:-translate-y-1 hover:border-cyan/40">
                    <span className="mb-3 flex size-10 items-center justify-center rounded-xl bg-warning/15 text-[18px]">⚙</span>
                    <p className="line-clamp-2 text-[14.5px] font-semibold text-ink group-hover:text-cyan">{p.title}</p>
                    <p className="mt-2 text-[12px] text-muted">Project bundle</p>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* ATS Resume */}
          <div>
            <h2 className="mb-4 font-display text-[18px] font-semibold text-ink">ATS Resume</h2>
            <div className="rounded-2xl border border-line bg-card p-5">
              {resume ? (
                <>
                  <div className="mb-4 flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-teal/12 text-teal"><ResumeIcon size={18} /></span>
                    <div className="min-w-0"><p className="truncate text-[14px] font-semibold text-ink">{resume.title}</p><p className="text-[12px] text-muted">Ready · ATS format</p></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Link href={`/resume/${resume.id}`} className="rounded-xl bg-cyan py-2.5 text-center text-[13px] font-semibold text-on-accent">View</Link>
                    <a href={`/resume/${resume.id}/download/pdf`} className="rounded-xl border border-cyan/30 bg-cyan/5 py-2.5 text-center text-[13px] font-semibold text-cyan">Download PDF</a>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-[13.5px] text-muted">No resume yet.</p>
                  <Link href="/resume" className="mt-3 block rounded-xl border border-cyan/30 bg-cyan/5 py-2.5 text-center text-[13px] font-semibold text-cyan">Build your resume</Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

/** Make a bare handle/URL from the resume contact clickable. */
function normalize(v: string): string {
  const s = v.trim().replace(/^@/, "");
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
}

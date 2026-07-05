import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@studentos/db";
import { AppShell } from "@/components/app-shell";
import { requireOnboardedUser, shellUserFrom } from "@/lib/user";
import { getDsaProgress } from "@/lib/dsa/practice";
import { getLeaderboard } from "@/lib/dsa/leaderboard";
import { DSA_PROBLEMS } from "@/lib/dsa/catalog";
import { PencilIcon, ResumeIcon, MicIcon, SlidesIcon } from "@/components/icons";

const ACCELERATORS = [
  { label: "Assignments", href: "/assignments", icon: PencilIcon, blurb: "Keep track of upcoming deadlines and snap-and-solve with AI.", cta: "Go to Tracker", accent: "cyan" },
  { label: "Reports & PPT", href: "/reports", icon: SlidesIcon, blurb: "Generate polished reports and presentation decks in minutes.", cta: "Create Doc", accent: "teal" },
  { label: "Resume Builder", href: "/resume", icon: ResumeIcon, blurb: "Update your tech stack with your latest project contributions.", cta: "Open Builder", accent: "indigo" },
  { label: "Interview Prep", href: "/interview", icon: MicIcon, blurb: "Practice mock behavioral & technical rounds with AI feedback.", cta: "Start Mock", accent: "cyan" },
] as const;

const ACC: Record<string, string> = {
  cyan: "bg-cyan/12 text-cyan",
  teal: "bg-teal/12 text-teal",
  indigo: "bg-indigo/15 text-indigo",
};

const DIFF_BY_SLUG = new Map(DSA_PROBLEMS.map((p) => [p.slug, p.difficulty]));

function greeting(): string {
  const hour = Number(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata", hour: "numeric", hour12: false }));
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function relTime(d: Date): string {
  const h = Math.round((Date.now() - d.getTime()) / 3_600_000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  const days = Math.round(h / 24);
  return days === 1 ? "yesterday" : `${days}d ago`;
}

const DOC_ICON: Record<string, typeof SlidesIcon> = {
  REPORT: SlidesIcon, PPT: SlidesIcon, ASSIGNMENT: PencilIcon, RESUME: ResumeIcon, PROJECT: SlidesIcon, INTERVIEW: MicIcon,
};
const DOC_HREF: Record<string, (id: string) => string> = {
  REPORT: (id) => `/reports/${id}`, PPT: (id) => `/ppt/${id}`, ASSIGNMENT: (id) => `/assignments/${id}`,
  RESUME: (id) => `/resume/${id}`, PROJECT: (id) => `/projects/${id}`, INTERVIEW: () => "/interview",
};

export default async function DashboardPage() {
  const user = await requireOnboardedUser();
  // Professionals only get DSA + Interview Prep — the widgets below are student-shaped.
  if (user.userType === "PROFESSIONAL") redirect("/interview");
  const firstName = user.name?.split(" ")[0] ?? "there";

  const [dsa, board, recentDocs] = await Promise.all([
    getDsaProgress(user.id),
    getLeaderboard(user.id),
    prisma.document.findMany({ where: { ownerId: user.id }, orderBy: { updatedAt: "desc" }, take: 4, select: { id: true, title: true, type: true, updatedAt: true } }),
  ]);

  // Real solved-by-difficulty from the catalog.
  let easy = 0, medium = 0, hard = 0;
  for (const slug of dsa.solvedSlugs) {
    const d = DIFF_BY_SLUG.get(slug);
    if (d === "easy") easy++; else if (d === "medium") medium++; else if (d === "hard") hard++;
  }

  return (
    <AppShell user={await shellUserFrom(user)}>
      <div className="mx-auto max-w-[1480px]">
        {/* Welcome + Daily Grind streak */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="flex flex-col justify-center lg:col-span-2">
            <p className="text-[13px] text-muted">{greeting()}, {firstName} 👋</p>
            <h1 className="mt-1 font-display text-[36px] font-bold leading-tight tracking-tight text-ink">
              Welcome back, {firstName}!
            </h1>
            <p className="mt-2 max-w-xl text-[15px] text-muted">
              {dsa.streak.current > 0
                ? `You're on a ${dsa.streak.current}-day DSA streak. Ready to tackle today's milestones?`
                : "Ready to create something today? Pick a tool below to get started."}
            </p>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-gradient-to-br from-cyan to-indigo p-6 text-on-accent">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest opacity-80">Daily Grind</p>
              <p className="mt-2 font-display text-[52px] font-bold leading-none">{dsa.streak.current}</p>
              <p className="text-[12px] font-semibold uppercase tracking-wide opacity-90">Day Streak</p>
            </div>
            <p className="max-w-[120px] text-right text-[12.5px] opacity-90">
              {dsa.streak.practicedToday ? "Solved today — momentum high!" : "Solve 1 problem today to keep it alive."}
            </p>
          </div>
        </div>

        {/* Workflow Accelerators */}
        <h2 className="mb-5 mt-10 font-display text-[20px] font-semibold text-ink">Workflow Accelerators</h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {ACCELERATORS.map((a) => {
            const Icon = a.icon;
            return (
              <Link key={a.label} href={a.href} className="group rounded-2xl border border-line bg-card p-6 transition-all hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(15,23,42,0.08)]">
                <span className={`mb-4 flex size-12 items-center justify-center rounded-xl transition-transform group-hover:scale-110 ${ACC[a.accent]}`}>
                  <Icon size={22} />
                </span>
                <h3 className="mb-2 font-display text-[17px] font-semibold text-ink">{a.label}</h3>
                <p className="mb-5 text-[13.5px] leading-relaxed text-muted">{a.blurb}</p>
                <span className="text-[13px] font-semibold text-cyan">{a.cta} →</span>
              </Link>
            );
          })}
        </div>

        {/* DSA stats strip */}
        <div className="mb-4 mt-10 flex items-center justify-between">
          <h2 className="font-display text-[20px] font-semibold text-ink">DSA Progress</h2>
          <Link href="/dsa/leaderboard" className="text-[13px] font-semibold text-cyan hover:underline">View Leaderboard →</Link>
        </div>
        <div className="rounded-2xl border border-line bg-card p-6">
          <div className="grid grid-cols-2 gap-y-6 sm:grid-cols-3 lg:grid-cols-5">
            {[
              { label: "Solved Total", value: dsa.solvedCount, tone: "text-ink" },
              { label: "Easy", value: easy, tone: "text-success" },
              { label: "Medium", value: medium, tone: "text-warning" },
              { label: "Hard", value: hard, tone: "text-danger" },
              { label: "Global Rank", value: board.me ? `#${board.me.rank}` : "—", tone: "text-cyan" },
            ].map((s) => (
              <div key={s.label}>
                <p className={`font-display text-[30px] font-bold ${s.tone}`}>{s.value}</p>
                <p className="text-[11.5px] uppercase tracking-wide text-muted">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Jump back in */}
        <div className="mb-4 mt-10 flex items-center justify-between">
          <h2 className="font-display text-[20px] font-semibold text-ink">Jump back in</h2>
          <Link href="/vault" className="text-[13px] font-semibold text-cyan hover:underline">View History</Link>
        </div>
        {recentDocs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-card p-10 text-center">
            <p className="text-[14px] text-muted">Nothing here yet.</p>
            <p className="mt-1 text-[12.5px] text-faint">Generate a report, deck or assignment and it&apos;ll show up here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {recentDocs.map((d) => {
              const Icon = DOC_ICON[d.type] ?? SlidesIcon;
              const href = (DOC_HREF[d.type] ?? (() => "/vault"))(d.id);
              return (
                <Link key={d.id} href={href} className="group flex items-start gap-3 rounded-2xl border border-line bg-card p-4 transition-colors hover:border-cyan/40">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-cyan/10 text-cyan">
                    <Icon size={17} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-semibold text-ink group-hover:text-cyan">{d.title}</p>
                    <p className="text-[12px] text-muted">Edited {relTime(d.updatedAt)}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <footer className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-line py-6 text-[12px] text-muted sm:flex-row">
          <span>© {new Date().getFullYear()} Vidyas OS. Built for intellectual focus.</span>
          <div className="flex gap-5">
            <Link href="/terms" className="hover:text-cyan">Terms</Link>
            <Link href="/privacy" className="hover:text-cyan">Privacy</Link>
          </div>
        </footer>
      </div>
    </AppShell>
  );
}

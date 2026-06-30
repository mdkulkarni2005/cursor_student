import Link from "next/link";
import { prisma } from "@studentos/db";
import { AppShell } from "@/components/app-shell";
import { requireOnboardedUser, shellUserFrom } from "@/lib/user";
import { quotaStatus } from "@/lib/entitlements";
import { getDsaProgress } from "@/lib/dsa/practice";
import { getLeaderboard } from "@/lib/dsa/leaderboard";
import { DSA_PROBLEMS } from "@/lib/dsa/catalog";
import { PencilIcon, ResumeIcon, MicIcon, SlidesIcon } from "@/components/icons";

const ACCELERATORS = [
  { label: "Assignments", href: "/assignments", icon: PencilIcon, blurb: "Keep track of upcoming deadlines and snap-and-solve with AI.", cta: "Go to Tracker", accent: "cyan" },
  { label: "Resume Builder", href: "/resume", icon: ResumeIcon, blurb: "Update your tech stack with your latest project contributions.", cta: "Open Builder", accent: "teal" },
  { label: "Interview Prep", href: "/interview", icon: MicIcon, blurb: "Practice mock behavioral & technical rounds with AI feedback.", cta: "Start Mock", accent: "indigo" },
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
  const firstName = user.name?.split(" ")[0] ?? "there";

  const [assignmentQ, reportQ, pptQ, dsa, board, recentDocs] = await Promise.all([
    quotaStatus(user, "ASSIGNMENT"),
    quotaStatus(user, "REPORT"),
    quotaStatus(user, "PPT"),
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

  // Intelligence Pulse — generations used vs monthly allowance.
  const used = assignmentQ.used + reportQ.used + pptQ.used;
  const limits = [assignmentQ.limit, reportQ.limit, pptQ.limit];
  const unlimited = limits.some((l) => l === null);
  const totalLimit = unlimited ? null : limits.reduce<number>((a, b) => a + (b ?? 0), 0);
  const pulsePct = totalLimit ? Math.min(100, Math.round((used / totalLimit) * 100)) : 8;

  return (
    <AppShell user={shellUserFrom(user)}>
      <div className="mx-auto max-w-[1100px]">
        {/* Welcome + Intelligence Pulse */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <p className="text-[13px] text-muted">{greeting()}, {firstName} 👋</p>
            <h1 className="mt-1 font-display text-[34px] font-bold leading-tight tracking-tight text-ink">
              Welcome back, {firstName}!
            </h1>
            <p className="mt-2 max-w-md text-[14.5px] text-muted">
              {dsa.streak.current > 0
                ? `You're on a ${dsa.streak.current}-day DSA streak. Ready to tackle today's milestones?`
                : "Ready to create something today? Pick a tool below to get started."}
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-card p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted">Plan Usage</p>
                <h2 className="font-display text-[18px] font-semibold text-cyan">Intelligence Pulse</h2>
              </div>
              <span className="rounded-full bg-teal/12 px-2.5 py-1 text-[11px] font-bold text-teal">{user.plan}</span>
            </div>
            <div className="mt-5 flex items-end justify-between text-[13px]">
              <span className="text-muted">Generations used</span>
              <span className="font-semibold text-ink">{used} / {unlimited ? "∞" : totalLimit}</span>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-surface">
              <div className="h-full rounded-full bg-cyan" style={{ width: `${pulsePct}%` }} />
            </div>
            <p className="mt-3 text-[12.5px] text-muted">
              {user.plan === "FREE" ? "Limits reset on the 1st." : "Generous limits on your plan."}
            </p>
          </div>
        </div>

        {/* Workflow Accelerators */}
        <h2 className="mb-5 mt-10 font-display text-[20px] font-semibold text-ink">Workflow Accelerators</h2>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
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

        {/* Daily Grind + stats */}
        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[260px_1fr]">
          <div className="flex flex-col justify-between rounded-2xl bg-gradient-to-br from-cyan to-indigo p-6 text-on-accent">
            <p className="text-[11px] font-bold uppercase tracking-widest opacity-80">Daily Grind</p>
            <div>
              <p className="font-display text-[52px] font-bold leading-none">{dsa.streak.current}</p>
              <p className="text-[12px] font-semibold uppercase tracking-wide opacity-90">Day Streak</p>
            </div>
            <p className="mt-4 text-[12.5px] opacity-90">
              {dsa.streak.practicedToday ? "Solved today — momentum high!" : "Solve 1 problem today to keep it alive."}
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-card p-6">
            <div className="grid grid-cols-2 gap-y-6 sm:grid-cols-3">
              {[
                { label: "Solved Total", value: dsa.solvedCount, tone: "text-ink" },
                { label: "Easy", value: easy, tone: "text-success" },
                { label: "Medium", value: medium, tone: "text-warning" },
                { label: "Hard", value: hard, tone: "text-danger" },
                { label: "Global Rank", value: board.me ? `#${board.me.rank}` : "—", tone: "text-cyan" },
              ].map((s) => (
                <div key={s.label}>
                  <p className={`font-display text-[26px] font-bold ${s.tone}`}>{s.value}</p>
                  <p className="text-[11.5px] uppercase tracking-wide text-muted">{s.label}</p>
                </div>
              ))}
              <div className="flex items-end">
                <Link href="/dsa/leaderboard" className="rounded-lg bg-surface px-4 py-2 text-[12.5px] font-semibold text-muted transition-colors hover:text-cyan">
                  View All →
                </Link>
              </div>
            </div>
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

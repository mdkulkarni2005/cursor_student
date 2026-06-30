import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { requireOnboardedUser, shellUserFrom } from "@/lib/user";
import { DSA_PROBLEMS, type DsaDifficulty } from "@/lib/dsa/catalog";
import { getDsaProgress } from "@/lib/dsa/practice";
import { getLeaderboard } from "@/lib/dsa/leaderboard";

const DIFF_STYLE: Record<DsaDifficulty, string> = {
  easy: "text-success bg-success/12",
  medium: "text-warning bg-warning/12",
  hard: "text-danger bg-danger/12",
};
const DIFF_DOT: Record<DsaDifficulty, string> = { easy: "bg-success", medium: "bg-warning", hard: "bg-danger" };
const FILTERS = ["all", "easy", "medium", "hard"] as const;
const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

export default async function DsaPage({ searchParams }: { searchParams: Promise<{ diff?: string }> }) {
  const user = await requireOnboardedUser();
  const { diff } = await searchParams;
  const active = (FILTERS as readonly string[]).includes(diff ?? "") ? (diff as (typeof FILTERS)[number]) : "all";

  const [progress, board] = await Promise.all([getDsaProgress(user.id), getLeaderboard(user.id)]);
  const solved = new Set(progress.solvedSlugs);
  const attempted = new Set(progress.attemptedSlugs);

  const list = DSA_PROBLEMS.filter((p) => active === "all" || p.difficulty === active);
  const accuracy = progress.attemptedSlugs.length > 0
    ? Math.round((progress.solvedCount / progress.attemptedSlugs.length) * 100)
    : 0;

  // Day pills — fill the last `streak` days ending today (Mon-first week).
  const todayIdx = (new Date().getDay() + 6) % 7; // Mon=0
  const litFrom = Math.max(0, todayIdx - progress.streak.current + 1);

  return (
    <AppShell user={shellUserFrom(user)}>
      <div className="mx-auto max-w-[1100px]">
        {/* Streak banner */}
        <div className="mb-6 flex flex-col gap-5 overflow-hidden rounded-3xl bg-gradient-to-br from-cyan to-indigo p-6 text-on-accent sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest opacity-80">{progress.streak.current}-Day Practice Streak</p>
            <h1 className="mt-1 font-display text-[22px] font-bold leading-snug">
              {progress.streak.current > 0
                ? "Keep the momentum — solve one more today."
                : "Solve a problem today to start your streak."}
            </h1>
            <p className="mt-1 text-[13px] opacity-90">{progress.solvedCount} solved · {progress.attemptedSlugs.length} attempted · {DSA_PROBLEMS.length} total</p>
          </div>
          <div className="flex gap-2">
            {DAY_LETTERS.map((d, i) => {
              const lit = i >= litFrom && i <= todayIdx && progress.streak.current > 0;
              const isToday = i === todayIdx;
              return (
                <div key={i} className={`flex size-9 flex-col items-center justify-center rounded-xl text-[12px] font-bold ${lit ? "bg-white text-cyan" : "bg-white/15 text-white/70"} ${isToday ? "ring-2 ring-white/70" : ""}`}>
                  {d}
                </div>
              );
            })}
          </div>
        </div>

        {/* Problem catalog */}
        <div className="mb-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-[20px] font-semibold text-ink">Problem Catalog</h2>
            <div className="flex gap-1.5 rounded-xl border border-line bg-card p-1">
              {FILTERS.map((f) => (
                <Link
                  key={f}
                  href={f === "all" ? "/dsa" : `/dsa?diff=${f}`}
                  className={`rounded-lg px-3.5 py-1.5 text-[12.5px] font-semibold capitalize transition-colors ${active === f ? "bg-cyan text-on-accent" : "text-muted hover:text-cyan"}`}
                >
                  {f}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            {list.map((pr) => {
              const status = solved.has(pr.slug) ? "solved" : attempted.has(pr.slug) ? "attempted" : "new";
              return (
                <Link key={pr.slug} href={`/dsa/${pr.slug}`} className="group flex items-center gap-3.5 rounded-2xl border border-line bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-cyan/40 hover:shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
                  <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg text-[15px] ${status === "solved" ? "bg-success/12 text-success" : "bg-surface text-faint"}`}>
                    {status === "solved" ? "✓" : <span className={`size-2.5 rounded-full ${DIFF_DOT[pr.difficulty]}`} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14.5px] font-semibold text-ink group-hover:text-cyan">{pr.title}</p>
                    <p className="truncate text-[12px] text-muted">{pr.tags.join(" · ")}</p>
                  </div>
                  {status === "attempted" ? <span className="text-[11px] font-semibold text-warning">attempted</span> : null}
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${DIFF_STYLE[pr.difficulty]}`}>{pr.difficulty}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { label: "Accuracy", value: `${accuracy}%`, icon: "🎯" },
            { label: "Solved", value: String(progress.solvedCount), icon: "✅" },
            { label: "Global Rank", value: board.me ? `#${board.me.rank}` : "—", icon: "🏆", href: "/dsa/leaderboard" },
          ].map((s) => {
            const inner = (
              <div className="flex items-center gap-4 rounded-2xl border border-line bg-card p-5">
                <span className="flex size-11 items-center justify-center rounded-xl bg-surface text-[20px]">{s.icon}</span>
                <div>
                  <p className="font-display text-[22px] font-bold text-ink">{s.value}</p>
                  <p className="text-[12px] uppercase tracking-wide text-muted">{s.label}</p>
                </div>
              </div>
            );
            return s.href ? <Link key={s.label} href={s.href} className="transition-transform hover:-translate-y-0.5">{inner}</Link> : <div key={s.label}>{inner}</div>;
          })}
        </div>
      </div>
    </AppShell>
  );
}

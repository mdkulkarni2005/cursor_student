import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { requireOnboardedUser, shellUserFrom } from "@/lib/user";
import { DSA_PROBLEMS } from "@/lib/dsa/catalog";
import { getDsaProgress } from "@/lib/dsa/practice";
import { getLeaderboard } from "@/lib/dsa/leaderboard";
import { ProblemBrowser } from "@/components/dsa/problem-browser";

const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

export default async function DsaPage() {
  const user = await requireOnboardedUser();

  const [progress, board] = await Promise.all([getDsaProgress(user.id), getLeaderboard(user.id)]);
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
          <ProblemBrowser problems={DSA_PROBLEMS} solvedSlugs={progress.solvedSlugs} attemptedSlugs={progress.attemptedSlugs} />
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

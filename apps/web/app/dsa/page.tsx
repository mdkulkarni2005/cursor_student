import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { requireOnboardedUser, shellUserFrom } from "@/lib/user";
import { DSA_PROBLEMS, type DsaDifficulty } from "@/lib/dsa/catalog";
import { getDsaProgress } from "@/lib/dsa/practice";

const DIFF_STYLE: Record<DsaDifficulty, string> = {
  easy: "text-success bg-success/12",
  medium: "text-warning bg-warning/12",
  hard: "text-danger bg-danger/12",
};

function streakLine(p: Awaited<ReturnType<typeof getDsaProgress>>): { emoji: string; text: string } {
  const { streak, totalAttempts } = p;
  if (streak.alive && streak.practicedToday) return { emoji: "🔥", text: `${streak.current}-day streak — you practiced today. Keep it going!` };
  if (streak.alive) return { emoji: "🔥", text: `${streak.current}-day streak alive — solve one today to keep it.` };
  if (totalAttempts > 0) return { emoji: "⚡", text: "Your streak reset — solve one today to start a new one." };
  return { emoji: "✨", text: "Start your streak — solve your first problem today." };
}

export default async function DsaPage() {
  const user = await requireOnboardedUser();
  const progress = await getDsaProgress(user.id);
  const solved = new Set(progress.solvedSlugs);
  const attempted = new Set(progress.attemptedSlugs);
  const banner = streakLine(progress);

  return (
    <AppShell user={shellUserFrom(user)}>
      <div className="mx-auto max-w-[860px]">
        <h1 className="font-display text-[22px] font-bold text-ink">DSA Practice</h1>
        <p className="mb-4 mt-1.5 text-[14px] text-muted">
          Sharpen data structures & algorithms — solve, get an instant complexity review, build a daily streak.
        </p>

        {/* Streak banner (in-app; push reminders are a later add) */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cyan/25 bg-cyan/[0.06] p-4">
          <div className="flex items-center gap-3">
            <span className="text-[28px]">{banner.emoji}</span>
            <div>
              <p className="text-[14px] font-semibold text-ink">{banner.text}</p>
              <p className="text-[12px] text-muted">{progress.solvedCount} solved · {progress.attemptedSlugs.length} attempted · {DSA_PROBLEMS.length} total</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          {DSA_PROBLEMS.map((pr) => {
            const status = solved.has(pr.slug) ? "solved" : attempted.has(pr.slug) ? "attempted" : "new";
            return (
              <Link
                key={pr.slug}
                href={`/dsa/${pr.slug}`}
                className="flex items-center gap-3.5 rounded-xl border border-line bg-card p-3.5 transition-colors hover:border-cyan/30"
              >
                <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg text-[15px] ${status === "solved" ? "bg-success/12 text-success" : "bg-white/5 text-faint"}`}>
                  {status === "solved" ? "✓" : "›"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold text-ink">{pr.title}</p>
                  <p className="truncate text-[12px] text-faint">{pr.tags.join(" · ")}</p>
                </div>
                {status === "attempted" ? <span className="text-[11px] font-semibold text-warning">attempted</span> : null}
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${DIFF_STYLE[pr.difficulty]}`}>{pr.difficulty}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}

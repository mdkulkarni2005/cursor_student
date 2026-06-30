import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { requireOnboardedUser, shellUserFrom } from "@/lib/user";
import { getLeaderboard, type LeaderRow } from "@/lib/dsa/leaderboard";
import { getDsaProgress } from "@/lib/dsa/practice";
import { CodeIcon } from "@/components/icons";

export const metadata = { title: "DSA Leaderboard — Vidyas OS" };

function medal(rank: number): string {
  return rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;
}

function Row({ r, isMe }: { r: LeaderRow; isMe: boolean }) {
  return (
    <div
      className={`flex items-center gap-4 px-5 py-3.5 ${
        isMe ? "bg-cyan/8" : "transition-colors hover:bg-surface/50"
      }`}
    >
      <span className={`w-9 shrink-0 text-center text-[14px] font-bold ${r.rank <= 3 ? "text-[16px]" : "text-muted"}`}>
        {medal(r.rank)}
      </span>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-cyan/12 text-[12px] font-bold text-cyan">
        {r.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "?"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold text-ink">
          {r.name} {isMe && <span className="text-[11px] font-bold text-cyan">· You</span>}
        </p>
        <p className="truncate text-[12px] text-muted">{r.department ?? "—"}</p>
      </div>
      <div className="text-right">
        <p className="font-display text-[16px] font-bold text-ink">{r.vScore.toLocaleString("en-IN")}</p>
        <p className="text-[10px] uppercase tracking-wide text-faint">V-Score</p>
      </div>
    </div>
  );
}

export default async function DsaLeaderboardPage() {
  const user = await requireOnboardedUser();
  const [board, progress] = await Promise.all([getLeaderboard(user.id), getDsaProgress(user.id)]);
  const meInTop = board.me && board.top.some((r) => r.userId === board.me!.userId);

  return (
    <AppShell user={shellUserFrom(user)}>
      <div className="mx-auto max-w-[1080px]">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <nav className="mb-2 flex items-center gap-2 text-[13px] text-muted">
              <Link href="/dsa" className="hover:text-cyan">DSA Practice</Link>
              <span>›</span>
              <span className="font-semibold text-cyan">Leaderboard</span>
            </nav>
            <h1 className="font-display text-[30px] font-semibold tracking-tight text-ink">DSA Leaderboard</h1>
            <p className="mt-1 text-[14px] text-muted">Ranked by distinct problems solved across all students.</p>
          </div>
          <Link
            href="/dsa"
            className="flex items-center gap-2 rounded-xl bg-cyan px-5 py-2.5 text-[13.5px] font-semibold text-on-accent transition-transform active:scale-95"
          >
            <CodeIcon size={17} /> Practice
          </Link>
        </div>

        {/* Your stats */}
        <div className="mb-6 grid grid-cols-3 gap-4">
          {[
            { label: "Your Global Rank", value: board.me ? `#${board.me.rank}` : "—", sub: `of ${board.totalRanked || 0}` },
            { label: "Your V-Score", value: (board.me?.vScore ?? 0).toLocaleString("en-IN"), sub: `${board.me?.solved ?? 0} solved` },
            { label: "Daily Streak", value: progress.streak.current > 0 ? `${progress.streak.current}🔥` : "—", sub: progress.streak.practicedToday ? "solved today" : "keep it alive" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-line bg-card p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{s.label}</p>
              <p className="mt-1 font-display text-[24px] font-bold text-ink">{s.value}</p>
              <p className="text-[12px] text-muted">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Leaderboard */}
        <div className="overflow-hidden rounded-2xl border border-line bg-card">
          <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <h2 className="font-display text-[16px] font-semibold text-ink">Top Students</h2>
            <span className="text-[12px] text-muted">{board.totalRanked} ranked</span>
          </div>
          {board.top.length === 0 ? (
            <div className="p-12 text-center">
              <p className="font-display text-[16px] font-semibold text-ink">No rankings yet</p>
              <p className="mt-1 text-[13.5px] text-muted">
                Solve a DSA problem to put yourself on the board.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-line">
              {board.top.map((r) => (
                <Row key={r.userId} r={r} isMe={r.userId === user.id} />
              ))}
              {/* Show the current user's own row in-situ if they're outside the top N */}
              {board.me && !meInTop && (
                <>
                  <div className="px-5 py-2 text-center text-[12px] text-faint">···</div>
                  <Row r={board.me} isMe />
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

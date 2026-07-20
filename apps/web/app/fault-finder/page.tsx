import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { requireOnboardedUser, shellUserFrom } from "@/lib/user";
import { FAULT_FINDER_SCENARIOS, type FaultFinderDifficulty } from "@/lib/fault-finder/catalog";
import { getFaultFinderProgress } from "@/lib/fault-finder/practice";

const DIFF_STYLE: Record<FaultFinderDifficulty, string> = {
  easy: "text-success bg-success/12",
  medium: "text-warning bg-warning/12",
  hard: "text-danger bg-danger/12",
};

export default async function FaultFinderPage() {
  const user = await requireOnboardedUser();
  const progress = await getFaultFinderProgress(user.id);

  return (
    <AppShell user={await shellUserFrom(user)}>
      <div className="mx-auto max-w-[1100px]">
        <div className="mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-cyan to-indigo p-6 text-on-accent">
          <p className="text-[11px] font-bold uppercase tracking-widest opacity-80">Electrical Engineering</p>
          <h1 className="mt-1 font-display text-[22px] font-bold leading-snug">Fault Finder — diagnose the broken circuit.</h1>
          <p className="mt-1 text-[13px] opacity-90">
            {progress.solvedSlugs.length}/{FAULT_FINDER_SCENARIOS.length} solved · {progress.totalAttempts} attempt{progress.totalAttempts === 1 ? "" : "s"}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {FAULT_FINDER_SCENARIOS.map((s) => {
            const solved = progress.solvedSlugs.includes(s.slug);
            const attempted = progress.attemptedSlugs.includes(s.slug);
            return (
              <Link
                key={s.slug}
                href={`/fault-finder/${s.slug}`}
                className="flex flex-col gap-2 rounded-2xl border border-line bg-card p-5 transition-transform hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${DIFF_STYLE[s.difficulty]}`}>{s.difficulty}</span>
                  {solved ? (
                    <span className="rounded-full bg-success/12 px-2.5 py-1 text-[11px] font-semibold text-success">✓ solved</span>
                  ) : attempted ? (
                    <span className="rounded-full bg-warning/12 px-2.5 py-1 text-[11px] font-semibold text-warning">attempted</span>
                  ) : null}
                </div>
                <h2 className="font-display text-[16px] font-bold text-ink">{s.title}</h2>
                <p className="line-clamp-2 text-[13px] leading-relaxed text-soft">{s.description}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}

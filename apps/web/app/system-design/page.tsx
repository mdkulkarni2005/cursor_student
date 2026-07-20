import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { requireOnboardedUser, shellUserFrom } from "@/lib/user";
import { SYSTEM_DESIGN_SCENARIOS, type SystemDesignDifficulty } from "@/lib/system-design/catalog";
import { getSystemDesignProgress } from "@/lib/system-design/practice";

const DIFF_STYLE: Record<SystemDesignDifficulty, string> = {
  easy: "text-success bg-success/12",
  medium: "text-warning bg-warning/12",
  hard: "text-danger bg-danger/12",
};

export default async function SystemDesignPage() {
  const user = await requireOnboardedUser();
  const progress = await getSystemDesignProgress(user.id);

  return (
    <AppShell user={await shellUserFrom(user)}>
      <div className="mx-auto max-w-[1100px]">
        <div className="mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-cyan to-indigo p-6 text-on-accent">
          <p className="text-[11px] font-bold uppercase tracking-widest opacity-80">System Design Canvas</p>
          <h1 className="mt-1 font-display text-[22px] font-bold leading-snug">Design real systems, get an AI architecture review.</h1>
          <p className="mt-1 text-[13px] opacity-90">
            {progress.totalAttempts} attempt{progress.totalAttempts === 1 ? "" : "s"} · {progress.attemptedSlugs.length}/{SYSTEM_DESIGN_SCENARIOS.length} scenarios tried
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {SYSTEM_DESIGN_SCENARIOS.map((s) => {
            const tried = progress.attemptedSlugs.includes(s.slug);
            return (
              <Link
                key={s.slug}
                href={`/system-design/${s.slug}`}
                className="flex flex-col gap-2 rounded-2xl border border-line bg-card p-5 transition-transform hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${DIFF_STYLE[s.difficulty]}`}>{s.difficulty}</span>
                  {tried ? <span className="rounded-full bg-success/12 px-2.5 py-1 text-[11px] font-semibold text-success">✓ attempted</span> : null}
                </div>
                <h2 className="font-display text-[16px] font-bold text-ink">{s.title}</h2>
                <p className="line-clamp-2 text-[13px] leading-relaxed text-soft">{s.prompt}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}

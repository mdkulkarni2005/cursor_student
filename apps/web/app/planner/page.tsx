import { prisma } from "@studentos/db";
import { AppShell } from "@/components/app-shell";
import { requireOnboardedUser, shellUserFrom } from "@/lib/user";
import { generateStudyPlan, type RoadmapDay } from "@/lib/actions/planner";
import { Sparkle, BellIcon } from "@/components/icons";
import { SubmitButton } from "@/components/ui/button";

export const metadata = { title: "Exam Planner — Vidyas OS" };

const CHIP: Record<string, string> = {
  core: "bg-cyan/10 text-cyan",
  revision: "bg-teal/10 text-teal",
  mock: "bg-danger/10 text-danger",
};

const REMINDERS = [
  { title: "Streak Missing", note: "Alert if no activity for 6 hours", on: true },
  { title: "Daily Roadmap Digest", note: "Morning summary of today's plan", on: true },
  { title: "Mock Test Countdown", note: "24h before each scheduled mock", on: false },
];

export default async function PlannerPage() {
  const user = await requireOnboardedUser();
  const plan = await prisma.studyPlan.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  const roadmap = (plan?.roadmap as RoadmapDay[] | null) ?? [];
  const daysLeft = plan?.examDate
    ? Math.max(0, Math.ceil((plan.examDate.getTime() - Date.now()) / 86_400_000))
    : null;

  return (
    <AppShell user={shellUserFrom(user)}>
      <div className="mx-auto max-w-[1180px] space-y-8">
        {/* Header */}
        <section className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <h1 className="font-display text-[30px] font-semibold tracking-tight text-cyan">Exam-Prep Planner</h1>
            <p className="mt-1 text-[15px] text-muted">AI-optimized schedule for academic excellence.</p>
          </div>
          {plan && (
            <div className="flex items-center gap-3 rounded-xl border border-line bg-card p-2">
              <div className="border-r border-line px-4 py-1.5">
                <p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-cyan">Target Exam</p>
                <p className="text-[13.5px] font-semibold text-ink">{plan.targetExam}</p>
              </div>
              <div className="px-4 py-1.5">
                <p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-cyan">Exam In</p>
                <p className="text-[13.5px] font-semibold text-ink">{daysLeft !== null ? `${daysLeft} Days` : "—"}</p>
              </div>
            </div>
          )}
        </section>

        {!plan ? (
          /* Empty state — generate a plan */
          <div className="rounded-2xl border border-line bg-card p-8">
            <div className="mx-auto max-w-[460px] text-center">
              <span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-cyan/12 text-cyan">
                <Sparkle size={24} />
              </span>
              <h2 className="font-display text-[20px] font-semibold text-ink">Generate your exam sprint</h2>
              <p className="mt-1 text-[14px] text-muted">Tell us the exam and date — we&apos;ll build a day-by-day roadmap.</p>
              <form action={generateStudyPlan} className="mt-6 space-y-3 text-left">
                <input
                  name="targetExam"
                  required
                  placeholder="Target exam (e.g. Advanced Algorithms)"
                  className="w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-[14px] text-ink outline-none focus:border-cyan/50"
                />
                <input
                  name="examDate"
                  type="date"
                  className="w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-[14px] text-ink outline-none focus:border-cyan/50"
                />
                <SubmitButton loadingText="Generating…" className="w-full rounded-xl bg-cyan py-3 text-[14px] font-semibold text-on-accent disabled:opacity-60">
                  Generate plan
                </SubmitButton>
              </form>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-6">
            {/* Roadmap */}
            <div className="col-span-12 space-y-6 lg:col-span-8">
              <div className="rounded-2xl border border-line bg-card p-7">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-display text-[18px] font-semibold text-ink">Study Roadmap · {roadmap.length}-Day Sprint</h2>
                  <div className="flex gap-3 text-[12px] text-muted">
                    <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-cyan" /> Core</span>
                    <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-teal" /> Revision</span>
                    <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-danger" /> Mock</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {roadmap.map((d, i) => {
                    const today = d.day.includes("Today");
                    return (
                      <div
                        key={i}
                        className={`flex h-32 flex-col rounded-xl border p-3 ${
                          today ? "border-2 border-cyan bg-card shadow-[0_8px_24px_rgba(79,70,229,0.15)]" : "border-line bg-surface"
                        }`}
                      >
                        <span className={`text-[12px] font-bold ${today ? "text-cyan" : "text-ink"}`}>{d.day}</span>
                        <div className="mt-2 space-y-1.5">
                          {d.items.map((it, j) => (
                            <div key={j} className={`rounded px-1.5 py-1 text-[11px] font-medium leading-tight ${CHIP[it.kind] ?? "text-muted"}`}>
                              {it.text}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Readiness + regenerate */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="flex flex-col items-center justify-center rounded-2xl border border-line bg-card p-6 text-center">
                  <div className="relative mb-4 flex size-24 items-center justify-center">
                    <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="42" fill="transparent" stroke="var(--color-surface)" strokeWidth="8" />
                      <circle cx="50" cy="50" r="42" fill="transparent" stroke="#4f46e5" strokeWidth="8" strokeLinecap="round" strokeDasharray="264" strokeDashoffset={264 - (264 * plan.readiness) / 100} />
                    </svg>
                    <span className="font-display text-[22px] font-bold text-ink">{plan.readiness}%</span>
                  </div>
                  <h4 className="text-[14px] font-semibold text-ink">Ready for Exam</h4>
                  <p className="mt-1 px-2 text-[12px] text-muted">Estimated from your activity. Aim for 85%+.</p>
                </div>
                <div className="flex flex-col justify-center rounded-2xl border border-line bg-card p-6">
                  <h4 className="mb-2 font-display text-[15px] font-semibold text-ink">Need a fresh plan?</h4>
                  <p className="mb-4 text-[13px] text-muted">Regenerate the roadmap for a new exam or date.</p>
                  <form action={generateStudyPlan} className="space-y-2">
                    <input name="targetExam" defaultValue={plan.targetExam} className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-[13px] text-ink outline-none focus:border-cyan/50" />
                    <input name="examDate" type="date" className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-[13px] text-ink outline-none focus:border-cyan/50" />
                    <SubmitButton loadingText="Regenerating…" className="w-full rounded-lg bg-cyan py-2 text-[13px] font-semibold text-on-accent disabled:opacity-60">Regenerate</SubmitButton>
                  </form>
                </div>
              </div>
            </div>

            {/* Reminders */}
            <div className="col-span-12 space-y-6 lg:col-span-4">
              <div className="rounded-2xl border border-line border-l-4 border-l-teal bg-card p-6">
                <h2 className="mb-6 flex items-center gap-2 font-display text-[17px] font-semibold text-ink">
                  <BellIcon size={18} className="text-teal" />
                  Smart Reminders
                </h2>
                <div className="space-y-5">
                  {REMINDERS.map((r) => (
                    <label key={r.title} className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[13.5px] font-semibold text-ink">{r.title}</p>
                        <p className="text-[11.5px] text-muted">{r.note}</p>
                      </div>
                      <span className={`relative h-5 w-10 shrink-0 rounded-full ${r.on ? "bg-teal" : "bg-raised"}`}>
                        <span className={`absolute top-1 size-3 rounded-full bg-card transition-transform ${r.on ? "right-1" : "left-1"}`} />
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

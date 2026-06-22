import Link from "next/link";
import { prisma } from "@studentos/db";
import { AppShell } from "@/components/app-shell";
import { AskAiButton } from "@/components/ask-ai-button";
import { LinkButton } from "@/components/ui/button";
import { DocumentRow } from "@/components/document-row";
import { requireOnboardedUser, shellUserFrom } from "@/lib/user";
import { quotaStatus } from "@/lib/entitlements";
import { getDsaProgress } from "@/lib/dsa/practice";
import {
  ResumeIcon,
  MicIcon,
  CodeIcon,
  GearIcon,
  PencilIcon,
  SlidesIcon,
  BotIcon,
} from "@/components/icons";

const TOOLS = [
  { label: "Assignments", href: "/assignments", icon: PencilIcon, meta: "Snap & solve", accent: "danger" },
  { label: "Reports & PPT", href: "/reports", icon: SlidesIcon, meta: "Your college format", accent: "cyan" },
  { label: "Resume Builder", href: "/resume", icon: ResumeIcon, meta: "ATS-ready format", accent: "cyan" },
  { label: "Interview Prep", href: "/interview", icon: MicIcon, meta: "AI mock rounds", accent: "indigo" },
  { label: "DSA Practice", href: "/dsa", icon: CodeIcon, meta: "Practice + streak", accent: "success" },
  { label: "Project Ideas", href: "/projects", icon: GearIcon, meta: "Ideas + builder", accent: "warning" },
] as const;

const ACCENT: Record<string, { bg: string; text: string; ring: string }> = {
  cyan: { bg: "bg-cyan/12", text: "text-cyan", ring: "hover:border-cyan/35" },
  indigo: { bg: "bg-indigo/12", text: "text-indigo", ring: "hover:border-indigo/35" },
  success: { bg: "bg-success/12", text: "text-success", ring: "hover:border-success/35" },
  warning: { bg: "bg-warning/12", text: "text-warning", ring: "hover:border-warning/35" },
  danger: { bg: "bg-danger/12", text: "text-danger", ring: "hover:border-danger/35" },
};

const NEXT_VERSION = [
  "Study planner & exam reminders",
  "DSA leaderboard for your branch",
  "Shareable public profile",
];

/** Greeting based on the time of day in India (the app's primary audience). */
function greeting(): string {
  const hour = Number(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata", hour: "numeric", hour12: false }),
  );
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  const pct = limit === null ? 0 : Math.min(100, Math.round((used / limit) * 100));
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[12px]">
        <span className="text-soft">{label}</span>
        <span className="text-faint">{limit === null ? `${used} · unlimited` : `${used}/${limit}`}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full bg-accent-gradient"
          style={{ width: limit === null ? "8%" : `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const user = await requireOnboardedUser();
  const firstName = user.name?.split(" ")[0] ?? "there";
  // Coding track gating: hide DSA from the default grid for non-coding students (fail-open).
  const tools = TOOLS.filter((t) => user.codingEnabled !== false || t.href !== "/dsa");

  // Real data for this user (a brand-new account shows honest zeros).
  const [assignmentQ, reportQ, pptQ, dsa, recentDocs, totalDocs] = await Promise.all([
    quotaStatus(user, "ASSIGNMENT"),
    quotaStatus(user, "REPORT"),
    quotaStatus(user, "PPT"),
    getDsaProgress(user.id),
    prisma.document.findMany({
      where: { ownerId: user.id },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    prisma.document.count({ where: { ownerId: user.id } }),
  ]);

  return (
    <AppShell user={shellUserFrom(user)}>
      <div className="mx-auto flex max-w-[1180px] flex-col gap-6 xl:flex-row">
        {/* LEFT COLUMN */}
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          {/* Hero */}
          <section className="relative overflow-hidden rounded-[18px] border border-line bg-gradient-to-br from-[#0f1a2e] to-[#101428] px-6 py-7 sm:px-7">
            <div className="pointer-events-none absolute -right-10 -top-24 size-[280px] animate-aurora rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.18),transparent_70%)]" />
            <div className="pointer-events-none absolute -bottom-28 right-28 size-[240px] animate-aurora2 rounded-full bg-[radial-gradient(circle,rgba(129,140,248,0.16),transparent_70%)]" />
            <div className="relative">
              <p className="mb-1 text-[13px] text-muted">
                {greeting()}, {firstName} 👋
              </p>
              <h1 className="mb-4 font-display text-[22px] font-bold leading-tight tracking-tight text-ink sm:text-[25px]">
                Your AI academic workspace — ready to create something.
              </h1>
              <div className="flex flex-wrap gap-3">
                <LinkButton
                  href="/reports"
                  className="rounded-xl bg-accent-gradient px-[18px] py-2.5 text-[13.5px] font-semibold text-on-accent shadow-[0_6px_18px_rgba(34,211,238,0.3)] transition-transform hover:-translate-y-0.5"
                >
                  Generate a report →
                </LinkButton>
                <LinkButton
                  href="/assignments"
                  className="rounded-xl border border-line-strong bg-white/5 px-[18px] py-2.5 text-[13.5px] font-semibold text-soft transition-colors hover:bg-white/10"
                >
                  Solve an assignment
                </LinkButton>
                <AskAiButton className="rounded-xl border border-cyan/20 bg-cyan/8 px-[18px] py-2.5 text-[13.5px] font-semibold text-cyan transition-colors hover:bg-cyan/12">
                  Ask StudentOS AI
                </AskAiButton>
              </div>
            </div>
          </section>

          {/* Stats row — one soft panel with hairline-separated cells (less boxy) */}
          <section className="grid grid-cols-2 overflow-hidden rounded-2xl bg-card/70 sm:grid-cols-4">
            {[
              { label: "Total documents", value: totalDocs, icon: "📄" },
              { label: "Assignments", value: assignmentQ.used, icon: "📝" },
              { label: "Reports & PPTs", value: reportQ.used + pptQ.used, icon: "📊" },
              {
                label: "DSA streak",
                value: dsa.streak.current > 0 ? `${dsa.streak.current}d` : "—",
                icon: dsa.streak.current > 0 ? "🔥" : "💻",
              },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className={`p-4 transition-colors hover:bg-white/[0.03] ${i % 2 === 1 ? "border-l border-line/50" : ""} ${i >= 2 ? "border-t border-line/50" : ""} sm:border-t-0 ${i > 0 ? "sm:border-l sm:border-line/50" : ""}`}
              >
                <span className="mb-2 block text-lg">{stat.icon}</span>
                <p className="font-display text-xl font-bold text-ink">{stat.value}</p>
                <p className="mt-0.5 text-[11.5px] text-faint">{stat.label}</p>
              </div>
            ))}
          </section>

          {/* Quick actions */}
          <section>
            <div className="mb-3.5 flex items-center justify-between">
              <h2 className="font-display text-[16px] font-semibold text-ink">Jump back in</h2>
              <span className="text-[12.5px] text-faint">{tools.length} tools</span>
            </div>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
              {tools.map((tool) => {
                const a = ACCENT[tool.accent];
                const Icon = tool.icon;
                return (
                  <Link
                    key={tool.href}
                    href={tool.href}
                    className={`group rounded-2xl border border-line/50 bg-card/70 p-4 transition-all hover:-translate-y-1 hover:bg-card hover:shadow-[0_14px_30px_rgba(0,0,0,0.35)] ${a.ring}`}
                  >
                    <span className={`mb-3 flex size-10 items-center justify-center rounded-xl ${a.bg}`}>
                      <Icon size={20} className={a.text} />
                    </span>
                    <p className="mb-0.5 text-sm font-semibold text-ink">{tool.label}</p>
                    <p className="text-xs text-faint">{tool.meta}</p>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* Recent work */}
          <section>
            <div className="mb-3.5 flex items-center justify-between">
              <h2 className="font-display text-[16px] font-semibold text-ink">Recent work</h2>
              <Link href="/vault" className="text-[12px] font-semibold text-cyan">
                Open vault ↗
              </Link>
            </div>
            {recentDocs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-line-strong bg-card/50 p-8 text-center">
                <p className="text-[14px] text-muted">Nothing here yet.</p>
                <p className="mt-1 text-[12.5px] text-faint">
                  Generate a report, deck or assignment and it&apos;ll show up here automatically.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {recentDocs.map((d) => (
                  <DocumentRow key={d.id} doc={d} />
                ))}
              </div>
            )}
          </section>
        </div>

        {/* RIGHT COLUMN */}
        <div className="flex w-full flex-col gap-4 xl:w-[300px] xl:shrink-0">
          {/* This month — real quota usage */}
          <section className="rounded-2xl border border-line/50 bg-card/70 p-[18px]">
            <h3 className="mb-3.5 text-[13.5px] font-semibold text-ink">This month</h3>
            <div className="flex flex-col gap-3.5">
              <UsageBar label="Assignments" used={assignmentQ.used} limit={assignmentQ.limit} />
              <UsageBar label="Reports" used={reportQ.used} limit={reportQ.limit} />
              <UsageBar label="Presentations" used={pptQ.used} limit={pptQ.limit} />
            </div>
            <p className="mt-3.5 border-t border-line pt-3 text-[11.5px] text-faint">
              {user.plan === "FREE"
                ? "Free plan — limits reset on the 1st."
                : `${user.plan} plan — generous limits.`}
            </p>
          </section>

          {/* DSA streak — real */}
          <section className="rounded-2xl border border-line/50 bg-card/70 p-[18px]">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-[13.5px] font-semibold text-ink">DSA streak</h3>
              <Link href="/dsa" className="text-[11.5px] font-semibold text-cyan">
                Practice ↗
              </Link>
            </div>
            {dsa.streak.current > 0 ? (
              <>
                <div className="flex items-end gap-2">
                  <span className="inline-block animate-flame text-2xl">🔥</span>
                  <span className="font-display text-3xl font-bold text-warning">{dsa.streak.current}</span>
                  <span className="pb-1 text-[12px] text-faint">day{dsa.streak.current === 1 ? "" : "s"}</span>
                </div>
                <p className="mt-1 text-[11.5px] text-faint">
                  {dsa.streak.practicedToday
                    ? `Solved today · ${dsa.solvedCount} problem${dsa.solvedCount === 1 ? "" : "s"} total`
                    : "Practice today to keep it alive."}
                </p>
              </>
            ) : (
              <p className="mt-1 text-[12.5px] text-muted">
                No streak yet — solve a problem today to start one. 🔥
              </p>
            )}
          </section>

          {/* AI assistant */}
          <section className="rounded-2xl border border-cyan/20 bg-gradient-to-br from-cyan/10 to-indigo/[0.08] p-4">
            <div className="mb-3 flex items-center gap-2.5">
              <span className="flex size-7 items-center justify-center rounded-lg bg-accent-gradient">
                <BotIcon size={15} className="text-on-accent" />
              </span>
              <p className="text-[13.5px] font-semibold text-ink">StudentOS AI</p>
            </div>
            <p className="mb-3 text-[12.5px] leading-relaxed text-soft">
              Stuck on a concept, an assignment, or a project? Ask anytime — it knows your branch and your work.
            </p>
            <AskAiButton className="w-full rounded-[10px] bg-accent-gradient py-2.5 text-[12.5px] font-semibold text-on-accent transition-transform hover:-translate-y-0.5">
              Ask a question
            </AskAiButton>
          </section>

          {/* Coming soon — honest next-version */}
          <section className="rounded-2xl border border-line/50 bg-card/70 p-[18px]">
            <h3 className="mb-3 text-[13.5px] font-semibold text-ink">Coming soon</h3>
            <ul className="flex flex-col gap-2.5">
              {NEXT_VERSION.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-[12.5px] text-muted">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-cyan/60" />
                  {f}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </AppShell>
  );
}

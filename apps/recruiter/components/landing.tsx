import Link from "next/link";
import { Logo } from "@/components/logo";
import { BadgeCheckIcon, ChatIcon, BarChartIcon, VideoIcon } from "@/components/icons";
import { RecruiterProfileMockup, DsaScoreboardMockup, LiveInterviewRoomMockup } from "./landing-mockups";

/**
 * Marketing pitch shown to logged-out visitors on recruiter.krackit.in — signed-in recruiters
 * never see this (app/page.tsx routes them through the existing guard → /students, unchanged).
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const SUPPORTING_FEATURES = [
  {
    Icon: BadgeCheckIcon,
    title: "Proof-of-work profiles",
    desc: "Every candidate comes with real projects, reports, and code — not just a one-page resume.",
  },
  {
    Icon: ChatIcon,
    title: "Direct messaging",
    desc: "Talk to candidates directly on the platform. No agencies, no middlemen, no spam folders.",
  },
];

const STEPS = [
  { num: "01", title: "Apply for access", desc: "Sign in and tell us about your company. We verify every recruiter before they see student data." },
  { num: "02", title: "Search real work", desc: "Filter students by skills, projects, DSA performance, and interview readiness." },
  { num: "03", title: "Interview & hire", desc: "Message candidates, schedule live coding interviews, and make offers — all in one place." },
];

export function RecruiterLanding() {
  return (
    <div className="min-h-screen overflow-hidden bg-canvas">
      {/* NAV */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-line bg-canvas/80 backdrop-blur-lg">
        <div className="mx-auto flex h-[64px] max-w-7xl items-center justify-between px-5">
          <Logo size={30} suffix="Recruiter" />
          <div className="flex items-center gap-2">
            <a
              href={APP_URL}
              className="hidden rounded-xl px-4 py-2 text-[13px] font-semibold text-soft transition-colors hover:bg-surface sm:block"
            >
              For Students
            </a>
            <Link
              href="/sign-in"
              className="rounded-xl bg-cyan px-4 py-2 text-[13px] font-semibold text-on-accent transition-transform hover:-translate-y-0.5"
            >
              Sign in
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative mx-auto grid min-h-screen max-w-7xl items-center gap-10 px-5 pt-28 pb-16 lg:grid-cols-[1fr_1.05fr] lg:gap-6 lg:pt-24">
        <div className="pointer-events-none absolute -top-40 left-1/4 size-[560px] rounded-full bg-[radial-gradient(circle,rgba(129,140,248,0.08),transparent_70%)]" />

        <div className="relative text-center lg:text-left">
          <div className="mb-6 inline-block rounded-full border border-cyan/20 bg-cyan/8 px-4 py-1.5 text-[12px] font-semibold tracking-wide text-cyan">
            krackit for Recruiters
          </div>

          <h1 className="font-display text-[38px] font-bold leading-[1.1] tracking-tight text-ink sm:text-[50px] lg:text-[54px]">
            Hire students who&apos;ve
            <span className="mt-2 block bg-gradient-to-r from-cyan to-indigo bg-clip-text text-transparent">
              already proved it.
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-[500px] text-[16px] leading-relaxed text-muted lg:mx-0">
            Skip resume roulette. On krackit, every student profile is backed by real projects, real
            DSA scores, and real interview practice — so you can hire on evidence, not keywords.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4 lg:justify-start">
            <Link
              href="/sign-in"
              className="rounded-xl bg-cyan px-[26px] py-3 text-[15px] font-semibold text-on-accent shadow-[0_8px_28px_rgba(6,182,212,0.25)] transition-all hover:-translate-y-0.5"
            >
              Get recruiter access →
            </Link>
            <a
              href={APP_URL}
              className="rounded-xl border border-line-strong bg-surface px-[26px] py-3 text-[15px] font-semibold text-soft transition-all hover:border-cyan/30"
            >
              I&apos;m a student
            </a>
          </div>
          <p className="mt-4 text-[12px] text-faint">
            Every recruiter account is manually verified before activation.
          </p>
        </div>

        <div className="relative">
          <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[32px] bg-[radial-gradient(circle,rgba(129,140,248,0.1),transparent_70%)]" />
          <RecruiterProfileMockup />
        </div>
      </section>

      {/* FEATURES — alternating, each backed by a real screen (same pattern as app.krackit.in) */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-7xl px-5 py-24">
          <div className="mb-16 text-center">
            <h2 className="font-display text-[30px] font-bold text-ink sm:text-[36px]">
              Everything you need to find real talent
            </h2>
            <p className="mt-3 text-[15px] text-muted">
              Sourcing, screening, and interviewing — in one verified pipeline.
            </p>
          </div>

          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
            <div>
              <span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-teal/20 to-teal/5 text-teal">
                <BarChartIcon size={20} />
              </span>
              <h3 className="font-display text-[22px] font-semibold text-ink">Verified DSA scores</h3>
              <p className="mt-2.5 max-w-[420px] text-[14px] leading-relaxed text-muted">
                Problems solved on-platform with real code execution. Sort and filter candidates by
                actual skill, not a claimed skill rating on a resume.
              </p>
            </div>
            <DsaScoreboardMockup />
          </div>

          <div className="mt-20 grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
            <div className="lg:order-2">
              <span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-cyan/20 to-cyan/5 text-cyan">
                <VideoIcon size={20} />
              </span>
              <h3 className="font-display text-[22px] font-semibold text-ink">Live interview rooms</h3>
              <p className="mt-2.5 max-w-[420px] text-[14px] leading-relaxed text-muted">
                Run live coding interviews with a collaborative editor and AI question suggestions,
                built in — no separate scheduling tool or screen-share hack.
              </p>
            </div>
            <div className="lg:order-1">
              <LiveInterviewRoomMockup />
            </div>
          </div>

          <div className="mt-20 grid gap-4 sm:grid-cols-2">
            {SUPPORTING_FEATURES.map((f) => (
              <div
                key={f.title}
                className="group rounded-2xl border border-line bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-cyan/20 hover:shadow-[0_14px_40px_rgba(15,23,42,0.1)]"
              >
                <span className="mb-3 flex size-10 items-center justify-center rounded-lg bg-surface text-cyan">
                  <f.Icon size={18} />
                </span>
                <h4 className="font-display text-[15.5px] font-semibold text-ink">{f.title}</h4>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="border-t border-line bg-surface/40">
        <div className="mx-auto max-w-7xl px-5 py-24">
          <div className="mb-14 text-center">
            <h2 className="font-display text-[30px] font-bold text-ink sm:text-[36px]">How it works</h2>
            <p className="mt-3 text-[15px] text-muted">Verified access in three steps.</p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.num} className="text-center">
                <span className="mb-4 inline-flex size-12 items-center justify-center rounded-xl bg-cyan text-[16px] font-bold text-on-accent shadow-lg">
                  {step.num}
                </span>
                <h3 className="mb-1.5 font-display text-[18px] font-semibold text-ink">{step.title}</h3>
                <p className="mx-auto max-w-[300px] text-[13.5px] leading-relaxed text-muted">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-3xl px-5 py-24 text-center">
          <h2 className="font-display text-[30px] font-bold text-ink sm:text-[36px]">
            Your next great hire is already building.
          </h2>
          <p className="mt-3 text-[15px] text-muted">
            Join the recruiters who see student work before the rest of the market does.
          </p>
          <Link
            href="/sign-in"
            className="mt-8 inline-block rounded-xl bg-cyan px-[26px] py-3 text-[15px] font-semibold text-on-accent shadow-[0_8px_28px_rgba(6,182,212,0.25)] transition-all hover:-translate-y-0.5"
          >
            Get recruiter access →
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-6">
          <Logo size={24} suffix="Recruiter" />
          <div className="flex gap-5 text-[12.5px] text-faint">
            <a href={`${APP_URL}/privacy`} className="transition-colors hover:text-soft">Privacy</a>
            <a href={`${APP_URL}/terms`} className="transition-colors hover:text-soft">Terms</a>
          </div>
          <p className="text-[12px] text-faint">© {new Date().getFullYear()} Quorium Technologies</p>
        </div>
      </footer>
    </div>
  );
}

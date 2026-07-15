import { Logo, LogoMark } from "@/components/logo";
import { Reveal } from "@/components/reveal";
import { ReportMockup } from "./mockups";

/**
 * The brand home at krackit.in — not a student pitch (that lives on app.krackit.in) but the
 * front door for BOTH audiences: pick "I'm a student" or "I'm a recruiter" and get routed to
 * the right app, plus company/contact info so the product has a real identity behind it.
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const RECRUITER_URL = process.env.NEXT_PUBLIC_RECRUITER_APP_URL ?? "http://localhost:3200";
const CONTACT_EMAIL = "support@krackit.in";

const STUDENT_POINTS = [
  "Assignments, reports & PPTs in your college's exact format",
  "AI mock interviews with real-time feedback",
  "DSA practice with code execution & streaks",
  "ATS-ready resumes and a proof-of-work profile",
];

const RECRUITER_POINTS = [
  "Students with verified projects, not just resumes",
  "Real DSA scores and interview performance",
  "Live coding interview rooms, built in",
  "Direct messaging — no middlemen, no spam",
];

export function RootLanding() {
  return (
    <div className="min-h-screen overflow-hidden bg-canvas">
      {/* NAV */}
      <header className="animate-fade-in-up fixed inset-x-0 top-0 z-50 border-b border-line bg-base/80 backdrop-blur-lg">
        <div className="mx-auto flex h-[64px] max-w-7xl items-center justify-between px-5">
          <Logo size={30} />
          <div className="flex items-center gap-2">
            <a href={APP_URL} className="hidden rounded-xl px-4 py-2 text-[13px] font-semibold text-soft transition-colors hover:bg-surface sm:block">
              Students
            </a>
            <a href={RECRUITER_URL} className="hidden rounded-xl px-4 py-2 text-[13px] font-semibold text-soft transition-colors hover:bg-surface sm:block">
              Recruiters
            </a>
            <a href="#contact" className="hidden rounded-xl px-4 py-2 text-[13px] font-semibold text-soft transition-colors hover:bg-surface sm:block">
              Contact
            </a>
            {/* One login for both audiences — an already-signed-in recruiter lands straight
                back on recruiter.krackit.in with no second sign-in (route-after-login). */}
            <a
              href={`${APP_URL}/sign-in`}
              className="rounded-xl px-4 py-2 text-[13px] font-semibold text-soft transition-colors hover:bg-surface"
            >
              Login
            </a>
            <a
              href={`${APP_URL}/sign-up`}
              className="rounded-xl bg-accent-gradient px-4 py-2 text-[13px] font-semibold text-on-accent transition-transform hover:-translate-y-0.5"
            >
              Get started
            </a>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative mx-auto flex min-h-screen max-w-7xl flex-col items-center justify-center px-5 pb-16 pt-28 text-center">
        <div className="pointer-events-none absolute -top-40 left-1/2 size-[600px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(246,146,30,0.08),transparent_70%)] animate-float-drift" />

        <div className="relative w-full">
          <div className="animate-fade-in-up mb-6 inline-block rounded-full border border-cyan/20 bg-cyan/8 px-4 py-1.5 text-[12px] font-semibold tracking-wide text-cyan">
            <span className="mr-2 inline-block size-1.5 animate-pulse-ring rounded-full bg-cyan" />
            The career operating system for students
          </div>

          <h1 className="font-display text-[40px] font-bold leading-[1.08] tracking-tight text-ink sm:text-[54px] lg:text-[62px]">
            <span className="animate-fade-in-up stagger-1 block">Crack college. Crack interviews.</span>
            <span className="animate-fade-in-up stagger-2 mt-2 block">
              <span className="animate-gradient-shift bg-gradient-to-r from-cyan via-indigo to-cyan bg-clip-text text-transparent">
                Crack your career.
              </span>
            </span>
          </h1>

          <p className="animate-fade-in-up stagger-3 mx-auto mt-5 max-w-[600px] text-[16px] leading-relaxed text-muted">
            One platform where students create, practice, and prove their work — and recruiters hire
            on evidence, not buzzwords. Whichever side you&apos;re on, krackit gets you there faster.
          </p>

          <div className="animate-fade-in-up stagger-4 mx-auto mt-10 max-w-3xl">
            <ReportMockup />
          </div>

          {/* THE CHOICE — the whole point of this page */}
          <div className="animate-fade-in-up stagger-5 mx-auto mt-10 grid w-full max-w-4xl gap-5 text-left md:grid-cols-2">
            <a
              href={APP_URL}
              className="group relative overflow-hidden rounded-3xl border border-line bg-card p-7 transition-all duration-300 hover:-translate-y-1.5 hover:border-cyan/40 hover:shadow-[0_18px_50px_rgba(246,146,30,0.18)]"
            >
              <div className="pointer-events-none absolute -right-12 -top-12 size-40 rounded-full bg-[radial-gradient(circle,rgba(246,146,30,0.14),transparent_70%)] transition-transform duration-500 group-hover:scale-125" />
              <span className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-accent-gradient text-2xl shadow-[0_8px_20px_rgba(246,146,30,0.3)]">
                🎓
              </span>
              <h2 className="font-display text-[22px] font-bold text-ink">I&apos;m a student</h2>
              <p className="mt-1 text-[13.5px] text-muted">Create, practice, and get hired.</p>
              <ul className="mt-4 space-y-2">
                {STUDENT_POINTS.map((p) => (
                  <li key={p} className="flex items-start gap-2 text-[13px] leading-relaxed text-soft">
                    <span className="mt-0.5 text-cyan">✓</span>
                    {p}
                  </li>
                ))}
              </ul>
              <span className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-accent-gradient px-5 py-2.5 text-[13.5px] font-semibold text-on-accent transition-transform group-hover:translate-x-1">
                Enter as a student →
              </span>
            </a>

            <a
              href={RECRUITER_URL}
              className="group relative overflow-hidden rounded-3xl border border-line bg-card p-7 transition-all duration-300 hover:-translate-y-1.5 hover:border-indigo/40 hover:shadow-[0_18px_50px_rgba(129,140,248,0.18)]"
            >
              <div className="pointer-events-none absolute -right-12 -top-12 size-40 rounded-full bg-[radial-gradient(circle,rgba(129,140,248,0.14),transparent_70%)] transition-transform duration-500 group-hover:scale-125" />
              <span className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo/80 to-violet/70 text-2xl shadow-[0_8px_20px_rgba(129,140,248,0.3)]">
                💼
              </span>
              <h2 className="font-display text-[22px] font-bold text-ink">I&apos;m a recruiter</h2>
              <p className="mt-1 text-[13.5px] text-muted">Hire on proof, not promises.</p>
              <ul className="mt-4 space-y-2">
                {RECRUITER_POINTS.map((p) => (
                  <li key={p} className="flex items-start gap-2 text-[13px] leading-relaxed text-soft">
                    <span className="mt-0.5 text-indigo">✓</span>
                    {p}
                  </li>
                ))}
              </ul>
              <span className="mt-6 inline-flex items-center gap-1.5 rounded-xl border border-indigo/40 bg-indigo/10 px-5 py-2.5 text-[13.5px] font-semibold text-ink transition-transform group-hover:translate-x-1">
                Enter as a recruiter →
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* COMPANY + CONTACT */}
      <section id="contact" className="border-t border-line bg-surface/40">
        <Reveal>
          <div className="mx-auto max-w-5xl px-5 py-20">
            <div className="grid items-start gap-10 md:grid-cols-2">
              <div>
                <LogoMark size={40} />
                <h2 className="mt-5 font-display text-[26px] font-bold text-ink">
                  Built by Quorium Technologies
                </h2>
                <p className="mt-3 max-w-[440px] text-[14.5px] leading-relaxed text-muted">
                  krackit is a Quorium Technologies product, built in India for students everywhere.
                  We believe careers should be won on proof of work — so we built the platform that
                  lets students create it and recruiters see it.
                </p>
              </div>
              <div className="rounded-2xl border border-line bg-card p-7">
                <h3 className="font-display text-[17px] font-semibold text-ink">Get in touch</h3>
                <p className="mt-1 text-[13px] text-muted">
                  Questions, partnerships, or campus programs — we reply fast.
                </p>
                <div className="mt-5 space-y-3">
                  <a
                    href={`mailto:${CONTACT_EMAIL}`}
                    className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-[13.5px] font-semibold text-ink transition-colors hover:border-cyan/30"
                  >
                    <span className="text-[16px]">✉️</span> {CONTACT_EMAIL}
                  </a>
                  <a
                    href={`${APP_URL}/support`}
                    className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-[13.5px] font-semibold text-ink transition-colors hover:border-cyan/30"
                  >
                    <span className="text-[16px]">💬</span> In-app support
                  </a>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* FOOTER */}
      <Reveal>
        <footer className="border-t border-line">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-6">
            <Logo size={24} />
            <div className="flex gap-5 text-[12.5px] text-faint">
              <a href={`${APP_URL}/privacy`} className="transition-colors hover:text-soft">Privacy</a>
              <a href={`${APP_URL}/terms`} className="transition-colors hover:text-soft">Terms</a>
              <a href={`mailto:${CONTACT_EMAIL}`} className="transition-colors hover:text-soft">{CONTACT_EMAIL}</a>
            </div>
            <p className="text-[12px] text-faint">© {new Date().getFullYear()} Quorium Technologies</p>
          </div>
        </footer>
      </Reveal>
    </div>
  );
}

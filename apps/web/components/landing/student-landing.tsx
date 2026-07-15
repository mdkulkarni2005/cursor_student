import Link from "next/link";
import { Logo } from "@/components/logo";
import { Reveal } from "@/components/reveal";
import { ReportMockup, InterviewMockup, DsaMockup } from "./mockups";

/**
 * The student-facing pitch, served on app.krackit.in for logged-out visitors (the root domain
 * krackit.in shows the brand chooser instead — see root-landing.tsx). Sign-in/sign-up links are
 * relative because this page always renders on the app host.
 */

const RECRUITER_URL = process.env.NEXT_PUBLIC_RECRUITER_APP_URL ?? "http://localhost:3200";

const PRICING = [
  { name: "Free", price: 0, tagline: "Get started with the essentials.", features: ["50 AI Credits / month", "A few reports, PPTs & assignments", "DSA practice & streaks"], highlight: false },
  { name: "Pro", price: 499, tagline: "For students who ship every week.", features: ["500 AI Credits / month", "Unlimited reports, PPTs & assignments", "Priority generation queue"], highlight: true },
  { name: "Premium", price: 999, tagline: "Everything, unlimited.", features: ["Unlimited AI Credits", "Everything in Pro", "1:1 mentor reviews"], highlight: false },
];

const SUPPORTING_FEATURES = [
  { title: "Resume Builder", desc: "ATS-ready resumes tailored to your branch, skills, and experience level.", icon: "📄" },
  { title: "Reports & PPTs", desc: "Structured reports and slide decks that match your department's format.", icon: "📊" },
  { title: "Project Ideas", desc: "Personalized project ideas with step-by-step builders for your domain.", icon: "⚡" },
];

const CAPABILITIES = [
  { value: "6", label: "generation tools in one workspace" },
  { value: "1:1", label: "college-format matching, not generic templates" },
  { value: "Real", label: "code execution on every DSA submission" },
  { value: "Live", label: "AI voice interviews, not scripted quizzes" },
];

const STEPS = [
  { num: "01", title: "Sign up", desc: "Create your account with your college email — it takes 30 seconds." },
  { num: "02", title: "Set your context", desc: "Tell us your branch, semester, and goals. We'll tailor everything." },
  { num: "03", title: "Start creating", desc: "Generate assignments, reports, resumes, and more — all in your format." },
];

export function StudentLanding() {
  return (
    <div className="min-h-screen overflow-hidden bg-canvas">
      {/* NAV */}
      <header className="animate-fade-in-up fixed inset-x-0 top-0 z-50 border-b border-line bg-base/80 backdrop-blur-lg">
        <div className="mx-auto flex h-[64px] max-w-7xl items-center justify-between px-5">
          <Link href="/">
            <Logo size={30} />
          </Link>
          <div className="flex items-center gap-2">
            <a
              href="#pricing"
              className="hidden rounded-xl px-4 py-2 text-[13px] font-semibold text-soft transition-colors hover:bg-surface sm:block"
            >
              Pricing
            </a>
            <a
              href={RECRUITER_URL}
              className="hidden rounded-xl px-4 py-2 text-[13px] font-semibold text-soft transition-colors hover:bg-surface sm:block"
            >
              For Recruiters
            </a>
            <Link
              href="/sign-in"
              className="rounded-xl px-4 py-2 text-[13px] font-semibold text-soft transition-colors hover:bg-surface"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="rounded-xl bg-accent-gradient px-4 py-2 text-[13px] font-semibold text-on-accent transition-transform hover:-translate-y-0.5"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative mx-auto grid min-h-screen max-w-7xl items-center gap-10 px-5 pt-28 pb-16 lg:grid-cols-[1.05fr_1fr] lg:gap-6 lg:pt-24">
        <div className="pointer-events-none absolute -top-40 left-1/4 size-[600px] rounded-full bg-[radial-gradient(circle,rgba(246,146,30,0.07),transparent_70%)] animate-float-drift" />

        <div className="relative text-center lg:text-left">
          <div className="animate-fade-in-up mb-6 inline-block rounded-full border border-cyan/20 bg-cyan/8 px-4 py-1.5 text-[12px] font-semibold tracking-wide text-cyan">
            <span className="mr-2 inline-block animate-pulse-ring size-1.5 rounded-full bg-cyan" />
            Your AI Academic Operating System
          </div>

          <h1 className="font-display text-[42px] font-bold leading-[1.1] tracking-tight text-ink sm:text-[54px] lg:text-[60px]">
            <span className="animate-fade-in-up block stagger-1">College work,</span>
            <span className="animate-fade-in-up block stagger-2 mt-2">
              <span className="animate-gradient-shift bg-gradient-to-r from-cyan via-indigo to-cyan bg-clip-text text-transparent">
                but actually fast.
              </span>
            </span>
          </h1>

          <p className="animate-fade-in-up stagger-3 mx-auto mt-5 max-w-[520px] text-[16px] leading-relaxed text-muted lg:mx-0">
            krackit generates assignments, reports, presentations, resumes, and more — all formatted to
            your college&apos;s standards. So you can focus on learning, not formatting.
          </p>

          <div className="animate-fade-in-up stagger-4 mt-8 flex flex-wrap items-center justify-center gap-4 lg:justify-start">
            <Link
              href="/sign-up"
              className="group relative rounded-xl bg-accent-gradient px-[26px] py-3 text-[15px] font-semibold text-on-accent shadow-[0_8px_28px_rgba(246,146,30,0.3)] transition-all hover:-translate-y-0.5"
            >
              <span className="absolute -inset-1 rounded-xl bg-accent-gradient opacity-0 blur-lg transition-opacity group-hover:opacity-60" />
              <span className="relative z-10">Get started free →</span>
            </Link>
            <Link
              href="/sign-in"
              className="rounded-xl border border-line-strong bg-surface px-[26px] py-3 text-[15px] font-semibold text-soft transition-all hover:bg-surface hover:border-cyan/30"
            >
              Sign in
            </Link>
          </div>
        </div>

        <div className="animate-fade-in-up stagger-3 relative">
          <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[32px] bg-[radial-gradient(circle,rgba(246,146,30,0.1),transparent_70%)]" />
          <ReportMockup />
        </div>
      </section>

      {/* FEATURES — alternating, each backed by a real screen */}
      <section className="mx-auto max-w-7xl px-5 py-24">
        <Reveal>
          <div className="mb-16 text-center">
            <h2 className="font-display text-[30px] font-bold text-ink sm:text-[36px]">
              Everything a student needs
            </h2>
            <p className="mt-3 text-[15px] text-muted">
              Six tools, one workspace. No more jumping between tabs.
            </p>
          </div>
        </Reveal>

        <Reveal>
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
            <div>
              <span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-cyan/20 to-cyan/5 text-xl">📝</span>
              <h3 className="font-display text-[22px] font-semibold text-ink">Assignments &amp; reports, in your college&apos;s format</h3>
              <p className="mt-2.5 max-w-[420px] text-[14px] leading-relaxed text-muted">
                Snap a photo or paste your question. Get back a fully formatted, correctly numbered
                document — headings, citations, and structure matching your department&apos;s exact style.
              </p>
            </div>
            <ReportMockup />
          </div>
        </Reveal>

        <Reveal>
          <div className="mt-20 grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
            <div className="lg:order-2">
              <span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald/20 to-emerald/5 text-xl">💻</span>
              <h3 className="font-display text-[22px] font-semibold text-ink">DSA practice with real code execution</h3>
              <p className="mt-2.5 max-w-[420px] text-[14px] leading-relaxed text-muted">
                Solve curated problems in a real editor. Your code actually runs against test cases —
                no guessing, no fake progress bars. Build a streak you can prove.
              </p>
            </div>
            <div className="lg:order-1">
              <DsaMockup />
            </div>
          </div>
        </Reveal>

        <Reveal>
          <div className="mt-20 grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
            <div>
              <span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet/20 to-violet/5 text-xl">🎙️</span>
              <h3 className="font-display text-[22px] font-semibold text-ink">AI mock interviews that actually push back</h3>
              <p className="mt-2.5 max-w-[420px] text-[14px] leading-relaxed text-muted">
                Practice live, voice-to-voice, with follow-up questions based on what you just said —
                then get a breakdown of what to fix before the real thing.
              </p>
            </div>
            <InterviewMockup />
          </div>
        </Reveal>

        <Reveal>
          <div className="mt-20 grid gap-4 sm:grid-cols-3">
            {SUPPORTING_FEATURES.map((f) => (
              <div
                key={f.title}
                className="group rounded-2xl border border-line bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-cyan/20 hover:shadow-[0_14px_40px_rgba(15,23,42,0.1)]"
              >
                <span className="mb-3 flex size-10 items-center justify-center rounded-lg bg-surface text-lg">{f.icon}</span>
                <h4 className="font-display text-[15.5px] font-semibold text-ink">{f.title}</h4>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{f.desc}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* FOR RECRUITERS */}
      <section className="border-t border-line bg-surface/40">
        <Reveal>
          <div className="mx-auto flex max-w-5xl flex-col items-center gap-8 px-5 py-20 text-center md:flex-row md:text-left">
            <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo/20 to-indigo/5 text-3xl">
              💼
            </div>
            <div className="flex-1">
              <h2 className="font-display text-[26px] font-bold text-ink sm:text-[30px]">Hiring campus talent?</h2>
              <p className="mt-2 max-w-[520px] text-[14.5px] leading-relaxed text-muted">
                krackit for Recruiters connects you directly with pre-vetted, portfolio-ready students —
                real projects, real DSA scores, real interview practice. No more sifting through generic resumes.
              </p>
            </div>
            <a
              href={RECRUITER_URL}
              className="shrink-0 rounded-xl border border-line-strong bg-card px-[26px] py-3 text-[15px] font-semibold text-ink transition-all hover:-translate-y-0.5 hover:border-indigo/30"
            >
              For Recruiters →
            </a>
          </div>
        </Reveal>
      </section>

      {/* HOW IT WORKS */}
      <section className="border-t border-line">
        <Reveal>
          <div className="mx-auto max-w-7xl px-5 py-24">
            <div className="mb-14 text-center">
              <h2 className="font-display text-[30px] font-bold text-ink sm:text-[36px]">
                How it works
              </h2>
              <p className="mt-3 text-[15px] text-muted">Three steps to your first generation.</p>
            </div>
            <div className="relative grid gap-8 md:grid-cols-3">
              <div className="pointer-events-none absolute left-[calc(16.666%+24px)] right-[calc(16.666%+24px)] top-6 hidden h-px bg-gradient-to-r from-cyan/40 via-indigo/40 to-cyan/40 md:block" />

              {STEPS.map((step, i) => (
                <Reveal key={step.num} delay={i * 150}>
                  <div className="relative text-center">
                    <span className="mb-4 inline-flex size-12 items-center justify-center rounded-xl bg-accent-gradient text-[16px] font-bold text-on-accent shadow-lg">
                      {step.num}
                    </span>
                    <h3 className="mb-1.5 font-display text-[18px] font-semibold text-ink">{step.title}</h3>
                    <p className="mx-auto max-w-[300px] text-[13.5px] leading-relaxed text-muted">{step.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* PRICING */}
      <section id="pricing" className="border-t border-line">
        <Reveal>
          <div className="mx-auto max-w-5xl px-5 py-24">
            <div className="mb-14 text-center">
              <h2 className="font-display text-[30px] font-bold text-ink sm:text-[36px]">Simple, honest pricing</h2>
              <p className="mt-3 text-[15px] text-muted">Start free. Upgrade the moment you need more.</p>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {PRICING.map((tier, i) => (
                <Reveal key={tier.name} delay={i * 100}>
                  <div
                    className={`relative flex h-full flex-col rounded-2xl border p-6 transition-all hover:-translate-y-1 ${
                      tier.highlight
                        ? "border-cyan/30 bg-cyan/5 shadow-[0_14px_40px_rgba(6,182,212,0.12)]"
                        : "border-line bg-card"
                    }`}
                  >
                    {tier.highlight && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent-gradient px-3 py-1 text-[11px] font-semibold text-on-accent">
                        Most popular
                      </span>
                    )}
                    <h3 className="font-display text-[18px] font-semibold text-ink">{tier.name}</h3>
                    <p className="mt-1 text-[13px] text-muted">{tier.tagline}</p>
                    <p className="mt-4">
                      <span className="font-display text-[32px] font-bold text-ink">₹{tier.price}</span>
                      <span className="text-[13px] text-faint">/month</span>
                    </p>
                    <ul className="mt-5 flex-1 space-y-2.5">
                      {tier.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-[13px] text-soft">
                          <span className="mt-0.5 text-cyan">✓</span>
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Link
                      href="/sign-up"
                      className={`mt-6 rounded-xl px-4 py-2.5 text-center text-[13.5px] font-semibold transition-all ${
                        tier.highlight
                          ? "bg-accent-gradient text-on-accent hover:-translate-y-0.5"
                          : "border border-line-strong bg-surface text-soft hover:border-cyan/30"
                      }`}
                    >
                      {tier.price === 0 ? "Get started free" : `Get ${tier.name}`}
                    </Link>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* CAPABILITIES — honest, no invented numbers */}
      <section className="border-t border-line">
        <Reveal>
          <div className="mx-auto max-w-5xl px-5 py-20">
            <p className="mb-8 text-center text-[12px] font-semibold uppercase tracking-[0.14em] text-faint">
              What&apos;s actually live today
            </p>
            <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
              {CAPABILITIES.map((stat, i) => (
                <Reveal key={stat.label} delay={i * 100}>
                  <div className="rounded-2xl border border-line bg-card p-6 text-center transition-all hover:border-cyan/20">
                    <p className="font-display text-[24px] font-bold text-ink">{stat.value}</p>
                    <p className="mt-1.5 text-[12px] leading-snug text-faint">{stat.label}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* CTA */}
      <section className="relative border-t border-line overflow-hidden">
        <div className="pointer-events-none absolute -left-20 -top-20 size-[400px] animate-float-drift rounded-full bg-[radial-gradient(circle,rgba(246,146,30,0.05),transparent_70%)]" />
        <Reveal>
          <div className="relative mx-auto max-w-3xl px-5 py-24 text-center">
            <h2 className="font-display text-[30px] font-bold text-ink sm:text-[36px]">
              Ready to stop fighting formatting?
            </h2>
            <p className="mt-3 text-[15px] text-muted">
              Create your first document in under two minutes — free, no card required.
            </p>
            <Link
              href="/sign-up"
              className="group relative mt-8 inline-block rounded-xl bg-accent-gradient px-[26px] py-3 text-[15px] font-semibold text-on-accent shadow-[0_8px_28px_rgba(246,146,30,0.3)] transition-all hover:-translate-y-0.5"
            >
              <span className="absolute -inset-1 rounded-xl bg-accent-gradient opacity-0 blur-lg transition-opacity group-hover:opacity-50" />
              <span className="relative z-10">Get started free →</span>
            </Link>
          </div>
        </Reveal>
      </section>

      {/* FOOTER */}
      <Reveal>
        <footer className="border-t border-line">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6">
            <Logo size={24} />
            <div className="flex gap-5 text-[12.5px] text-faint">
              <Link href="/privacy" className="transition-colors hover:text-soft">Privacy</Link>
              <Link href="/terms" className="transition-colors hover:text-soft">Terms</Link>
            </div>
          </div>
        </footer>
      </Reveal>
    </div>
  );
}

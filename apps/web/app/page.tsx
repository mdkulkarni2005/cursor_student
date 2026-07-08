import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { Sparkle } from "@/components/icons";
import { Reveal } from "@/components/reveal";

const FEATURES = [
  {
    title: "Assignments",
    desc: "Snap a photo or paste your question. Get a formatted answer in your college's template.",
    accent: "from-rose/20 to-rose/5 border-rose/10",
    icon: "📝",
    delay: 0,
  },
  {
    title: "Reports & PPTs",
    desc: "Generate well-structured reports and presentations that match your department's format.",
    accent: "from-cyan/20 to-cyan/5 border-cyan/10",
    icon: "📊",
    delay: 100,
  },
  {
    title: "Resume Builder",
    desc: "Build ATS-ready resumes tailored to your branch, skills, and experience level.",
    accent: "from-indigo/20 to-indigo/5 border-indigo/10",
    icon: "📄",
    delay: 200,
  },
  {
    title: "Interview Prep",
    desc: "Practice with AI mock interviews. Get real-time feedback on your answers and confidence.",
    accent: "from-violet/20 to-violet/5 border-violet/10",
    icon: "🎙️",
    delay: 0,
  },
  {
    title: "DSA Practice",
    desc: "Solve curated problems, get AI-powered code reviews, and build your streak.",
    accent: "from-emerald/20 to-emerald/5 border-emerald/10",
    icon: "💻",
    delay: 100,
  },
  {
    title: "Project Ideas",
    desc: "Get personalized project ideas with step-by-step builders for your domain.",
    accent: "from-amber/20 to-amber/5 border-amber/10",
    icon: "⚡",
    delay: 200,
  },
];

const STEPS = [
  { num: "01", title: "Sign up", desc: "Create your account with your college email — it takes 30 seconds." },
  { num: "02", title: "Set your context", desc: "Tell us your branch, semester, and goals. We'll tailor everything." },
  { num: "03", title: "Start creating", desc: "Generate assignments, reports, resumes, and more — all in your format." },
];

export default async function LandingPage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <div className="min-h-screen overflow-hidden bg-canvas">
      {/* NAV — slides down */}
      <header className="animate-fade-in-up fixed inset-x-0 top-0 z-50 border-b border-line bg-base/80 backdrop-blur-lg">
        <div className="mx-auto flex h-[64px] max-w-7xl items-center justify-between px-5">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex size-[28px] items-center justify-center rounded-lg bg-accent-gradient shadow-[0_0_16px_rgba(246,146,30,0.4)]">
              <Sparkle size={15} className="text-on-accent" />
            </span>
            <span className="font-display text-[16px] font-bold text-ink">Vidyas OS</span>
          </Link>
          <div className="flex items-center gap-3">
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
      <section className="relative mx-auto flex min-h-screen max-w-7xl flex-col items-center justify-center px-5 pt-20 text-center">
        {/* Background orbs */}
        <div className="pointer-events-none absolute -top-40 left-1/2 size-[600px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(246,146,30,0.08),transparent_70%)] animate-float-drift" />
        <div className="pointer-events-none absolute -bottom-20 right-10 size-[300px] animate-float-drift rounded-full bg-[radial-gradient(circle,rgba(129,140,248,0.06),transparent_70%)]" style={{ animationDelay: "-5s" }} />
        <div className="pointer-events-none absolute -left-20 top-1/3 size-[250px] animate-float-drift rounded-full bg-[radial-gradient(circle,rgba(251,191,36,0.04),transparent_70%)]" style={{ animationDelay: "-9s" }} />

        <div className="relative">
          {/* Badge */}
          <div className="animate-fade-in-up mb-6 inline-block rounded-full border border-cyan/20 bg-cyan/8 px-4 py-1.5 text-[12px] font-semibold tracking-wide text-cyan">
            <span className="inline-block animate-pulse-ring mr-2 size-1.5 rounded-full bg-cyan" />
            Your AI Academic Operating System
          </div>

          {/* Headline with gradient shimmer */}
          <h1 className="font-display text-[42px] font-bold leading-[1.1] tracking-tight text-ink sm:text-[54px] lg:text-[64px]">
            <span className="animate-fade-in-up block stagger-1">College work,</span>
            <span className="animate-fade-in-up block stagger-2 mt-2">
              <span className="animate-gradient-shift bg-gradient-to-r from-cyan via-indigo to-cyan bg-clip-text text-transparent">
                but actually fast.
              </span>
            </span>
          </h1>

          {/* Subtitle */}
          <p className="animate-fade-in-up stagger-3 mx-auto mt-5 max-w-[580px] text-[16px] leading-relaxed text-muted">
            Vidyas OS generates assignments, reports, presentations, resumes, and more — all formatted to
            your college&apos;s standards. So you can focus on learning, not formatting.
          </p>

          {/* CTAs */}
          <div className="animate-fade-in-up stagger-4 mt-8 flex flex-wrap items-center justify-center gap-4">
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

          {/* Scroll indicator */}
          <div className="animate-fade-in-up stagger-5 mt-16 flex flex-col items-center gap-2">
            <span className="size-1 rounded-full bg-cyan/40" />
            <span className="size-1 rounded-full bg-cyan/30" />
            <span className="size-1 rounded-full bg-cyan/20" />
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <Reveal>
        <section className="mx-auto max-w-7xl px-5 py-24">
          <div className="mb-14 text-center">
            <h2 className="font-display text-[30px] font-bold text-ink sm:text-[36px]">
              Everything a student needs
            </h2>
            <p className="mt-3 text-[15px] text-muted">
              Six tools, one workspace. No more jumping between tabs.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <Reveal key={f.title} delay={f.delay}>
                <div
                  className={`group relative overflow-hidden rounded-2xl border border-line bg-card p-6 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_14px_40px_rgba(15,23,42,0.12)] ${f.accent.replace("from-", "hover:border-").split(" ")[2] || "hover:border-cyan/20"}`}
                >
                  <div className="pointer-events-none absolute -right-10 -top-10 size-24 rounded-full bg-gradient-to-br from-white/3 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                  <span
                    className={`mb-4 flex size-11 items-center justify-center rounded-xl bg-gradient-to-br ${f.accent.split(" ").slice(0, 2).join(" ")} text-xl transition-transform duration-300 group-hover:scale-110 group-hover:animate-icon-bounce`}
                  >
                    {f.icon}
                  </span>
                  <h3 className="mb-1.5 font-display text-[17px] font-semibold text-ink transition-colors duration-300 group-hover:text-cyan">
                    {f.title}
                  </h3>
                  <p className="text-[13.5px] leading-relaxed text-muted">{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      </Reveal>

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
              {/* Connecting line (desktop) */}
              <div className="pointer-events-none absolute left-[calc(16.666%+24px)] right-[calc(16.666%+24px)] top-6 hidden h-px bg-gradient-to-r from-cyan/40 via-indigo/40 to-cyan/40 md:block" />

              {STEPS.map((step, i) => (
                <Reveal key={step.num} delay={i * 150}>
                  <div className="relative text-center">
                    <span className="animate-glow-pulse mb-4 inline-flex size-12 items-center justify-center rounded-xl bg-accent-gradient text-[16px] font-bold text-on-accent shadow-lg">
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

      {/* STATS BANNER */}
      <section className="border-t border-line">
        <Reveal>
          <div className="mx-auto max-w-5xl px-5 py-20">
            <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
              {[
                { value: "10k+", label: "Students" },
                { value: "50k+", label: "Documents generated" },
                { value: "99.9%", label: "Uptime" },
                { value: "4.9★", label: "Student rating" },
              ].map((stat, i) => (
                <Reveal key={stat.label} delay={i * 100}>
                  <div className="rounded-2xl border border-line bg-card p-6 text-center transition-all hover:border-cyan/20">
                    <p className="font-display text-[28px] font-bold text-ink">{stat.value}</p>
                    <p className="mt-1 text-[13px] text-faint">{stat.label}</p>
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
              Join thousands of students who are already using Vidyas OS to get their work done.
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
            <div className="flex items-center gap-2.5">
              <Sparkle size={14} className="text-cyan" />
              <span className="font-display text-[14px] font-bold text-ink">Vidyas OS</span>
            </div>
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

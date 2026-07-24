import Link from "next/link";
import { prisma, type PlanLimits } from "@studentos/db";
import { Logo } from "@/components/logo";
import { Reveal } from "@/components/reveal";
import { ThemeToggle } from "@/components/theme-toggle";
import { GraduationCapIcon, BriefcaseIcon, ResumeIcon, MicIcon, CodeIcon, StarIcon, LinkIcon } from "@/components/icons";
import { ReportMockup, InterviewMockup, DsaMockup } from "./mockups";

const RECRUITER_URL = process.env.NEXT_PUBLIC_RECRUITER_APP_URL ?? "http://localhost:3200";

const USAGE_LABEL: Record<string, string> = {
  ASSIGNMENT: "Assignments",
  REPORT: "Reports",
  PPT: "PPTs",
  LAB_REPORT: "Lab reports",
  BRANCH_SOLVER: "Branch-solver tools",
};

const FEATURE_LABEL: Record<string, string> = {
  priorityQueue: "Priority generation queue",
  mentorReview: "1:1 mentor reviews",
  earlyAccess: "Early access to new modules",
};

function pricingFeaturesFor(limits: PlanLimits): string[] {
  const usage = Object.entries(limits.usage)
    .filter(([, v]) => v !== 0)
    .map(([k, v]) => `${v === null || v === undefined ? "Unlimited" : v} ${USAGE_LABEL[k] ?? k} / month`);
  const features = Object.entries(limits.features)
    .filter(([, on]) => on)
    .map(([k]) => FEATURE_LABEL[k] ?? k);
  return [...usage, ...features];
}

const PAIN_POINTS = [
  {
    icon: "📄", paint: "ATS filters kill your resume", pain: "Generic templates fail automated screeners. Get role-optimized resumes that land interviews.", tag: "Resume", tagColor: "text-cyan bg-cyan/10",
  },
  {
    icon: "🎙️", paint: "Interviews feel rusty after gaps", pain: "A few months off and your edge dulls. AI mock interviews keep you sharp — voice, follow-ups, real feedback.", tag: "Interview", tagColor: "text-indigo bg-indigo/10",
  },
  {
    icon: "💻", paint: "Skills plateau on the job", pain: "Your daily work may not challenge you. DSA and coding assessments keep your problem-solving sharp for the next move.", tag: "Skills", tagColor: "text-amber bg-amber/10",
  },
  {
    icon: "🔍", paint: "Recruiters can't verify your ability", pain: "Resumes can't prove what you know. Make your skills, scores, and projects verifiable in one click.", tag: "Profile", tagColor: "text-rose bg-rose/10",
  },
  {
    icon: "🔄", paint: "Career transitions feel impossible", pain: "Switching domains or tech stacks requires proof. Build evidence in your target area before you apply.", tag: "Transition", tagColor: "text-teal bg-teal/10",
  },
  {
    icon: "⏰", paint: "No time for career growth", pain: "Between work and life, growth takes a back seat. Tools that work around your schedule — practice anytime.", tag: "Time", tagColor: "text-violet bg-violet/10",
  },
];

const CAPABILITIES = [
  { value: "95%", label: "ATS pass rate with AI-optimized resumes" },
  { value: "Real", label: "code execution on every DSA submission" },
  { value: "Live", label: "AI voice interviews, not scripted quizzes" },
  { value: "1-Link", label: "shareable profile — resume, scores & projects" },
];

const STEPS = [
  { num: "01", title: "Sign up free", desc: "Create your account in 30 seconds. No credit card needed.", icon: "🚀" },
  { num: "02", title: "Set your goals", desc: "Tell us your target role, industry, and career stage. We tailor everything.", icon: "🎯" },
  { num: "03", title: "Start proving your edge", desc: "Optimize resumes, practice interviews, and showcase your verified skills.", icon: "🏆" },
];

function SectionHeader({ label, title, desc, center = true }: { label?: string; title: string; desc?: string; center?: boolean }) {
  return (
    <div className={`mb-16 ${center ? "text-center" : ""}`}>
      {label && (
        <span className="mb-4 inline-block rounded-full border border-indigo/20 bg-indigo/8 px-4 py-1.5 text-[11px] font-semibold tracking-wide text-indigo">
          {label}
        </span>
      )}
      <h2 className="font-display text-[32px] font-bold leading-[1.12] text-ink sm:text-[40px]">
        {title}
      </h2>
      {desc && <p className="mx-auto mt-4 max-w-[580px] text-[15px] leading-relaxed text-muted">{desc}</p>}
    </div>
  );
}

function BgOrb({ className = "", size = 600, color = "rgba(247,193,49," }: { className?: string; size?: number; color?: string }) {
  return (
    <div
      className={`pointer-events-none absolute animate-float-drift rounded-full bg-[radial-gradient(circle,${color}0.06),transparent_70%)] ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

export async function ProfessionalsLanding() {
  const tiers = await prisma.planTier.findMany({ where: { audience: "STUDENT", active: true }, orderBy: { sortOrder: "asc" } });
  return (
    <div className="min-h-screen overflow-hidden bg-canvas">
      {/* ── NAV ── */}
      <header className="animate-fade-in-up fixed inset-x-0 top-0 z-50 border-b border-line bg-base/70 backdrop-blur-xl">
        <div className="mx-auto flex h-[64px] max-w-7xl items-center justify-between px-5">
          <Link href="/" className="group flex items-center gap-2.5">
            <Logo size={30} />
          </Link>
          <div className="flex items-center gap-4 sm:gap-6">
            <a href="#pricing" className="hidden text-[13px] font-medium text-soft transition-colors hover:text-ink sm:block">
              Pricing
            </a>
            <Link href="/sign-up" className="hidden text-[13px] font-medium text-soft transition-colors hover:text-ink sm:block">
              For Students
            </Link>
            <Link href="/for-professionals" className="hidden text-[13px] font-medium text-soft transition-colors hover:text-ink lg:block">
              For Professionals
            </Link>
            <a href={RECRUITER_URL} className="hidden text-[13px] font-medium text-soft transition-colors hover:text-ink sm:block">
              For Recruiters
            </a>
            <div className="flex items-center gap-3">
              <Link
                href="/sign-in"
                className="text-[13px] font-medium text-soft transition-colors hover:text-ink"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="rounded-xl bg-accent-gradient px-4 py-2 text-[13px] font-semibold text-on-accent shadow-[0_4px_16px_rgba(254,127,45,0.25)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(254,127,45,0.35)]"
              >
                Get started
              </Link>
              <ThemeToggle compact className="!px-2" />
            </div>
          </div>
        </div>
      </header>

      {/* ════════════════════════════════════════════════════════════
          HERO
          ════════════════════════════════════════════════════════════ */}
      <section className="relative mx-auto grid max-w-7xl items-center gap-10 px-5 pt-28 pb-16 lg:min-h-screen lg:grid-cols-[1.1fr_1fr] lg:gap-10 lg:pt-24">
        <BgOrb className="-top-40 left-1/4 lg:-top-60" color="rgba(247,193,49," />
        <BgOrb className="-bottom-20 -right-20 size-[300px]" color="rgba(254,127,45," />

        <div className="relative text-center lg:text-left">
          <div className="animate-fade-in-up mb-6 inline-flex items-center gap-2 rounded-full border border-indigo/20 bg-indigo/8 px-4 py-1.5 text-[12px] font-semibold tracking-wide text-indigo">
            <span className="inline-block size-1.5 animate-pulse-ring rounded-full bg-indigo" />
            For Working Professionals
          </div>

          <h1 className="font-display text-[44px] font-bold leading-[1.08] tracking-tight text-ink sm:text-[56px] lg:text-[64px]">
            <span className="animate-fade-in-up block stagger-1">Level up your career,</span>
            <span className="animate-fade-in-up block stagger-2 mt-2">
              <span className="text-indigo">
                without quitting your job.
              </span>
            </span>
          </h1>

          <p className="animate-fade-in-up stagger-3 mx-auto mt-5 max-w-[540px] text-[16px] leading-relaxed text-muted lg:mx-0">
            AI-powered resume optimization, mock interviews, and skill assessments —
            all in one platform that works around your schedule.
          </p>

          <div className="animate-fade-in-up stagger-4 mt-8 flex flex-wrap items-center justify-center gap-4 lg:justify-start">
            <Link
              href="/sign-up"
              className="group relative rounded-xl bg-accent-gradient px-[28px] py-3.5 text-[15px] font-semibold text-on-accent shadow-[0_8px_28px_rgba(254,127,45,0.3)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(254,127,45,0.4)]"
            >
              <span className="absolute -inset-1 rounded-xl bg-accent-gradient opacity-0 blur-lg transition-opacity group-hover:opacity-60" />
              <span className="relative z-10">Start free →</span>
            </Link>
            <Link
              href="/sign-in"
              className="rounded-xl border border-line-strong bg-surface px-[26px] py-3.5 text-[15px] font-semibold text-soft transition-all hover:border-indigo/30 hover:bg-surface"
            >
              Sign in
            </Link>
          </div>

          <div className="animate-fade-in-up stagger-5 mt-12 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 rounded-xl border border-cyan/20 bg-cyan/8 px-4 py-2 text-[12.5px] font-semibold text-cyan transition-all hover:-translate-y-0.5 hover:border-cyan/40"
            >
              <GraduationCapIcon size={15} />
              For Students
            </Link>
            <Link
              href="/for-professionals"
              className="inline-flex items-center gap-2 rounded-xl border border-indigo/20 bg-indigo/8 px-4 py-2 text-[12.5px] font-semibold text-indigo transition-all hover:-translate-y-0.5 hover:border-indigo/40"
            >
              <BriefcaseIcon size={15} />
              For Professionals
            </Link>
            <a
              href={RECRUITER_URL}
              className="inline-flex items-center gap-2 rounded-xl border border-amber/20 bg-amber/8 px-4 py-2 text-[12.5px] font-semibold text-amber transition-all hover:-translate-y-0.5 hover:border-amber/40"
            >
              <span className="text-[14px]">💼</span>
              For Recruiters
            </a>
          </div>
        </div>

        <div className="animate-fade-in-up stagger-3 relative">
          <div className="pointer-events-none absolute -inset-8 -z-10 rounded-[32px] bg-[radial-gradient(circle,rgba(247,193,49,0.08),transparent_70%)]" />
          <DsaMockup />
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          PAIN → SOLUTION
          ════════════════════════════════════════════════════════════ */}
      <section className="relative border-t border-line overflow-hidden">
        <BgOrb className="-left-40 -top-40 size-[500px]" color="rgba(247,193,49," />
        <BgOrb className="-bottom-40 -right-40 size-[400px] hidden lg:block" color="rgba(254,127,45," />
        <div className="relative mx-auto max-w-7xl px-5 py-24">
          <Reveal>
            <SectionHeader
              label="The professional's dilemma"
              title="Your next role demands proof, not promises"
              desc="The job market has changed. Generic resumes and claims don't cut it anymore — employers want verified evidence of your abilities."
            />
          </Reveal>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {PAIN_POINTS.map((item, i) => (
              <Reveal key={item.paint} delay={i * 70}>
                <div className="group relative overflow-hidden rounded-2xl border border-line bg-card transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_50px_rgba(15,23,42,0.12)]">
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo via-cyan to-indigo opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="pointer-events-none absolute -right-20 -top-20 size-40 rounded-full bg-gradient-to-br from-indigo/6 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                  <div className="relative p-5 pb-3">
                    <span className={`mb-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider ${item.tagColor}`}>
                      {item.tag}
                    </span>
                    <div className="flex items-start gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-danger/10 to-danger/5 text-[16px] shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:-rotate-6">
                        {item.icon}
                      </span>
                      <div className="pt-0.5">
                        <p className="text-[13.5px] font-bold text-ink">{item.paint}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mx-5 h-px bg-line transition-colors duration-300 group-hover:bg-indigo/20" />

                  <div className="relative p-5 pt-3">
                    <div className="flex items-start gap-2.5">
                      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-accent-gradient text-[9px] font-bold text-on-accent shadow-sm">✓</span>
                      <p className="text-[13px] leading-relaxed text-muted">{item.pain}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          FEATURES
          ════════════════════════════════════════════════════════════ */}
      <section className="mx-auto max-w-7xl px-5 py-24">
        <Reveal>
          <SectionHeader
            label="Features"
            title="Everything you need to stay ahead"
            desc="Resume optimization, interview prep, skill assessments — connected in one seamless experience for working professionals."
          />
        </Reveal>

        {/* Feature 1 — Resume */}
        <Reveal>
          <div className="relative grid items-center gap-12 rounded-3xl border border-line bg-gradient-to-br from-indigo/[0.03] to-cyan/[0.03] p-6 sm:p-10 lg:grid-cols-2 lg:gap-14">
            <div className="absolute -top-px left-[15%] right-[15%] h-px bg-gradient-to-r from-transparent via-indigo/30 to-transparent" />
            <div>
              <span className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo/20 to-cyan/10 text-[22px] shadow-sm">
                <ResumeIcon size={22} />
              </span>
              <h3 className="font-display text-[24px] font-bold text-ink">AI resume builder — built to pass ATS</h3>
              <p className="mt-3 max-w-[440px] text-[14.5px] leading-relaxed text-muted">
                Upload your existing resume and get a role-optimized version with real-time ATS scoring.
                Tailored for every career level — entry, mid, senior, or executive.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {["ATS score", "Role-tailored", "One-page lock", "Multiple templates"].map((tag) => (
                  <span key={tag} className="rounded-lg border border-line bg-surface/50 px-3 py-1 text-[11.5px] font-medium text-soft">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="pointer-events-none absolute -inset-4 rounded-2xl bg-[radial-gradient(circle,rgba(254,127,45,0.06),transparent_70%)]" />
              <ReportMockup />
            </div>
          </div>
        </Reveal>

        {/* Feature 2 — Mock Interviews */}
        <Reveal>
          <div className="relative mt-16 grid items-center gap-12 rounded-3xl border border-line bg-gradient-to-br from-violet/[0.03] to-indigo/[0.03] p-6 sm:p-10 lg:grid-cols-2 lg:gap-14">
            <div className="absolute -top-px left-[15%] right-[15%] h-px bg-gradient-to-r from-transparent via-violet/30 to-transparent" />
            <div className="lg:order-2">
              <span className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet/20 to-indigo/10 text-[22px] shadow-sm">
                <MicIcon size={22} />
              </span>
              <h3 className="font-display text-[24px] font-bold text-ink">Mock interviews tailored to your role</h3>
              <p className="mt-3 max-w-[440px] text-[14.5px] leading-relaxed text-muted">
                Role-specific, voice-to-voice AI interviews that adapt to your answers.
                Technical, behavioral, and system design — with detailed feedback on what to fix.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {["Voice-to-voice", "Role-specific", "Performance report", "Follow-up questions"].map((tag) => (
                  <span key={tag} className="rounded-lg border border-line bg-surface/50 px-3 py-1 text-[11.5px] font-medium text-soft">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="relative lg:order-1">
              <div className="pointer-events-none absolute -inset-4 rounded-2xl bg-[radial-gradient(circle,rgba(247,193,49,0.06),transparent_70%)]" />
              <InterviewMockup />
            </div>
          </div>
        </Reveal>

        {/* Feature 3 — DSA & Skills */}
        <Reveal>
          <div className="relative mt-16 grid items-center gap-12 rounded-3xl border border-line bg-gradient-to-br from-emerald/[0.03] to-cyan/[0.03] p-6 sm:p-10 lg:grid-cols-2 lg:gap-14">
            <div className="absolute -top-px left-[15%] right-[15%] h-px bg-gradient-to-r from-transparent via-emerald/30 to-transparent" />
            <div>
              <span className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald/20 to-cyan/10 text-[22px] shadow-sm">
                <CodeIcon size={22} />
              </span>
              <h3 className="font-display text-[24px] font-bold text-ink">DSA & skill assessments — honest results</h3>
              <p className="mt-3 max-w-[440px] text-[14.5px] leading-relaxed text-muted">
                Real code execution against actual test cases. Track your progress across data
                structures, algorithms, and domain-specific challenges. No fake pass marks.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {["Real execution", "Test cases", "Progress tracking", "Multi-language"].map((tag) => (
                  <span key={tag} className="rounded-lg border border-line bg-surface/50 px-3 py-1 text-[11.5px] font-medium text-soft">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="pointer-events-none absolute -inset-4 rounded-2xl bg-[radial-gradient(circle,rgba(247,193,49,0.06),transparent_70%)]" />
              <DsaMockup />
            </div>
          </div>
        </Reveal>

        {/* Feature cards grid — What professionals get */}
        <Reveal>
          <div className="mt-20">
            <div className="mb-12 text-center">
              <span className="mb-4 inline-block rounded-full border border-indigo/20 bg-indigo/8 px-4 py-1.5 text-[11px] font-semibold tracking-wide text-indigo">
                What professionals get
              </span>
              <h2 className="font-display text-[30px] font-bold text-ink sm:text-[36px]">
                Your career toolkit, all in one place
              </h2>
              <p className="mx-auto mt-3 max-w-[520px] text-[15px] text-muted">
                Every tool you need to stay competitive — from resume to interview to verified profile.
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: "📄", title: "ATS Resume Builder",
                  desc: "Role-optimized resumes with real-time ATS scoring. One-page lock, multiple templates, instant export.",
                  gradient: "from-indigo/15 via-indigo/5 to-transparent", borderGlow: "group-hover:border-indigo/40",
                  accent: "bg-indigo/10 text-indigo",
                },
                {
                  icon: "🎙️", title: "AI Mock Interviews",
                  desc: "Voice-to-voice role-specific interviews that adapt to your answers. Reports show exactly what to improve.",
                  gradient: "from-violet/15 via-violet/5 to-transparent", borderGlow: "group-hover:border-violet/40",
                  accent: "bg-violet/10 text-violet",
                },
                {
                  icon: "🔗", title: "Shareable Profile",
                  desc: "One link to share your resume, scores, and projects. Recruiters see verified proof — not just claims.",
                  gradient: "from-cyan/15 via-cyan/5 to-transparent", borderGlow: "group-hover:border-cyan/40",
                  accent: "bg-cyan/10 text-cyan",
                },
                {
                  icon: "🏆", title: "Career Assessments",
                  desc: "DSA challenges, domain quizzes, and skill evaluations with real code execution and honest pass/fail.",
                  gradient: "from-amber/15 via-amber/5 to-transparent", borderGlow: "group-hover:border-amber/40",
                  accent: "bg-amber/10 text-amber",
                },
              ].map((f, i) => (
                <Reveal key={f.title} delay={i * 80}>
                  <div className={`group relative overflow-hidden rounded-2xl border border-line bg-card p-7 transition-all duration-300 hover:-translate-y-1.5 ${f.borderGlow} hover:shadow-[0_20px_50px_rgba(15,23,42,0.12)]`}>
                    <div className={`absolute inset-0 bg-gradient-to-b ${f.gradient} opacity-0 transition-opacity duration-500 group-hover:opacity-100`} />
                    <div className="absolute -right-12 -top-12 size-32 rounded-full bg-gradient-to-br from-indigo/8 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                    <div className="relative z-10 flex flex-col items-center text-center">
                      <div className={`mb-4 flex size-14 items-center justify-center rounded-2xl ${f.accent} text-2xl shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_8px_24px_rgba(247,193,49,0.15)]`}>
                        {f.icon}
                      </div>
                      <span className={`mb-2 inline-block rounded-full px-2.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider ${f.accent}`}>
                        {f.title.split(" ").pop()}
                      </span>
                      <h4 className="font-display text-[16px] font-bold text-ink">{f.title}</h4>
                      <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{f.desc}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* ════════════════════════════════════════════════════════════
          HOW IT WORKS
          ════════════════════════════════════════════════════════════ */}
      <section className="relative border-t border-line overflow-hidden">
        <BgOrb className="-left-40 top-1/3 size-[400px]" color="rgba(247,193,49," />
        <div className="relative mx-auto max-w-7xl px-5 py-24">
          <Reveal>
            <SectionHeader
              title="How it works"
              desc="Three simple steps to accelerate your career. No complexity, no hidden steps."
            />
          </Reveal>
          <div className="relative grid gap-8 md:grid-cols-3">
            <div className="pointer-events-none absolute left-[calc(16.666%+24px)] right-[calc(16.666%+24px)] top-12 hidden h-px bg-gradient-to-r from-indigo/20 via-cyan/40 to-indigo/20 md:block" />

            {STEPS.map((step, i) => (
              <Reveal key={step.num} delay={i * 150}>
                <div className="group relative text-center">
                  <span className="mb-5 inline-flex size-14 items-center justify-center rounded-2xl bg-accent-gradient text-[22px] shadow-lg transition-transform duration-300 group-hover:scale-110">
                    {step.icon}
                  </span>
                  <div className="mb-3 inline-flex size-7 items-center justify-center rounded-full bg-indigo/10 text-[11px] font-bold text-indigo">
                    {step.num}
                  </div>
                  <h3 className="mb-1.5 font-display text-[18px] font-semibold text-ink">{step.title}</h3>
                  <p className="mx-auto max-w-[280px] text-[13.5px] leading-relaxed text-muted">{step.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          PRICING
          ════════════════════════════════════════════════════════════ */}
      <section id="pricing" className="relative border-t border-line overflow-hidden">
        <BgOrb className="top-1/2 left-1/3 size-[500px]" color="rgba(254,127,45," />
        <div className="relative mx-auto max-w-5xl px-5 py-24">
          <Reveal>
            <SectionHeader
              label="Pricing"
              title="Simple, honest pricing"
              desc="Start free. Upgrade the moment you need more. No surprises."
            />
          </Reveal>
          <div className="grid gap-5 md:grid-cols-3">
            {tiers.map((tier, i) => {
              const highlight = !tier.isFree && i === Math.min(1, tiers.length - 1);
              const features = pricingFeaturesFor(tier.limits as PlanLimits);
              return (
                <Reveal key={tier.id} delay={i * 100}>
                  <div
                    className={`relative flex h-full flex-col rounded-2xl border p-6 transition-all hover:-translate-y-1.5 ${
                      highlight
                        ? "border-indigo/30 bg-gradient-to-b from-indigo/[0.04] to-transparent shadow-[0_14px_40px_rgba(247,193,49,0.10)] ring-1 ring-indigo/20"
                        : "border-line bg-card"
                    }`}
                  >
                    {highlight && (
                      <div className="absolute -top-px left-[20%] right-[20%] h-px bg-gradient-to-r from-transparent via-indigo to-transparent" />
                    )}
                    {highlight && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent-gradient px-4 py-1 text-[11px] font-semibold text-on-accent shadow-lg">
                        Most popular
                      </span>
                    )}
                    <h3 className="font-display text-[18px] font-semibold text-ink">{tier.name}</h3>
                    {tier.description && <p className="mt-1 text-[13px] text-muted">{tier.description}</p>}
                    <p className="mt-4">
                      <span className="font-display text-[34px] font-bold text-ink">₹{(tier.priceCents / 100).toLocaleString("en-IN")}</span>
                      <span className="text-[13px] text-faint">/{tier.billingPeriod === "yearly" ? "year" : "month"}</span>
                    </p>
                    <ul className="mt-5 flex-1 space-y-2.5">
                      {features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-[13px] text-soft">
                          <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-indigo/15 text-[9px] font-bold text-indigo">✓</span>
                          {f}
                        </li>
                      ))}
                      {features.length === 0 && <li className="text-[13px] text-faint italic">Unlimited everything.</li>}
                    </ul>
                    <Link
                      href="/sign-up"
                      className={`mt-6 rounded-xl px-4 py-2.5 text-center text-[13.5px] font-semibold transition-all ${
                        highlight
                          ? "bg-accent-gradient text-on-accent shadow-[0_4px_16px_rgba(254,127,45,0.2)] hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(254,127,45,0.3)]"
                          : "border border-line-strong bg-surface text-soft hover:border-indigo/30"
                      }`}
                    >
                      {tier.isFree ? "Get started free" : `Get ${tier.name}`}
                    </Link>
                  </div>
                </Reveal>
              );
            })}
            {tiers.length === 0 && (
              <p className="col-span-full text-center text-[14px] text-faint">
                Pricing is being set up — sign up free while we finish rolling out plans.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          FAQ
          ════════════════════════════════════════════════════════════ */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-3xl px-5 py-24">
          <Reveal>
            <SectionHeader
              label="Got questions?"
              title="Frequently asked questions"
              desc="Everything working professionals ask about krackit. Still have questions? We're here to help."
            />
          </Reveal>
          <div className="space-y-4">
            {[
              {
                q: "Is krackit useful for experienced professionals too?",
                a: "Absolutely. Whether you're 2 years in or 20 years in, krackit's resume optimizer tailors content for your level, our mock interviews adapt to senior roles including system design, and DSA assessments work for any stage. The platform is built for every career level.",
              },
              {
                q: "Can I use krackit without my employer knowing?",
                a: "Yes. Your account is private by default. You control what you share — your profile link only shows what you choose to make public. Nothing is shared without your permission.",
              },
              {
                q: "How does the resume AI work?",
                a: "Upload your resume and paste a job description. Our AI analyzes both, rewrites bullet points with quantified impact, optimizes keywords for ATS, and enforces a clean one-page format. You get a real-time ATS score and edit before exporting.",
              },
              {
                q: "Are the mock interviews really adaptive?",
                a: "Yes. Unlike scripted question banks, our AI interviewer listens to your answers and adapts follow-ups — just like a real interviewer. It covers technical, behavioral, and system design rounds with voice-to-voice conversation.",
              },
              {
                q: "Can recruiters verify my skills?",
                a: "Yes. Every DSA submission runs on a real code execution sandbox — scores reflect actual test case pass/fail. Interview performance is recorded and scored. Your shareable profile gives recruiters verified proof, not self-reported claims.",
              },
              {
                q: "What if I'm between jobs?",
                a: "That's exactly when krackit is most valuable. Use it to keep your skills sharp with daily DSA practice, run mock interviews to build confidence, and share your proof-of-work profile with recruiters — even without a current employer.",
              },
            ].map((faq) => (
              <details key={faq.q} className="group rounded-2xl border border-line bg-card transition-all hover:border-indigo/20">
                <summary className="flex cursor-pointer items-center justify-between px-6 py-4 text-[14.5px] font-semibold text-ink transition-colors hover:text-indigo list-none">
                  {faq.q}
                  <span className="ml-4 flex size-6 shrink-0 items-center justify-center rounded-full bg-surface text-[14px] transition-transform duration-300 group-open:rotate-180">
                    ↓
                  </span>
                </summary>
                <div className="px-6 pb-5">
                  <p className="text-[13.5px] leading-relaxed text-muted">{faq.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          CAPABILITIES
          ════════════════════════════════════════════════════════════ */}
      <section className="relative border-t border-line overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo/[0.02] via-transparent to-cyan/[0.02]" />
        <BgOrb className="-left-40 top-1/2 size-[400px]" color="rgba(247,193,49," />
        <div className="relative mx-auto max-w-5xl px-5 py-20">
          <Reveal>
            <p className="mb-12 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-faint">
              What professionals get with krackit
            </p>
          </Reveal>
          <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
            {CAPABILITIES.map((stat, i) => (
              <Reveal key={stat.label} delay={i * 100}>
                <div className="group relative overflow-hidden rounded-2xl border border-line bg-card transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_50px_rgba(15,23,42,0.12)]">
                  <div className="absolute inset-0 bg-gradient-to-b from-indigo/[0.03] to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo/50 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                  <div className="relative z-10 flex flex-col items-center p-7">
                    <div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo/10 to-indigo/5 shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_8px_24px_rgba(247,193,49,0.12)]">
                      <span className="font-display text-[16px] font-bold text-indigo">
                        {stat.value}
                      </span>
                    </div>
                    <p className="text-[12.5px] leading-snug text-faint text-center">{stat.label}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          CTA
          ════════════════════════════════════════════════════════════ */}
      <section className="relative border-t border-line overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo/[0.02] via-transparent to-cyan/[0.02]" />
        <BgOrb className="-left-40 -top-40 size-[500px]" color="rgba(247,193,49," />
        <BgOrb className="-bottom-40 -right-40 size-[400px]" color="rgba(254,127,45," />

        <Reveal>
          <div className="relative mx-auto max-w-3xl px-5 py-28 text-center">
            <h2 className="font-display text-[34px] font-bold leading-[1.12] text-ink sm:text-[42px]">
              Ready to own your career growth?
            </h2>
            <p className="mx-auto mt-4 max-w-[500px] text-[15px] leading-relaxed text-muted">
              Join professionals who&apos;ve stopped waiting for their employer to invest in them
              and started investing in themselves — with tools that work around their schedule.
            </p>
            <Link
              href="/sign-up"
              className="group relative mt-10 inline-flex items-center gap-2 rounded-xl bg-accent-gradient px-[30px] py-3.5 text-[16px] font-semibold text-on-accent shadow-[0_8px_28px_rgba(254,127,45,0.3)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(254,127,45,0.4)]"
            >
              <span className="absolute -inset-1 rounded-xl bg-accent-gradient opacity-0 blur-lg transition-opacity group-hover:opacity-50" />
              <span className="relative z-10">Start free — no card required →</span>
            </Link>
            <p className="mt-4 text-[12.5px] text-faint">Free account includes 50 AI credits/month. No commitment.</p>
          </div>
        </Reveal>
      </section>

      {/* ════════════════════════════════════════════════════════════
          FOOTER
          ════════════════════════════════════════════════════════════ */}
      <footer className="border-t border-line bg-base/80">
        <div className="mx-auto max-w-7xl px-5 pt-16 pb-8">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <Logo size={28} />
              <p className="mt-3 max-w-[320px] text-[13px] leading-relaxed text-muted">
                krackit is the career acceleration platform where students create, professionals
                upskill, and recruiters hire on proof of work — not buzzwords.
              </p>
              <div className="mt-5 flex gap-3">
                <a href="mailto:info@krackit.in" className="flex size-9 items-center justify-center rounded-lg border border-line bg-surface text-[13px] text-muted transition-colors hover:border-indigo/30 hover:text-indigo">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 4L12 13 2 4"/></svg>
                </a>
                <a href="#" className="flex size-9 items-center justify-center rounded-lg border border-line bg-surface text-[13px] text-muted transition-colors hover:border-indigo/30 hover:text-indigo">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.24 2.5H5.76A3.26 3.26 0 002.5 5.76v12.48a3.26 3.26 0 003.26 3.26h6.3v-7.2h-2.4v-2.8h2.4V9.1a3.35 3.35 0 013.58-3.68c.72 0 1.46.06 2.18.18v2.4h-1.24c-1.18 0-1.42.56-1.42 1.38v1.82h2.6l-.42 2.8h-2.18V21.5h3.88a3.26 3.26 0 003.26-3.26V5.76a3.26 3.26 0 00-3.26-3.26z"/></svg>
                </a>
                <a href="#" className="flex size-9 items-center justify-center rounded-lg border border-line bg-surface text-[13px] text-muted transition-colors hover:border-indigo/30 hover:text-indigo">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M22.16 5.66a8.58 8.58 0 01-2.47.68 4.32 4.32 0 001.9-2.38 8.62 8.62 0 01-2.73 1.04 4.3 4.3 0 00-7.34 3.93A12.22 12.22 0 013.15 4.28a4.3 4.3 0 001.33 5.74 4.27 4.27 0 01-1.95-.54v.05a4.3 4.3 0 003.45 4.22 4.3 4.3 0 01-1.94.07 4.31 4.31 0 004.02 2.99 8.65 8.65 0 01-5.35 1.84A8.7 8.7 0 012 18.6a12.2 12.2 0 0018.98-10.24c0-.19 0-.37-.01-.56a8.72 8.72 0 002.19-2.14z"/></svg>
                </a>
                <a href="#" className="flex size-9 items-center justify-center rounded-lg border border-line bg-surface text-[13px] text-muted transition-colors hover:border-indigo/30 hover:text-indigo">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.04c-5.52 0-10 4.48-10 10 0 4.42 2.87 8.17 6.84 9.5.5.09.68-.22.68-.48 0-.24-.01-.88-.01-1.73-2.78.6-3.37-1.34-3.37-1.34-.45-1.15-1.11-1.46-1.11-1.46-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.35 1.09 2.92.83.09-.65.35-1.09.64-1.34-2.22-.25-4.56-1.11-4.56-4.95 0-1.09.39-1.99 1.03-2.69-.1-.26-.45-1.28.1-2.66 0 0 .84-.27 2.75 1.02.8-.22 1.65-.33 2.5-.34.85.01 1.7.12 2.5.34 1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.66.64.7 1.03 1.6 1.03 2.69 0 3.84-2.34 4.7-4.57 4.95.36.31.68.92.68 1.86 0 1.34-.01 2.42-.01 2.75 0 .27.18.58.69.48 3.97-1.33 6.84-5.08 6.84-9.5 0-5.52-4.48-10-10-10z"/></svg>
                </a>
              </div>
            </div>

            <div>
              <h4 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-ink">Product</h4>
              <ul className="mt-4 space-y-2.5">
                <li><Link href="/sign-up" className="text-[13px] text-muted transition-colors hover:text-ink">For Students</Link></li>
                <li><Link href="/for-professionals" className="text-[13px] text-muted transition-colors hover:text-ink">For Professionals</Link></li>
                <li><a href={RECRUITER_URL} className="text-[13px] text-muted transition-colors hover:text-ink">For Recruiters</a></li>
                <li><a href="#pricing" className="text-[13px] text-muted transition-colors hover:text-ink">Pricing</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-ink">Company</h4>
              <ul className="mt-4 space-y-2.5">
                <li><a href={`mailto:info@krackit.in`} className="text-[13px] text-muted transition-colors hover:text-ink">Contact</a></li>
                <li><Link href="/support" className="text-[13px] text-muted transition-colors hover:text-ink">Support</Link></li>
                <li><Link href="/privacy" className="text-[13px] text-muted transition-colors hover:text-ink">Privacy Policy</Link></li>
                <li><Link href="/terms" className="text-[13px] text-muted transition-colors hover:text-ink">Terms of Service</Link></li>
              </ul>
            </div>

            <div className="sm:col-span-2 lg:col-span-1">
              <h4 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-ink">Get started</h4>
              <p className="mt-3 text-[13px] leading-relaxed text-muted">
                Create your free account today. No credit card needed.
              </p>
              <Link
                href="/sign-up"
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-accent-gradient px-5 py-2.5 text-[13px] font-semibold text-on-accent shadow-[0_4px_12px_rgba(254,127,45,0.25)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(254,127,45,0.35)]"
              >
                Start free →
              </Link>
            </div>
          </div>

          <div className="mt-14 flex flex-col items-center justify-between gap-3 border-t border-line pt-6 sm:flex-row">
            <p className="text-[12px] text-faint">
              &copy; {new Date().getFullYear()} Quorium Technologies. All rights reserved.
            </p>
            <div className="flex gap-5 text-[12px] text-faint">
              <Link href="/privacy" className="transition-colors hover:text-soft">Privacy</Link>
              <Link href="/terms" className="transition-colors hover:text-soft">Terms</Link>
              <a href={`mailto:info@krackit.in`} className="transition-colors hover:text-soft">info@krackit.in</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

import { Logo, LogoMark } from "@/components/logo";
import { Reveal } from "@/components/reveal";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  GraduationCapIcon,
  BriefcaseIcon,
  SlidesIcon,
  MicIcon,
  CodeIcon,
  ResumeIcon,
  LayersIcon,
  StarIcon,
  VideoIcon,
  ChatIcon,
  InstagramIcon,
  FacebookIcon,
  LinkedInIcon,
} from "@/components/icons";
import { ReportMockup, InterviewMockup, DsaMockup } from "./mockups";
import { ClutterToClarityVisual } from "./clutter-to-clarity";
import {
  MechanicalAnimation,
  CivilAnimation,
  ElectricalAnimation,
  ElectronicsAnimation,
  ChemicalAnimation,
  ComputerAnimation,
} from "./branch-effects";
import {
  MockInterviewAnimation,
  DsaPracticeAnimation,
  RecruiterMessagingAnimation,
  LiveInterviewAnimation,
} from "./professional-effects";
import {
  CandidateSearchAnimation,
  VerifiedProfileAnimation,
  RecruiterDirectMessageAnimation,
  LiveInterviewRecruiterAnimation,
} from "./recruiter-effects";

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

const STUDENT_ADVANTAGES = [
  { label: "Branch-wise assignments & reports", Icon: GraduationCapIcon },
  { label: "Reports & PPTs in your college's exact format", Icon: SlidesIcon },
  { label: "AI mock interviews with real-time feedback", Icon: MicIcon },
  { label: "DSA practice with real code execution", Icon: CodeIcon },
  { label: "ATS-ready resume builder", Icon: ResumeIcon },
  { label: "Apply directly to verified recruiters", Icon: BriefcaseIcon },
];

const RECRUITER_ADVANTAGES = [
  { label: "Verified student projects, not just claims", Icon: LayersIcon },
  { label: "Real DSA scores & interview performance", Icon: StarIcon },
  { label: "Live coding interview rooms, built in", Icon: VideoIcon },
  { label: "Direct messaging — no middlemen, no spam", Icon: ChatIcon },
];

// `tags` mirrors the real gating in apps/web/lib/capabilities.ts (BRANCH_FEATURES) — every tool
// named there actually exists and is restricted to that department; nothing in `tags` is
// aspirational. `labSoon` is the one deliberate exception: a not-yet-built interactive lab,
// rendered with its own "coming soon" treatment so it never gets mistaken for a shipped tool.
// Tailwind (JIT) only generates classes that appear as complete literal strings in source, so
// each branch carries its own pre-built class strings rather than a bare color name interpolated
// at render time — a `bg-${color}/10` template would silently produce no CSS at all.
const BRANCHES = [
  {
    name: "Mechanical Engineering",
    Animation: MechanicalAnimation,
    iconWrap: "bg-cyan/10 text-cyan",
    watermark: "text-cyan",
    hoverBorder: "hover:border-cyan/30",
    tag: "bg-cyan/8 text-cyan",
    blurb:
      "Workshop and lab reports in your department's format, a step-by-step numerical solver for strength of materials, thermodynamics, and machine design — plus AI-graded engineering drawing viva prep.",
    tags: ["Numerical Solver", "Drawing Viva", "Lab Reports"],
    labSoon: "Drag-and-simulate mechanism & linkage design lab",
    rgb: "246, 146, 30",
  },
  {
    name: "Civil Engineering",
    Animation: CivilAnimation,
    iconWrap: "bg-indigo/10 text-indigo",
    watermark: "text-indigo",
    hoverBorder: "hover:border-indigo/30",
    tag: "bg-indigo/8 text-indigo",
    blurb:
      "RCC beam, column, slab, and footing design checks cited straight from IS 456 / IS 800, plus instant BOQ and cost estimation for your site and drawing projects.",
    tags: ["Structural Checker", "BOQ Estimator", "Lab Reports"],
    labSoon: "Interactive 3D structural model walkthroughs",
    rgb: "247, 193, 49",
  },
  {
    name: "Electrical Engineering",
    Animation: ElectricalAnimation,
    iconWrap: "bg-amber-500/10 text-amber-600",
    watermark: "text-amber-500",
    hoverBorder: "hover:border-amber-500/30",
    tag: "bg-amber-500/8 text-amber-600",
    blurb:
      "Motors, transformers, protection, and power systems — unit-checked, step-by-step solutions for every numerical, plus lab reports in your exact format.",
    tags: ["Numerical Solver", "Lab Reports"],
    labSoon: "Drag-and-drop circuit & power system simulator",
    rgb: "245, 158, 11",
  },
  {
    name: "Electronics & Telecom",
    Animation: ElectronicsAnimation,
    iconWrap: "bg-violet-500/10 text-violet-600",
    watermark: "text-violet-500",
    hoverBorder: "hover:border-violet-500/30",
    tag: "bg-violet-500/8 text-violet-600",
    blurb:
      "Op-amp circuits, filter design, signal processing, digital logic, and VLSI basics, solved step by step — with lab reports and assignments handled too.",
    tags: ["Numerical Solver", "Lab Reports"],
    labSoon: "Live op-amp & filter circuit simulator",
    rgb: "139, 92, 246",
  },
  {
    name: "Chemical Engineering",
    Animation: ChemicalAnimation,
    iconWrap: "bg-emerald-500/10 text-emerald-600",
    watermark: "text-emerald-500",
    hoverBorder: "hover:border-emerald-500/30",
    tag: "bg-emerald-500/8 text-emerald-600",
    blurb:
      "Mass and energy balances, reaction stoichiometry, and reactor design — describe the problem or upload your PFD and get back a unit-checked solution.",
    tags: ["Numerical Solver", "Lab Reports"],
    labSoon: "Interactive P&ID and reactor simulation lab",
    rgb: "16, 185, 129",
  },
  {
    name: "Computer Engineering & IT",
    Animation: ComputerAnimation,
    iconWrap: "bg-teal/10 text-teal",
    watermark: "text-teal",
    hoverBorder: "hover:border-teal/30",
    tag: "bg-teal/8 text-teal",
    blurb:
      "DSA practice with real code execution, coding-round mock interviews, and every core tool built in — this is the branch krackit was built around first.",
    tags: ["DSA Practice", "Coding Interviews"],
    labSoon: "Visual DSA & algorithm walkthrough lab",
    rgb: "0, 106, 97",
  },
] as const;

const OTHER_BRANCHES = "Aerospace, Biomedical, Automobile, Production, Instrumentation, and more";

// PROFESSIONAL user accounts are restricted to exactly these surfaces — see
// `requireStudentRoute()` in apps/web/lib/user.ts, which bounces PROFESSIONAL users away from
// the student-only self-serve tools (assignments, reports, resume, etc.) and settings/page.tsx's
// PROFESSIONAL_KINDS ("INTERVIEW", "DSA"). Messaging and live rooms are the recruiter-driven
// surfaces professionals reach once a recruiter engages. Nothing here is aspirational.
const PROFESSIONALS = [
  {
    name: "Mock Interviews",
    Animation: MockInterviewAnimation,
    iconWrap: "bg-cyan/10 text-cyan",
    hoverBorder: "hover:border-cyan/30",
    tag: "bg-cyan/8 text-cyan",
    blurb:
      "Practice live, voice-to-voice, with follow-up questions based on what you just said — then get a detailed breakdown of what to fix before the real thing.",
    tags: ["Voice-to-voice", "Real-time feedback"],
    rgb: "246, 146, 30",
  },
  {
    name: "DSA Practice",
    Animation: DsaPracticeAnimation,
    iconWrap: "bg-teal/10 text-teal",
    hoverBorder: "hover:border-teal/30",
    tag: "bg-teal/8 text-teal",
    blurb:
      "Stay sharp with curated problems that run against real test cases in a real editor — a score a recruiter can trust, not a streak for its own sake.",
    tags: ["Real code execution", "Curated problems"],
    rgb: "0, 106, 97",
  },
  {
    name: "Recruiter Messaging",
    Animation: RecruiterMessagingAnimation,
    iconWrap: "bg-indigo/10 text-indigo",
    hoverBorder: "hover:border-indigo/30",
    tag: "bg-indigo/8 text-indigo",
    blurb:
      "When a recruiter is interested in your profile, message them directly — no cold outreach, no middlemen, no spam.",
    tags: ["Direct messaging", "No spam"],
    rgb: "247, 193, 49",
  },
  {
    name: "Live Interview Rooms",
    Animation: LiveInterviewAnimation,
    iconWrap: "bg-violet-500/10 text-violet-600",
    hoverBorder: "hover:border-violet-500/30",
    tag: "bg-violet-500/8 text-violet-600",
    blurb:
      "Join real, live coding interview rooms built into the platform — no separate video call link, no context switching.",
    tags: ["Live coding rooms", "Built in, not bolted on"],
    rgb: "139, 92, 246",
  },
] as const;

// RECRUITER_FEATURES mirrors what's actually shipped in apps/recruiter: candidate search
// (`/students`, listVisibleStudents — department + name filtering only, no DSA-score threshold
// filter), verified profiles (`getStudentDetail`: DSA count, verified projects, resume, average
// interview score), direct messaging (`RecruiterMessage`), and live interview rooms
// (`/interviews/[id]`, LiveKit-backed). No dashboard/analytics — that isn't built.
const RECRUITER_FEATURES = [
  {
    name: "Candidate Search & Discovery",
    Animation: CandidateSearchAnimation,
    iconWrap: "bg-cyan/10 text-cyan",
    hoverBorder: "hover:border-cyan/30",
    tag: "bg-cyan/8 text-cyan",
    blurb:
      "Filter students by department and search by name, and see real DSA activity on every card — not a resume PDF with no way to verify it.",
    tags: ["Department filters", "Live DSA activity"],
    rgb: "246, 146, 30",
  },
  {
    name: "Verified Profiles",
    Animation: VerifiedProfileAnimation,
    iconWrap: "bg-teal/10 text-teal",
    hoverBorder: "hover:border-teal/30",
    tag: "bg-teal/8 text-teal",
    blurb:
      "Every profile carries real signal — DSA problems solved, verified projects, an ATS-ready resume, and an average interview score — not self-reported claims.",
    tags: ["Verified projects", "Real interview scores"],
    rgb: "0, 106, 97",
  },
  {
    name: "Direct Messaging",
    Animation: RecruiterDirectMessageAnimation,
    iconWrap: "bg-indigo/10 text-indigo",
    hoverBorder: "hover:border-indigo/30",
    tag: "bg-indigo/8 text-indigo",
    blurb:
      "Message a candidate the moment their profile stands out — no cold outreach templates, no third-party recruiter inbox.",
    tags: ["Direct messaging", "No middlemen"],
    rgb: "247, 193, 49",
  },
  {
    name: "Live Interview Rooms",
    Animation: LiveInterviewRecruiterAnimation,
    iconWrap: "bg-violet-500/10 text-violet-600",
    hoverBorder: "hover:border-violet-500/30",
    tag: "bg-violet-500/8 text-violet-600",
    blurb:
      "Schedule and run the coding round inside krackit — live code sandbox, transcript, and AI-assisted judgment, without a separate video call link.",
    tags: ["Live coding rooms", "AI-assisted judgment"],
    rgb: "139, 92, 246",
  },
] as const;

const SOCIAL_LINKS = [
  { label: "Instagram", href: "https://instagram.com/krackit.in", Icon: InstagramIcon },
  { label: "LinkedIn", href: "https://linkedin.com/company/krackit", Icon: LinkedInIcon },
  { label: "Facebook", href: "https://facebook.com/krackit.in", Icon: FacebookIcon },
];

export function RootLanding() {
  return (
    <div className="min-h-screen overflow-hidden bg-canvas">
      {/* NAV */}
      <header className="animate-fade-in-up fixed inset-x-0 top-0 z-50 border-b border-line bg-base/80 backdrop-blur-lg">
        <div className="mx-auto flex h-[64px] max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12 xl:px-16">
          <Logo size={30} />
          <div className="flex items-center gap-2">
            <a href={`${APP_URL}/sign-in`} className="hidden rounded-xl px-4 py-2 text-[13px] font-semibold text-soft transition-colors hover:bg-surface sm:block">
              Students
            </a>
            <a href={`${RECRUITER_URL}/sign-in`} className="hidden rounded-xl px-4 py-2 text-[13px] font-semibold text-soft transition-colors hover:bg-surface sm:block">
              Recruiters
            </a>
            <a href="#contact" className="hidden rounded-xl px-4 py-2 text-[13px] font-semibold text-soft transition-colors hover:bg-surface sm:block">
              Contact
            </a>
            <ThemeToggle compact className="!px-2.5" />
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
      <section className="relative mx-auto flex max-w-[1440px] flex-col items-center justify-center px-5 pb-16 pt-28 text-center sm:px-8 lg:min-h-screen lg:px-12 xl:px-16">
        <div className="pointer-events-none absolute -top-40 left-1/2 size-[600px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(246,146,30,0.08),transparent_70%)] animate-float-drift" />

        <div className="relative w-full">
          <div className="animate-fade-in-up mb-6 inline-block rounded-full border border-cyan/20 bg-cyan/8 px-4 py-1.5 text-[12px] font-semibold tracking-wide text-cyan">
            <span className="mr-2 inline-block size-1.5 animate-pulse-ring rounded-full bg-cyan" />
            The career operating system for students
          </div>

          <h1 className="font-display text-[40px] font-bold leading-[1.08] tracking-tight text-ink sm:text-[54px] lg:text-[62px] xl:text-[70px]">
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

          <div className="animate-fade-in-up stagger-4 mx-auto mt-10 max-w-5xl xl:max-w-6xl">
            <ClutterToClarityVisual />
          </div>

          {/* THE CHOICE — the whole point of this page */}
          <div className="animate-fade-in-up stagger-5 mx-auto mt-10 grid w-full max-w-5xl gap-5 text-left md:grid-cols-2 xl:max-w-6xl">
            <a
              href={`${APP_URL}/sign-in`}
              className="group relative overflow-hidden rounded-3xl border border-line bg-card p-7 transition-all duration-300 hover:-translate-y-1.5 hover:border-cyan/40 hover:shadow-[0_18px_50px_rgba(246,146,30,0.18)]"
            >
              <div className="pointer-events-none absolute -right-12 -top-12 size-40 rounded-full bg-[radial-gradient(circle,rgba(246,146,30,0.14),transparent_70%)] transition-transform duration-500 group-hover:scale-125" />
              <span className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-accent-gradient text-on-accent shadow-[0_8px_20px_rgba(246,146,30,0.3)]">
                <GraduationCapIcon size={22} />
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
              href={`${RECRUITER_URL}/sign-in`}
              className="group relative overflow-hidden rounded-3xl border border-line bg-card p-7 transition-all duration-300 hover:-translate-y-1.5 hover:border-indigo/40 hover:shadow-[0_18px_50px_rgba(129,140,248,0.18)]"
            >
              <div className="pointer-events-none absolute -right-12 -top-12 size-40 rounded-full bg-[radial-gradient(circle,rgba(129,140,248,0.14),transparent_70%)] transition-transform duration-500 group-hover:scale-125" />
              <span className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo/80 to-violet/70 text-white shadow-[0_8px_20px_rgba(129,140,248,0.3)]">
                <BriefcaseIcon size={22} />
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

      {/* ADVANTAGES — the same pitch, broken down per audience */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-[1440px] px-5 py-24 sm:px-8 lg:px-12 xl:px-16">
          <Reveal>
            <div className="mb-14 text-center">
              <h2 className="font-display text-[30px] font-bold text-ink sm:text-[36px]">
                Built for both sides of the table
              </h2>
              <p className="mt-3 text-[15px] text-muted">
                Everything a student needs to build proof of work — everything a recruiter needs to trust it.
              </p>
            </div>
          </Reveal>

          <div className="grid gap-6 md:grid-cols-2">
            <Reveal>
              <div className="h-full rounded-3xl border border-line bg-card p-7">
                <div className="flex items-center gap-3">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-accent-gradient text-on-accent">
                    <GraduationCapIcon size={20} />
                  </span>
                  <h3 className="font-display text-[19px] font-bold text-ink">For students</h3>
                </div>
                <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {STUDENT_ADVANTAGES.map(({ label, Icon }) => (
                    <div key={label} className="flex items-start gap-2.5 rounded-xl border border-line bg-surface/60 p-3.5">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-cyan/10 text-cyan">
                        <Icon size={16} />
                      </span>
                      <span className="text-[13px] font-medium leading-snug text-soft">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal delay={100}>
              <div className="h-full rounded-3xl border border-line bg-card p-7">
                <div className="flex items-center gap-3">
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo/80 to-violet/70 text-white">
                    <BriefcaseIcon size={20} />
                  </span>
                  <h3 className="font-display text-[19px] font-bold text-ink">For recruiters</h3>
                </div>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {RECRUITER_ADVANTAGES.map(({ label, Icon }) => (
                    <div key={label} className="flex items-start gap-2.5 rounded-xl border border-line bg-surface/60 p-3.5">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-indigo/10 text-indigo">
                        <Icon size={16} />
                      </span>
                      <span className="text-[13px] font-medium leading-snug text-soft">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* BRANCH COVERAGE — how deep the platform goes for each engineering branch */}
      <section className="border-t border-line bg-surface/40">
        <div className="mx-auto max-w-[1440px] px-5 py-24 sm:px-8 lg:px-12 xl:px-16">
          <Reveal>
            <div className="mb-14 text-center">
              <h2 className="font-display text-[30px] font-bold text-ink sm:text-[36px]">
                Built branch by branch, not one-size-fits-all
              </h2>
              <p className="mx-auto mt-3 max-w-[560px] text-[15px] text-muted">
                Assignments, reports, resumes, DSA, and interviews work for every branch. On top of
                that, each department gets tools built specifically for what it actually studies.
              </p>
            </div>
          </Reveal>

          {/* Ladder: one rectangle per branch, tool image and lab info swapping sides every
              row so it reads as a staircase down the page rather than a uniform grid. Each
              card's side panel is an always-on animation specific to that discipline (gears
              turning, circuits pulsing, etc.) rather than a static department icon. */}
          <div className="flex flex-col gap-6 lg:gap-8">
            {BRANCHES.map(({ name, Animation, iconWrap, hoverBorder, tag, blurb, tags, labSoon, rgb }, i) => {
              const imageRight = i % 2 === 1;
              return (
                <Reveal key={name} delay={i * 60}>
                  <div
                    className={`group relative overflow-hidden rounded-3xl border border-line bg-card transition-colors duration-300 ${hoverBorder}`}
                  >
                    <div className={`relative flex flex-col ${imageRight ? "sm:flex-row-reverse" : "sm:flex-row"}`}>
                      <div className={`flex items-center justify-center p-10 sm:w-[36%] ${iconWrap}`}>
                        <Animation rgb={rgb} />
                      </div>
                      <div className="flex-1 p-6 sm:p-8">
                        <h3 className="font-display text-[19px] font-bold text-ink">{name}</h3>
                        <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{blurb}</p>
                        <div className="mt-4 flex flex-wrap gap-1.5">
                          {tags.map((t) => (
                            <span key={t} className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${tag}`}>
                              {t}
                            </span>
                          ))}
                        </div>
                        {/* Not-yet-built, called out honestly — dashed border + top rule keep it visually distinct from the shipped tags above */}
                        <p className="mt-4 flex items-start gap-1.5 border-t border-dashed border-line-strong pt-3 text-[12px] leading-relaxed text-faint">
                          <span className="mt-px inline-block shrink-0 rounded-full border border-dashed border-line-strong px-1.5 py-0.5 text-[9px] font-semibold tracking-wide">
                            SOON
                          </span>
                          Interactive lab: {labSoon}
                        </p>
                      </div>
                    </div>
                  </div>
                </Reveal>
              );
            })}

            {/* Coming soon — every other branch, honest about what's not built yet */}
            <Reveal delay={BRANCHES.length * 60}>
              <div className="rounded-3xl border border-dashed border-line-strong bg-transparent p-8 text-center">
                <span className="inline-block rounded-full border border-line-strong px-2.5 py-1 text-[11px] font-semibold tracking-wide text-faint">
                  COMING SOON
                </span>
                <h3 className="mt-4 font-display text-[17px] font-bold text-ink">Don&apos;t see your branch?</h3>
                <p className="mx-auto mt-2 max-w-[480px] text-[13px] leading-relaxed text-muted">
                  Reports, assignments, resumes, and interview prep already work for every branch — a
                  dedicated numerical solver for yours is next.
                </p>
                <p className="mt-3 text-[12px] text-faint">{OTHER_BRANCHES}</p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* WORKING PROFESSIONALS — same ladder format as the branch section above, but for the
          PROFESSIONAL account type: mock interviews + DSA practice (self-serve) plus recruiter
          messaging + live interview rooms (recruiter-driven). See the PROFESSIONALS comment for
          why these four and no others. */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-[1440px] px-5 py-24 sm:px-8 lg:px-12 xl:px-16">
          <Reveal>
            <div className="mb-14 text-center">
              <h2 className="font-display text-[30px] font-bold text-ink sm:text-[36px]">
                Already working? krackit isn&apos;t just for students
              </h2>
              <p className="mx-auto mt-3 max-w-[560px] text-[15px] text-muted">
                Sharpen your interview game, keep your DSA fresh, and connect directly with
                recruiters — the same platform, tuned for where you already are in your career.
              </p>
            </div>
          </Reveal>

          <div className="flex flex-col gap-6 lg:gap-8">
            {PROFESSIONALS.map(({ name, Animation, iconWrap, hoverBorder, tag, blurb, tags, rgb }, i) => {
              const imageRight = i % 2 === 1;
              return (
                <Reveal key={name} delay={i * 60}>
                  <div
                    className={`group relative overflow-hidden rounded-3xl border border-line bg-card transition-colors duration-300 ${hoverBorder}`}
                  >
                    <div className={`relative flex flex-col ${imageRight ? "sm:flex-row-reverse" : "sm:flex-row"}`}>
                      <div className={`flex items-center justify-center p-10 sm:w-[36%] ${iconWrap}`}>
                        <Animation rgb={rgb} />
                      </div>
                      <div className="flex-1 p-6 sm:p-8">
                        <h3 className="font-display text-[19px] font-bold text-ink">{name}</h3>
                        <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{blurb}</p>
                        <div className="mt-4 flex flex-wrap gap-1.5">
                          {tags.map((t) => (
                            <span key={t} className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${tag}`}>
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* RECRUITERS — same ladder format again, this time for what apps/recruiter ships:
          candidate search, verified profiles, direct messaging, and live interview rooms. See
          the RECRUITER_FEATURES comment for what's deliberately left out (no dashboard/analytics,
          no DSA-score-threshold filter — neither is built). */}
      <section className="border-t border-line bg-surface/40">
        <div className="mx-auto max-w-[1440px] px-5 py-24 sm:px-8 lg:px-12 xl:px-16">
          <Reveal>
            <div className="mb-14 text-center">
              <h2 className="font-display text-[30px] font-bold text-ink sm:text-[36px]">
                Hiring? See the tools built for recruiters
              </h2>
              <p className="mx-auto mt-3 max-w-[560px] text-[15px] text-muted">
                Find candidates with real signal, message them directly, and run the interview —
                all inside krackit, not stitched together from a resume PDF and a video call link.
              </p>
            </div>
          </Reveal>

          <div className="flex flex-col gap-6 lg:gap-8">
            {RECRUITER_FEATURES.map(({ name, Animation, iconWrap, hoverBorder, tag, blurb, tags, rgb }, i) => {
              const imageRight = i % 2 === 1;
              return (
                <Reveal key={name} delay={i * 60}>
                  <div
                    className={`group relative overflow-hidden rounded-3xl border border-line bg-card transition-colors duration-300 ${hoverBorder}`}
                  >
                    <div className={`relative flex flex-col ${imageRight ? "sm:flex-row-reverse" : "sm:flex-row"}`}>
                      <div className={`flex items-center justify-center p-10 sm:w-[36%] ${iconWrap}`}>
                        <Animation rgb={rgb} />
                      </div>
                      <div className="flex-1 p-6 sm:p-8">
                        <h3 className="font-display text-[19px] font-bold text-ink">{name}</h3>
                        <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{blurb}</p>
                        <div className="mt-4 flex flex-wrap gap-1.5">
                          {tags.map((t) => (
                            <span key={t} className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${tag}`}>
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* FEATURE DEEP DIVE */}
      <section className="border-t border-line bg-surface/40">
        <div className="mx-auto max-w-[1440px] px-5 py-24 sm:px-8 lg:px-12 xl:px-16">
          <Reveal>
            <div className="mb-16 text-center">
              <h2 className="font-display text-[30px] font-bold text-ink sm:text-[36px]">
                A closer look at the tools
              </h2>
              <p className="mt-3 text-[15px] text-muted">
                Real screens, not mockups of an idea. This is what students and recruiters actually use.
              </p>
            </div>
          </Reveal>

          <Reveal>
            <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
              <div>
                <span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-cyan/20 to-cyan/5 text-xl">
                  <SlidesIcon size={20} className="text-cyan" />
                </span>
                <h3 className="font-display text-[22px] font-semibold text-ink">Assignments, reports & PPTs, in your college&apos;s format</h3>
                <p className="mt-2.5 max-w-[420px] text-[14px] leading-relaxed text-muted">
                  Snap a photo or paste a question. Get back a fully formatted document — headings,
                  citations, and structure matching your department&apos;s exact style.
                </p>
              </div>
              <ReportMockup />
            </div>
          </Reveal>

          <Reveal>
            <div className="mt-20 grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
              <div className="lg:order-2">
                <span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo/20 to-indigo/5 text-xl">
                  <CodeIcon size={20} className="text-indigo" />
                </span>
                <h3 className="font-display text-[22px] font-semibold text-ink">DSA practice with real code execution</h3>
                <p className="mt-2.5 max-w-[420px] text-[14px] leading-relaxed text-muted">
                  Solve curated problems in a real editor. Code actually runs against test cases —
                  a streak a recruiter can trust, not a progress bar.
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
                <span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-cyan/20 to-cyan/5 text-xl">
                  <MicIcon size={20} className="text-cyan" />
                </span>
                <h3 className="font-display text-[22px] font-semibold text-ink">AI mock interviews that actually push back</h3>
                <p className="mt-2.5 max-w-[420px] text-[14px] leading-relaxed text-muted">
                  Practice live, voice-to-voice, with follow-up questions based on what you just said —
                  then get a breakdown of what to fix before the real thing.
                </p>
              </div>
              <InterviewMockup />
            </div>
          </Reveal>
        </div>
      </section>

      {/* COMPANY + CONTACT */}
      <section id="contact" className="border-t border-line bg-surface/40">
        <Reveal>
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:px-12">
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
                <div className="mt-5 flex gap-2.5">
                  {SOCIAL_LINKS.map(({ label, href, Icon }) => (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      className="flex size-9 items-center justify-center rounded-lg border border-line bg-surface text-muted transition-colors hover:border-cyan/30 hover:text-cyan"
                    >
                      <Icon size={16} />
                    </a>
                  ))}
                </div>
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
          <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-5 py-6 sm:px-8 lg:px-12 xl:px-16">
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

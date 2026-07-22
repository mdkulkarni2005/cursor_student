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
import { ReportMockup, InterviewMockup, DsaMockup, BrowserFrame } from "./mockups";
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

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const RECRUITER_URL = process.env.NEXT_PUBLIC_RECRUITER_APP_URL ?? "http://localhost:3200";
const CONTACT_EMAIL = "support@krackit.in";

const STUDENT_POINTS = [
  "Assignments, reports & PPTs in your college's exact format",
  "AI mock interviews with real-time feedback",
  "DSA practice with code execution & streaks",
  "ATS-ready resumes and a proof-of-work profile",
];

const PROFESSIONAL_POINTS = [
  "AI-powered resume optimization for every career level",
  "Mock interviews tailored to your target role and industry",
  "DSA & coding skill assessments to keep your edge",
  "Shareable profile to showcase your verified work and scores",
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

const STATS = [
  { value: "10,000+", label: "Active Students & Professionals" },
  { value: "50,000+", label: "Reports & Assignments Generated" },
  { value: "95%", label: "ATS Resume Pass Rate" },
  { value: "4.8/5", label: "User Satisfaction Score" },
];

const STAT_GRADIENTS = [
  "conic-gradient(from 0deg, transparent, #FE7F2D, transparent, #006a61, transparent)",
  "conic-gradient(from 90deg, transparent, #F7C131, transparent, #FE7F2D, transparent)",
  "conic-gradient(from 180deg, transparent, #006a61, transparent, #F7C131, transparent)",
  "conic-gradient(from 270deg, transparent, #FE7F2D, transparent, #86f2e4, transparent)",
];

const STAT_CARD_BG = [
  "bg-[#0d1b2a]",
  "bg-[#0f1923]",
  "bg-[#0e1a26]",
  "bg-[#0c1e28]",
];

const HOW_IT_WORKS = [
  { step: "01", title: "Create your free account", desc: "Sign up in under 30 seconds. Students get instant access to their college tools; professionals unlock career-advancement features. No credit card required.", icon: "🚀" },
  { step: "02", title: "Prove your skills with real work", desc: "Generate branch-specific reports, practice DSA with live code execution, and build an ATS-ready resume. Every submission runs against real test cases — not simulations.", icon: "⚡" },
  { step: "03", title: "Get discovered by recruiters", desc: "Your verified projects, interview scores, and skill badges create a shareable proof-of-work profile. Recruiters find you based on real signal, not self-reported claims.", icon: "🎯" },
];

const FAQS = [
  { q: "What is krackit and how does it work?", a: "krackit is a career acceleration platform where students create academic work, professionals upskill, and recruiters hire based on verified evidence. Students generate reports, practice DSA, and build resumes — all in their college's exact format. Professionals sharpen interview skills and maintain coding proficiency. Recruiters search verified profiles with real DSA scores and interview performance data." },
  { q: "Is krackit free for students?", a: "Yes. Students get free access to reports, assignments, PPT generation, DSA practice, resume building, and AI mock interviews. Premium plans unlock higher monthly usage limits, priority generation queues, and 1:1 mentor reviews." },
  { q: "Which engineering branches does krackit support?", a: "krackit supports all engineering branches including Mechanical, Civil, Electrical, Electronics & Telecom, Chemical, and Computer Engineering & IT. Each branch gets tools built specifically for its curriculum — from strength of materials solvers to RCC design checkers. Aerospace, Biomedical, Automobile, Production, and Instrumentation branches are in active development." },
  { q: "How do recruiters verify candidate skills on krackit?", a: "Recruiters see real data — DSA problems solved with live code execution results, verified project portfolios, AI-assessed interview scores, and ATS-ready resumes. Every profile metric is generated through actual platform use, not self-reported claims. Recruiters can also schedule live coding interview rooms directly through krackit." },
  { q: "Can professionals use krackit alongside their job?", a: "Absolutely. Professionals get AI-powered resume optimization for every career level, mock interviews tailored to target roles, DSA and coding skill assessments, and a shareable profile to showcase verified work and scores. Recruiter messaging and live interview rooms unlock when a recruiter engages with your profile." },
  { q: "How does krackit protect my data and privacy?", a: "krackit follows industry-standard security practices. Your documents, interview recordings, and personal information are encrypted in transit and at rest. We never share your data without explicit consent. See our Privacy Policy for full details." },
];

const ROOT_ORG_SCHEMA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://krackit.in/#organization",
      name: "krackit",
      alternateName: "krackit by Quorium Technologies",
      description: "Career acceleration platform where students create, professionals upskill, and recruiters hire on verified evidence.",
      url: "https://krackit.in",
      logo: "https://krackit.in/icon.png",
      contactPoint: { "@type": "ContactPoint", email: "support@krackit.in", contactType: "customer service" },
    },
    {
      "@type": "WebSite",
      "@id": "https://krackit.in/#website",
      url: "https://krackit.in",
      name: "krackit — Career Acceleration Platform",
      description: "AI-powered platform for engineering students, working professionals, and recruiters. Generate reports, practice DSA, ace interviews, and hire verified talent.",
      publisher: { "@id": "https://krackit.in/#organization" },
      inLanguage: "en-IN",
    },
    {
      "@type": "FAQPage",
      "@id": "https://krackit.in/#faq",
      mainEntity: FAQS.map(({ q, a }) => ({
        "@type": "Question",
        name: q,
        acceptedAnswer: { "@type": "Answer", text: a },
      })),
    },
  ],
};

function StructuredData() {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ROOT_ORG_SCHEMA) }} />;
}

function GradientBorderCard({
  gradient,
  bgClass = "bg-[#0d1b2a]",
  className = "",
  animationDuration = "6s",
  children,
}: {
  gradient?: string;
  bgClass?: string;
  className?: string;
  animationDuration?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`group relative overflow-hidden rounded-2xl ${className}`}>
      <div
        className="pointer-events-none absolute -inset-[1px] rounded-2xl opacity-60"
        style={{
          background: gradient ?? "conic-gradient(from 0deg, transparent, #FE7F2D, transparent, #006a61, transparent)",
          animation: `borderRotate ${animationDuration} linear infinite`,
        }}
      />
      <div className={`relative m-[1px] rounded-2xl ${bgClass}`}>
        {children}
      </div>
    </div>
  );
}

function StaticBorderCard({
  gradient = "linear-gradient(135deg, rgba(254,127,45,0.3), rgba(0,106,97,0.15), rgba(247,193,49,0.2))",
  bgClass = "bg-card",
  className = "",
  children,
}: {
  gradient?: string;
  bgClass?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl ${className}`}>
      <div
        className="pointer-events-none absolute -inset-[1px] rounded-2xl opacity-50"
        style={{ background: gradient }}
      />
      <div className={`relative m-[1px] rounded-2xl ${bgClass}`}>
        {children}
      </div>
    </div>
  );
}

function Card3D({
  gradient,
  bgClass = "bg-card",
  className = "",
  children,
}: {
  gradient?: string;
  bgClass?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="transition-all duration-500 hover:[transform:rotateX(3deg)_rotateY(-3deg)_translateY(-6px)]"
      style={{ perspective: "1000px" }}
    >
      <div className={`group relative overflow-hidden rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] transition-shadow duration-500 hover:shadow-[0_20px_60px_rgba(0,0,0,0.3)] ${className}`}>
        <div
          className="pointer-events-none absolute -inset-[1px] rounded-2xl opacity-60 transition-opacity duration-500 group-hover:opacity-100"
          style={{ background: gradient }}
        />
        <div className={`relative m-[1px] rounded-2xl ${bgClass}`}>
          {children}
        </div>
      </div>
    </div>
  );
}

function StatsBar() {
  return (
    <section className="border-y border-line">
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
          {STATS.map(({ value, label }, i) => (
            <GradientBorderCard
              key={label}
              gradient={STAT_GRADIENTS[i]}
              bgClass={STAT_CARD_BG[i]}
              animationDuration={`${6 + i * 1.5}s`}
            >
              <div className="px-4 py-8 text-center sm:px-6 sm:py-10">
                <p className="font-display text-[32px] font-bold leading-none text-cyan sm:text-[38px]">
                  {value}
                </p>
                <p className="mt-3 text-[13px] font-medium leading-snug text-gray-300 sm:text-[14px]">
                  {label}
                </p>
              </div>
            </GradientBorderCard>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="border-b border-line bg-surface/40">
      <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
        <div className="mx-auto mb-16 max-w-[600px] text-center">
          <span className="mb-4 inline-block rounded-full border border-cyan/20 bg-cyan/8 px-4 py-1.5 text-[12px] font-semibold tracking-wide text-cyan">HOW IT WORKS</span>
          <h2 className="font-display text-[34px] font-bold leading-[1.12] text-ink sm:text-[42px]">
            Three steps to a verified career
          </h2>
          <p className="mt-3 text-[16px] text-muted">
            From first sign-up to your next opportunity — krackit guides every step with real tools, not empty promises.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {HOW_IT_WORKS.map(({ step, title, desc, icon }, i) => (
            <GradientBorderCard
              key={step}
              gradient="conic-gradient(from 0deg, transparent, rgba(254,127,45,0.5), transparent, rgba(0,106,97,0.4), transparent)"
              bgClass="bg-[#0f1a24]"
              animationDuration="8s"
            >
              <div className="p-7 text-center sm:p-8">
                <span className="mx-auto flex size-14 items-center justify-center rounded-xl bg-accent-gradient/10 text-[26px]">
                  {icon}
                </span>
                <h3 className="mt-5 font-display text-[19px] font-bold text-white">{title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-gray-300">{desc}</p>
                <span className="mt-6 inline-flex size-7 items-center justify-center rounded-full border border-white/15 text-[11px] font-semibold text-gray-400">
                  {step}
                </span>
              </div>
            </GradientBorderCard>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  return (
    <section id="faq" className="border-b border-line bg-surface/40">
      <div className="mx-auto max-w-4xl px-5 py-24 sm:px-8">
        <div className="mb-14 text-center">
          <span className="mb-4 inline-block rounded-full border border-indigo/20 bg-indigo/8 px-4 py-1.5 text-[12px] font-semibold tracking-wide text-indigo">FAQ</span>
          <h2 className="font-display text-[32px] font-bold text-ink sm:text-[38px]">
            Frequently asked questions
          </h2>
          <p className="mx-auto mt-3 max-w-[520px] text-[16px] text-muted">
            Everything you need to know about krackit. Still have questions? Reach out to our team.
          </p>
        </div>
        <div className="space-y-3">
          {FAQS.map(({ q, a }) => (
            <details key={q} className="group rounded-xl border border-line bg-card transition-colors open:border-cyan/30 hover:border-line-strong">
              <summary className="flex cursor-pointer items-center justify-between px-6 py-5 text-[15px] font-semibold text-ink transition-colors group-open:text-cyan">
                {q}
                <span className="ml-4 shrink-0 text-[18px] text-faint transition-transform duration-300 group-open:rotate-180 group-open:text-cyan">▾</span>
              </summary>
              <div className="border-t border-line px-6 pb-5 pt-3">
                <p className="text-[14.5px] leading-relaxed text-muted">{a}</p>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function RootLanding() {
  return (
    <div className="min-h-screen overflow-hidden bg-canvas">
      <StructuredData />

      <header className="fixed inset-x-0 top-0 z-50 border-b border-line bg-base/70 backdrop-blur-xl">
        <div className="mx-auto flex h-[64px] max-w-7xl items-center justify-between px-5">
          <Logo size={30} />
          <div className="flex items-center gap-4 sm:gap-6">
            <a href={APP_URL} className="hidden text-[14px] font-medium text-soft transition-colors hover:text-ink sm:block">
              Students
            </a>
            <a href={`${APP_URL}/for-professionals`} className="hidden text-[14px] font-medium text-soft transition-colors hover:text-ink lg:block">
              Professionals
            </a>
            <a href={RECRUITER_URL} className="hidden text-[14px] font-medium text-soft transition-colors hover:text-ink sm:block">
              Recruiters
            </a>
            <a href="#contact" className="hidden text-[14px] font-medium text-soft transition-colors hover:text-ink sm:block">
              Contact
            </a>
            <div className="flex items-center gap-3">
              <a
                href={`${APP_URL}/sign-in`}
                className="text-[14px] font-medium text-soft transition-colors hover:text-ink"
              >
                Sign in
              </a>
              <a
                href={`${APP_URL}/sign-up`}
                className="rounded-xl bg-accent-gradient px-5 py-2.5 text-[14px] font-semibold text-on-accent shadow-[0_4px_16px_rgba(254,127,45,0.25)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(254,127,45,0.35)]"
              >
                Get started
              </a>
              <ThemeToggle compact className="!px-2" />
            </div>
          </div>
        </div>
      </header>

      <section className="relative mx-auto flex max-w-7xl flex-col items-center justify-center px-5 pb-16 pt-28 text-center lg:min-h-screen">
        <div className="pointer-events-none absolute -top-40 left-1/2 size-[800px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(254,127,45,0.06),transparent_70%)] animate-float-drift" />
        <div className="pointer-events-none absolute -bottom-40 right-[-10%] size-[500px] rounded-full bg-[radial-gradient(circle,rgba(0,106,97,0.04),transparent_70%)] animate-float-drift" />

        <div className="relative w-full">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan/20 bg-cyan/8 px-4 py-1.5 text-[13px] font-semibold tracking-wide text-cyan">
            <span className="inline-block size-1.5 animate-pulse-ring rounded-full bg-cyan" />
            The career platform for everyone
          </div>

          <h1 className="font-display text-[40px] font-bold leading-[1.08] tracking-tight text-ink sm:text-[54px] lg:text-[62px] xl:text-[70px]">
            <span className="block">Crack college. Crack interviews.</span>
            <span className="mt-2 block">
              <span className="bg-gradient-to-r from-cyan via-indigo to-cyan bg-clip-text text-transparent">
                Crack your career.
              </span>
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-[640px] text-[17px] leading-relaxed text-muted sm:text-[18px]">
            krackit is the AI-powered career platform where engineering students create academic work, professionals upskill with mock interviews and DSA practice, and recruiters hire based on verified evidence — not resumes that anyone can fake.
          </p>

          <div className="mx-auto mt-10 max-w-5xl xl:max-w-6xl">
            <ClutterToClarityVisual />
          </div>

          <div className="mx-auto mt-10 grid w-full max-w-6xl gap-5 text-left md:grid-cols-3">
            <StaticBorderCard
              gradient="linear-gradient(135deg, rgba(254,127,45,0.35), rgba(254,127,45,0.05))"
            >
              <a
                href={APP_URL}
                className="block p-7 transition-all duration-300 hover:-translate-y-1"
              >
                <span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-accent-gradient text-on-accent shadow-[0_4px_12px_rgba(254,127,45,0.25)]">
                  <GraduationCapIcon size={20} />
                </span>
                <h2 className="font-display text-[22px] font-bold text-ink">I&apos;m a student</h2>
                <p className="mt-1 text-[14px] text-muted">Create, practice, and get hired.</p>
                <ul className="mt-4 space-y-2">
                  {STUDENT_POINTS.map((p) => (
                    <li key={p} className="flex items-start gap-2 text-[14px] leading-relaxed text-soft">
                      <span className="mt-0.5 text-cyan">✓</span>
                      {p}
                    </li>
                  ))}
                </ul>
                <span className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-accent-gradient px-4 py-2.5 text-[14px] font-semibold text-on-accent transition-transform group-hover:translate-x-1">
                  Enter as a student →
                </span>
              </a>
            </StaticBorderCard>

            <StaticBorderCard
              gradient="linear-gradient(135deg, rgba(247,193,49,0.3), rgba(139,92,246,0.1))"
            >
              <a
                href={`${APP_URL}/for-professionals`}
                className="block p-7 transition-all duration-300 hover:-translate-y-1"
              >
                <span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo/80 to-violet/70 text-white shadow-[0_4px_12px_rgba(247,193,49,0.25)]">
                  <BriefcaseIcon size={20} />
                </span>
                <h2 className="font-display text-[22px] font-bold text-ink">I&apos;m a professional</h2>
                <p className="mt-1 text-[14px] text-muted">Upskill, showcase, and advance.</p>
                <ul className="mt-4 space-y-2">
                  {PROFESSIONAL_POINTS.map((p) => (
                    <li key={p} className="flex items-start gap-2 text-[14px] leading-relaxed text-soft">
                      <span className="mt-0.5 text-indigo">✓</span>
                      {p}
                    </li>
                  ))}
                </ul>
                <span className="mt-5 inline-flex items-center gap-1.5 rounded-lg border border-indigo/40 bg-indigo/10 px-4 py-2.5 text-[14px] font-semibold text-ink transition-transform group-hover:translate-x-1">
                  Enter as a professional →
                </span>
              </a>
            </StaticBorderCard>

            <StaticBorderCard
              gradient="linear-gradient(135deg, rgba(247,193,49,0.3), rgba(0,106,97,0.1))"
            >
              <a
                href={RECRUITER_URL}
                className="block p-7 transition-all duration-300 hover:-translate-y-1"
              >
                <span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber/80 to-yellow/60 text-white shadow-[0_4px_12px_rgba(247,193,49,0.25)]">
                  <span className="text-[22px]">💼</span>
                </span>
                <h2 className="font-display text-[22px] font-bold text-ink">I&apos;m a recruiter</h2>
                <p className="mt-1 text-[14px] text-muted">Hire on proof, not promises.</p>
                <ul className="mt-4 space-y-2">
                  {RECRUITER_POINTS.map((p) => (
                    <li key={p} className="flex items-start gap-2 text-[14px] leading-relaxed text-soft">
                      <span className="mt-0.5 text-amber">✓</span>
                      {p}
                    </li>
                  ))}
                </ul>
                <span className="mt-5 inline-flex items-center gap-1.5 rounded-lg border border-amber/40 bg-amber/10 px-4 py-2.5 text-[14px] font-semibold text-ink transition-transform group-hover:translate-x-1">
                  Enter as a recruiter →
                </span>
              </a>
            </StaticBorderCard>
          </div>
        </div>
      </section>

      <StatsBar />

      <section className="border-b border-line">
        <div className="mx-auto max-w-[1440px] px-5 py-24 sm:px-8 lg:px-12 xl:px-16">
          <Reveal>
            <div className="mb-14 text-center">
              <span className="mb-4 inline-block rounded-full border border-cyan/20 bg-cyan/8 px-4 py-1.5 text-[12px] font-semibold tracking-wide text-cyan">PLATFORM</span>
              <h2 className="font-display text-[32px] font-bold text-ink sm:text-[38px]">
                Built for both sides of the table
              </h2>
              <p className="mt-3 text-[16px] text-muted">
                Everything a student needs to build proof of work — everything a recruiter needs to trust it.
              </p>
            </div>
          </Reveal>

          <div className="grid gap-6 md:grid-cols-2">
            <Reveal>
              <StaticBorderCard gradient="linear-gradient(135deg, rgba(254,127,45,0.25), rgba(0,106,97,0.1))">
                <div className="p-7">
                  <div className="flex items-center gap-3">
                    <span className="flex size-11 items-center justify-center rounded-xl bg-accent-gradient text-on-accent">
                      <GraduationCapIcon size={20} />
                    </span>
                    <h3 className="font-display text-[20px] font-bold text-ink">For students</h3>
                  </div>
                  <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {STUDENT_ADVANTAGES.map(({ label, Icon }) => (
                      <div key={label} className="flex items-start gap-2.5 rounded-xl border border-line bg-surface/60 p-3.5 transition-colors hover:bg-cyan/5">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-cyan/10 text-cyan">
                          <Icon size={16} />
                        </span>
                        <span className="text-[14px] font-medium leading-snug text-soft">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </StaticBorderCard>
            </Reveal>

            <Reveal delay={100}>
              <StaticBorderCard gradient="linear-gradient(135deg, rgba(247,193,49,0.25), rgba(139,92,246,0.1))">
                <div className="p-7">
                  <div className="flex items-center gap-3">
                    <span className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo/80 to-violet/70 text-white">
                      <BriefcaseIcon size={20} />
                    </span>
                    <h3 className="font-display text-[20px] font-bold text-ink">For recruiters</h3>
                  </div>
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    {RECRUITER_ADVANTAGES.map(({ label, Icon }) => (
                      <div key={label} className="flex items-start gap-2.5 rounded-xl border border-line bg-surface/60 p-3.5 transition-colors hover:bg-indigo/5">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-indigo/10 text-indigo">
                          <Icon size={16} />
                        </span>
                        <span className="text-[14px] font-medium leading-snug text-soft">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </StaticBorderCard>
            </Reveal>
          </div>
        </div>
      </section>

      <HowItWorks />

      <section className="border-b border-line bg-surface/40">
        <div className="mx-auto max-w-[1440px] px-5 py-24 sm:px-8 lg:px-12 xl:px-16">
          <Reveal>
            <div className="mb-14 text-center">
              <span className="mb-4 inline-block rounded-full border border-cyan/20 bg-cyan/8 px-4 py-1.5 text-[12px] font-semibold tracking-wide text-cyan">BRANCH COVERAGE</span>
              <h2 className="font-display text-[32px] font-bold text-ink sm:text-[38px]">
                Built branch by branch, not one-size-fits-all
              </h2>
              <p className="mx-auto mt-3 max-w-[560px] text-[16px] text-muted">
                Assignments, reports, resumes, DSA, and interviews work for every branch. On top of
                that, each department gets tools built specifically for what it actually studies.
              </p>
            </div>
          </Reveal>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {BRANCHES.map(({ name, Animation, tag, blurb, tags, labSoon, rgb }, i) => (
              <Reveal key={name} delay={i * 60}>
                <div
                  className="group relative overflow-hidden transition-all duration-300 hover:scale-[1.03]"
                  style={{
                    borderRadius: "0.5rem 2rem",
                    boxShadow: "0px 15px 20px -5px rgba(0, 0, 0, 0.5)",
                    backgroundColor: "#0d1b2a",
                  }}
                >
                  {/* Image container with animation */}
                  <div
                    className="relative grid overflow-hidden"
                    style={{
                      height: 260,
                      borderRadius: "0.5rem 2rem",
                      background: "linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.2))",
                    }}
                  >
                    <div className="flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                      <Animation rgb={rgb} />
                    </div>
                  </div>

                  {/* Description overlay */}
                  <div
                    className="absolute bottom-2 left-2 w-[90%] overflow-hidden text-ellipsis whitespace-nowrap transition-all duration-500 ease-in-out"
                    style={{
                      padding: "0.5rem 1em",
                      borderRadius: "0.5rem 2rem",
                      backdropFilter: "blur(0.1rem)",
                      backgroundColor: "rgba(0, 0, 0, 0.4)",
                    }}
                  >
                    <h3 className="text-[15px] font-bold text-white">{name}</h3>
                    <p className="mt-1 text-[12px] text-gray-300 truncate">{blurb}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {tags.map((t) => (
                        <span key={t} className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${tag}`}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={BRANCHES.length * 60}>
            <div className="mt-6 rounded-2xl border border-dashed border-line-strong bg-transparent p-8 text-center">
              <span className="inline-block rounded-full border border-line-strong px-2.5 py-1 text-[12px] font-semibold tracking-wide text-faint">
                COMING SOON
              </span>
              <h3 className="mt-4 font-display text-[18px] font-bold text-ink">Don&apos;t see your branch?</h3>
              <p className="mx-auto mt-2 max-w-[480px] text-[14px] leading-relaxed text-muted">
                Reports, assignments, resumes, and interview prep already work for every branch — a
                dedicated numerical solver for yours is next.
              </p>
              <p className="mt-3 text-[13px] text-faint">{OTHER_BRANCHES}</p>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="border-b border-line bg-surface/40">
        <div className="mx-auto max-w-[1440px] px-5 py-24 sm:px-8 lg:px-12 xl:px-16">
          <Reveal>
            <div className="mb-16 text-center">
              <span className="mb-4 inline-block rounded-full border border-indigo/20 bg-indigo/8 px-4 py-1.5 text-[12px] font-semibold tracking-wide text-indigo">PROFESSIONALS</span>
              <h2 className="font-display text-[32px] font-bold text-ink sm:text-[38px]">
                Already working? krackit isn&apos;t just for students
              </h2>
              <p className="mx-auto mt-3 max-w-[560px] text-[16px] text-muted">
                Sharpen your interview game, keep your DSA fresh, and connect directly with
                recruiters — the same platform, tuned for where you already are in your career.
              </p>
            </div>
          </Reveal>

          <div className="grid gap-6 sm:grid-cols-2">
            {PROFESSIONALS.map(({ name, Animation, tag, blurb, tags, rgb }, i) => (
              <Reveal key={name} delay={i * 60}>
                <StaticBorderCard
                  gradient={`linear-gradient(135deg, rgba(${rgb},0.4), rgba(${rgb},0.05))`}
                >
                  <div className="flex flex-col sm:flex-row">
                    <div
                      className="flex items-center justify-center sm:w-[55%] p-4 sm:p-5"
                      style={{ backgroundColor: `rgba(${rgb}, 0.1)` }}
                    >
                      <Animation rgb={rgb} />
                    </div>
                    <div className="flex flex-1 flex-col justify-center p-6 sm:p-7">
                      <h3 className="font-display text-[20px] font-bold text-ink">{name}</h3>
                      <p className="mt-1 text-[14px] text-muted">{blurb}</p>
                      <ul className="mt-4 space-y-2">
                        {tags.map((t) => (
                          <li key={t} className="flex items-start gap-2 text-[14px] leading-relaxed text-soft">
                            <span className="mt-0.5 text-cyan">✓</span>
                            {t}
                          </li>
                        ))}
                      </ul>
                      <span className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-accent-gradient px-4 py-2.5 text-[14px] font-semibold text-on-accent transition-transform hover:translate-x-1">
                        Learn more →
                      </span>
                    </div>
                  </div>
                </StaticBorderCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-surface/40">
        <div className="mx-auto max-w-[1440px] px-5 py-24 sm:px-8 lg:px-12 xl:px-16">
          <Reveal>
            <div className="mb-16 text-center">
              <span className="mb-4 inline-block rounded-full border border-amber/20 bg-amber/8 px-4 py-1.5 text-[12px] font-semibold tracking-wide text-amber">RECRUITERS</span>
              <h2 className="font-display text-[32px] font-bold text-ink sm:text-[38px]">
                Hiring? See the tools built for recruiters
              </h2>
              <p className="mx-auto mt-3 max-w-[560px] text-[16px] text-muted">
                Find candidates with real signal, message them directly, and run the interview —
                all inside krackit, not stitched together from a resume PDF and a video call link.
              </p>
            </div>
          </Reveal>

          <div className="grid gap-6 sm:grid-cols-2">
            {RECRUITER_FEATURES.map(({ name, Animation, tag, blurb, tags, rgb }, i) => (
              <Reveal key={name} delay={i * 60}>
                <StaticBorderCard
                  gradient={`linear-gradient(135deg, rgba(${rgb},0.4), rgba(${rgb},0.05))`}
                >
                  <div className="flex flex-col sm:flex-row">
                    <div
                      className="flex items-center justify-center sm:w-[55%] p-4 sm:p-5"
                      style={{ backgroundColor: `rgba(${rgb}, 0.1)` }}
                    >
                      <Animation rgb={rgb} />
                    </div>
                    <div className="flex flex-1 flex-col justify-center p-6 sm:p-7">
                      <h3 className="font-display text-[20px] font-bold text-ink">{name}</h3>
                      <p className="mt-1 text-[14px] text-muted">{blurb}</p>
                      <ul className="mt-4 space-y-2">
                        {tags.map((t) => (
                          <li key={t} className="flex items-start gap-2 text-[14px] leading-relaxed text-soft">
                            <span className="mt-0.5 text-cyan">✓</span>
                            {t}
                          </li>
                        ))}
                      </ul>
                      <span className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-accent-gradient px-4 py-2.5 text-[14px] font-semibold text-on-accent transition-transform hover:translate-x-1">
                        Learn more →
                      </span>
                    </div>
                  </div>
                </StaticBorderCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-line">
        <div className="mx-auto max-w-[1440px] px-5 py-24 sm:px-8 lg:px-12 xl:px-16">
          <Reveal>
            <div className="mb-16 text-center">
              <span className="mb-4 inline-block rounded-full border border-cyan/20 bg-cyan/8 px-4 py-1.5 text-[12px] font-semibold tracking-wide text-cyan">FEATURES</span>
              <h2 className="font-display text-[32px] font-bold text-ink sm:text-[38px]">
                See krackit&apos;s tools in action
              </h2>
              <p className="mt-3 text-[16px] text-muted">
                Real screenshots from the actual platform — not concept mockups. Here&apos;s what students and recruiters use every day.
              </p>
            </div>
          </Reveal>

          <Reveal>
            <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
              <div>
                <span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-cyan/20 to-cyan/5">
                  <SlidesIcon size={20} className="text-cyan" />
                </span>
                <h3 className="font-display text-[23px] font-semibold text-ink">AI-powered assignments, reports & PPTs in your college format</h3>
                <p className="mt-2.5 max-w-[420px] text-[15px] leading-relaxed text-muted">
                  Snap a photo of your handwritten problem or paste a question prompt. krackit&apos;s AI generates fully formatted documents with proper headings, inline citations, and structural conventions matching your specific engineering department&apos;s style guide.
                </p>
              </div>
              <ReportMockup />
            </div>
          </Reveal>

          <Reveal>
            <div className="mt-20 grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
              <div className="lg:order-2">
                <span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo/20 to-indigo/5">
                  <CodeIcon size={20} className="text-indigo" />
                </span>
                <h3 className="font-display text-[23px] font-semibold text-ink">Data structures & algorithms practice with live code execution</h3>
                <p className="mt-2.5 max-w-[420px] text-[15px] leading-relaxed text-muted">
                  Solve curated DSA problems in a real code editor with multi-language support. Every submission compiles and runs against hidden test cases — producing a verified score that recruiters trust, not a meaningless completion streak.
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
                <span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-cyan/20 to-cyan/5">
                  <MicIcon size={20} className="text-cyan" />
                </span>
                <h3 className="font-display text-[23px] font-semibold text-ink">AI mock interviews that actually push back</h3>
                <p className="mt-2.5 max-w-[420px] text-[15px] leading-relaxed text-muted">
                  Practice live, voice-to-voice, with follow-up questions based on what you just said —
                  then get a breakdown of what to fix before the real thing.
                </p>
              </div>
              <InterviewMockup />
            </div>
          </Reveal>
        </div>
      </section>

      <FAQ />

      <section id="contact" className="border-b border-line bg-surface/40">
        <Reveal>
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:px-12">
            <div className="grid items-start gap-10 md:grid-cols-2">
              <div>
                <LogoMark size={40} />
                <h2 className="mt-5 font-display text-[26px] font-bold text-ink">
                  Built by Quorium Technologies
                </h2>
                <p className="mt-3 max-w-[440px] text-[15px] leading-relaxed text-muted">
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
                <h3 className="font-display text-[18px] font-semibold text-ink">Get in touch</h3>
                <p className="mt-1 text-[14px] text-muted">
                  Questions, partnerships, or campus programs — we reply fast.
                </p>
                <div className="mt-5 space-y-3">
                  <a
                    href={`mailto:${CONTACT_EMAIL}`}
                    className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-[14px] font-semibold text-ink transition-colors hover:border-cyan/30"
                  >
                    <span className="text-[16px]">✉️</span> {CONTACT_EMAIL}
                  </a>
                  <a
                    href={`${APP_URL}/support`}
                    className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-[14px] font-semibold text-ink transition-colors hover:border-cyan/30"
                  >
                    <span className="text-[16px]">💬</span> In-app support
                  </a>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <footer className="border-b border-line bg-base/80">
        <div className="mx-auto max-w-7xl px-5 pt-16 pb-8">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <Logo size={28} />
              <p className="mt-3 max-w-[320px] text-[14px] leading-relaxed text-muted">
                krackit is the career acceleration platform where students create, professionals
                upskill, and recruiters hire on proof of work — not buzzwords.
              </p>
              <div className="mt-5 flex gap-3">
                <a href="mailto:support@krackit.in" className="flex size-9 items-center justify-center rounded-lg border border-line bg-surface text-muted transition-colors hover:border-cyan/30 hover:text-cyan">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 4L12 13 2 4"/></svg>
                </a>
                <a href="#" className="flex size-9 items-center justify-center rounded-lg border border-line bg-surface text-muted transition-colors hover:border-cyan/30 hover:text-cyan">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.24 2.5H5.76A3.26 3.26 0 002.5 5.76v12.48a3.26 3.26 0 003.26 3.26h6.3v-7.2h-2.4v-2.8h2.4V9.1a3.35 3.35 0 013.58-3.68c.72 0 1.46.06 2.18.18v2.4h-1.24c-1.18 0-1.42.56-1.42 1.38v1.82h2.6l-.42 2.8h-2.18V21.5h3.88a3.26 3.26 0 003.26-3.26V5.76a3.26 3.26 0 00-3.26-3.26z"/></svg>
                </a>
                <a href="#" className="flex size-9 items-center justify-center rounded-lg border border-line bg-surface text-muted transition-colors hover:border-cyan/30 hover:text-cyan">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M22.16 5.66a8.58 8.58 0 01-2.47.68 4.32 4.32 0 001.9-2.38 8.62 8.62 0 01-2.73 1.04 4.3 4.3 0 00-7.34 3.93A12.22 12.22 0 013.15 4.28a4.3 4.3 0 001.33 5.74 4.27 4.27 0 01-1.95-.54v.05a4.3 4.3 0 003.45 4.22 4.3 4.3 0 01-1.94.07 4.31 4.31 0 004.02 2.99 8.65 8.65 0 01-5.35 1.84A8.7 8.7 0 012 18.6a12.2 12.2 0 0018.98-10.24c0-.19 0-.37-.01-.56a8.72 8.72 0 002.19-2.14z"/></svg>
                </a>
                <a href="#" className="flex size-9 items-center justify-center rounded-lg border border-line bg-surface text-muted transition-colors hover:border-cyan/30 hover:text-cyan">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.04c-5.52 0-10 4.48-10 10 0 4.42 2.87 8.17 6.84 9.5.5.09.68-.22.68-.48 0-.24-.01-.88-.01-1.73-2.78.6-3.37-1.34-3.37-1.34-.45-1.15-1.11-1.46-1.11-1.46-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.35 1.09 2.92.83.09-.65.35-1.09.64-1.34-2.22-.25-4.56-1.11-4.56-4.95 0-1.09.39-1.99 1.03-2.69-.1-.26-.45-1.28.1-2.66 0 0 .84-.27 2.75 1.02.8-.22 1.65-.33 2.5-.34.85.01 1.7.12 2.5.34 1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.66.64.7 1.03 1.6 1.03 2.69 0 3.84-2.34 4.7-4.57 4.95.36.31.68.92.68 1.86 0 1.34-.01 2.42-.01 2.75 0 .27.18.58.69.48 3.97-1.33 6.84-5.08 6.84-9.5 0-5.52-4.48-10-10-10z"/></svg>
                </a>
              </div>
            </div>

            <div>
              <h4 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-ink">Product</h4>
              <ul className="mt-4 space-y-2.5">
                <li><a href={`${APP_URL}/sign-up`} className="text-[14px] text-muted transition-colors hover:text-ink">For Students</a></li>
                <li><a href={`${APP_URL}/for-professionals`} className="text-[14px] text-muted transition-colors hover:text-ink">For Professionals</a></li>
                <li><a href={RECRUITER_URL} className="text-[14px] text-muted transition-colors hover:text-ink">For Recruiters</a></li>
                <li><a href={`${APP_URL}/pricing`} className="text-[14px] text-muted transition-colors hover:text-ink">Pricing</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-ink">Company</h4>
              <ul className="mt-4 space-y-2.5">
                <li><a href={`mailto:support@krackit.in`} className="text-[14px] text-muted transition-colors hover:text-ink">Contact</a></li>
                <li><a href={`${APP_URL}/support`} className="text-[14px] text-muted transition-colors hover:text-ink">Support</a></li>
                <li><a href={`${APP_URL}/privacy`} className="text-[14px] text-muted transition-colors hover:text-ink">Privacy Policy</a></li>
                <li><a href={`${APP_URL}/terms`} className="text-[14px] text-muted transition-colors hover:text-ink">Terms of Service</a></li>
              </ul>
            </div>

            <div className="sm:col-span-2 lg:col-span-1">
              <h4 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-ink">Get started</h4>
              <p className="mt-3 text-[14px] leading-relaxed text-muted">
                Create your free account today. No credit card needed.
              </p>
              <a
                href={`${APP_URL}/sign-up`}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-accent-gradient px-5 py-2.5 text-[14px] font-semibold text-on-accent shadow-[0_4px_12px_rgba(254,127,45,0.25)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(254,127,45,0.35)]"
              >
                Start free →
              </a>
            </div>
          </div>

          <div className="mt-14 flex flex-col items-center justify-between gap-3 border-t border-line pt-6 sm:flex-row">
            <p className="text-[12px] text-faint">
              &copy; {new Date().getFullYear()} Quorium Technologies. All rights reserved.
            </p>
            <div className="flex gap-5 text-[12px] text-faint">
              <a href={`${APP_URL}/privacy`} className="transition-colors hover:text-soft">Privacy</a>
              <a href={`${APP_URL}/terms`} className="transition-colors hover:text-soft">Terms</a>
              <a href={`mailto:support@krackit.in`} className="transition-colors hover:text-soft">support@krackit.in</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

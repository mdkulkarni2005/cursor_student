import { SignIn } from "@clerk/nextjs";
import { Logo } from "@/components/logo";
import { BadgeCheckIcon, BarChartIcon, VideoIcon, ChatIcon } from "@/components/icons";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen bg-canvas">
      <div className="flex w-full flex-col justify-center px-6 py-12 sm:px-12 lg:w-1/2">
        <div className="mx-auto w-full max-w-[400px]">
          <div className="mb-8">
            <Logo size={28} suffix="Recruiter" />
          </div>
          <h1 className="font-display text-[28px] font-bold tracking-tight text-ink">Welcome Back</h1>
          <p className="mb-6 mt-1.5 text-[14px] text-muted">Sign in to discover and connect with verified student talent.</p>
          <SignIn fallbackRedirectUrl="/" signUpUrl="/sign-up" />
        </div>
      </div>
      <aside className="relative hidden w-1/2 overflow-hidden bg-[#1a2d3d] p-12 text-on-accent lg:flex lg:flex-col lg:justify-center">
        <div className="pointer-events-none absolute -right-20 -top-24 size-[360px] rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-20 size-[300px] rounded-full bg-white/10 blur-2xl" />
        <div className="relative mx-auto max-w-[420px]">
          <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-widest">Talent Discovery</span>
          <h2 className="mt-5 font-display text-[40px] font-bold leading-[1.1] tracking-tight">
            Find & Hire <span className="italic">Top Student</span> Talent.
          </h2>
          <p className="mt-4 text-[14.5px] leading-relaxed text-white/85">
            Browse verified student profiles, review AI-assessed skill badges, schedule interviews, and hire the best candidates — all in one platform.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
              <BadgeCheckIcon size={20} />
              <p className="mt-2 text-[13.5px] font-semibold">Verified Profiles</p>
              <p className="text-[12px] text-white/75">AI-verified skills & project portfolios.</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
              <VideoIcon size={20} />
              <p className="mt-2 text-[13.5px] font-semibold">Live Interviews</p>
              <p className="text-[12px] text-white/75">Real-time coding & behavioral rounds.</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
              <BarChartIcon size={20} />
              <p className="mt-2 text-[13.5px] font-semibold">Skill Analytics</p>
              <p className="text-[12px] text-white/75">DSA progress & skill breakdowns.</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
              <ChatIcon size={20} />
              <p className="mt-2 text-[13.5px] font-semibold">Direct Messaging</p>
              <p className="text-[12px] text-white/75">Chat with candidates instantly.</p>
            </div>
          </div>
          <p className="mt-8 border-l-2 border-white/40 pl-4 text-[13.5px] italic text-white/85">
            &ldquo;Krackit helped us find internship talent with verified DSA skills — screened in days, not weeks.&rdquo;
          </p>
        </div>
      </aside>
    </main>
  );
}

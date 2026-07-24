import { SlidesIcon, MicIcon, PencilIcon, LayersIcon } from "@/components/icons";

/** Marketing panel shown beside the auth form (hidden on mobile). */
export function AuthAside() {
  return (
    <aside className="relative hidden w-1/2 overflow-hidden bg-[#1a2d3d] p-12 text-on-accent lg:flex lg:flex-col lg:justify-center">
      <div className="pointer-events-none absolute -right-20 -top-24 size-[360px] rounded-full bg-white/[0.06] blur-2xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-20 size-[300px] rounded-full bg-white/[0.06] blur-2xl" />
      <div className="relative mx-auto max-w-[420px]">
        <span className="inline-block rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest">Next-Gen Learning</span>
        <h2 className="mt-5 font-display text-[40px] font-bold leading-[1.1] tracking-tight">
          The Future of <span className="italic">Academic</span> Intelligence.
        </h2>
        <p className="mt-4 text-[14.5px] leading-relaxed text-white/80">
          Join thousands of students who use krackit to automate their workflow, build resumes, and crack
          high-stakes interviews with AI-driven prep.
        </p>
        <div className="mt-8 grid grid-cols-2 gap-4">
          <div className="rounded-2xl bg-white/[0.07] p-4">
            <SlidesIcon size={20} />
            <p className="mt-2 text-[13.5px] font-semibold">Reports & PPT</p>
            <p className="text-[12px] text-white/70">Auto-generated reports and slide decks.</p>
          </div>
          <div className="rounded-2xl bg-white/[0.07] p-4">
            <MicIcon size={20} />
            <p className="mt-2 text-[13.5px] font-semibold">Interview Prep</p>
            <p className="text-[12px] text-white/70">Real-time mock interviews with feedback.</p>
          </div>
          <div className="rounded-2xl bg-white/[0.07] p-4">
            <PencilIcon size={20} />
            <p className="mt-2 text-[13.5px] font-semibold">Assignments</p>
            <p className="text-[12px] text-white/70">Snap-and-solve with AI assistance.</p>
          </div>
          <div className="rounded-2xl bg-white/[0.07] p-4">
            <LayersIcon size={20} />
            <p className="mt-2 text-[13.5px] font-semibold">Lab Reports</p>
            <p className="text-[12px] text-white/70">Raw readings to formatted reports.</p>
          </div>
        </div>
        <p className="mt-8 border-l-2 border-white/30 pl-4 text-[13.5px] italic text-white/80">
          &ldquo;Krackit transformed how I approach my thesis.&rdquo;
        </p>
      </div>
    </aside>
  );
}

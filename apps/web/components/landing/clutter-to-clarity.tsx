import { Reveal } from "@/components/reveal";
import { PencilIcon, SlidesIcon, CodeIcon, MicIcon, ResumeIcon, ChatIcon } from "@/components/icons";

/**
 * The hero centerpiece: the same six things every engineering student juggles,
 * shown twice — scattered and dim on the left, aligned and lit up on the right —
 * so the "one platform" pitch is something you see, not just read.
 */
const ITEMS = [
  { label: "Assignments", Icon: PencilIcon, rotate: "-rotate-6", mt: "" },
  { label: "PPTs & reports", Icon: SlidesIcon, rotate: "rotate-3", mt: "sm:mt-4" },
  { label: "DSA practice", Icon: CodeIcon, rotate: "-rotate-3", mt: "" },
  { label: "Mock interviews", Icon: MicIcon, rotate: "rotate-6", mt: "sm:mt-3" },
  { label: "Resume", Icon: ResumeIcon, rotate: "-rotate-2", mt: "" },
  { label: "DMs & offers", Icon: ChatIcon, rotate: "rotate-4", mt: "sm:mt-2" },
];

export function ClutterToClarityVisual() {
  return (
    <div className="grid grid-cols-1 items-center gap-3 md:grid-cols-[1fr_auto_1fr] md:gap-6 lg:gap-10">
      {/* CLUTTER — same items, scattered, dim, restless. Dropped on phones: the messy half is
          the setup for the joke, not the payoff — on a small screen the clean list alone still
          lands the pitch without a long scroll through six jittery cards first. */}
      <div className="hidden flex-wrap items-start justify-center gap-3 px-2 py-4 sm:flex sm:justify-start">
        {ITEMS.map(({ label, Icon, rotate, mt }, i) => (
          <div
            key={label}
            className={`animate-float-drift flex items-center gap-2 rounded-xl border border-line bg-card/70 px-3 py-2 opacity-70 shadow-sm saturate-[.6] ${rotate} ${mt}`}
            style={{ animationDelay: `${i * 0.6}s`, animationDuration: `${9 + i}s` }}
          >
            <Icon size={15} className="text-faint" />
            <span className="text-[12px] font-medium text-muted">{label}</span>
          </div>
        ))}
      </div>

      {/* DIVIDER */}
      <div className="flex items-center justify-center gap-2 md:flex-col md:gap-3">
        <span className="animate-dash-grow hidden h-14 w-px origin-top bg-gradient-to-b from-transparent via-line-strong to-line-strong md:block" />
        <span className="animate-fade-in-up stagger-3 whitespace-nowrap rounded-full border border-line bg-card px-3.5 py-1.5 text-[11px] font-semibold tracking-wide text-muted">
          clutter <span className="text-accent-gradient mx-1">→</span> clarity
        </span>
        <span className="animate-dash-grow stagger-2 hidden h-14 w-px origin-bottom bg-gradient-to-b from-line-strong via-line-strong to-transparent md:block" />
      </div>

      {/* CLARITY — same items, aligned, lit up, calm */}
      <div className="flex flex-col gap-2.5 px-2 py-4">
        {ITEMS.map(({ label, Icon }, i) => (
          <Reveal key={label} delay={i * 90}>
            <div className="flex items-center gap-3 rounded-xl border border-line border-l-2 border-l-cyan/60 bg-card px-3.5 py-2.5 shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent-gradient text-on-accent">
                <Icon size={14} />
              </span>
              <span className="text-[13px] font-semibold text-ink">{label}</span>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  );
}

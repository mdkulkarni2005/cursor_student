/**
 * Static, faithful recreation of the real student profile screen (see
 * app/students/[id]/page.tsx) for marketing use — same layout conventions and color tokens as
 * the live product, illustrative content only.
 */

function BrowserFrame({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line-strong bg-base shadow-[0_24px_70px_rgba(15,23,42,0.16)]">
      <div className="flex items-center gap-2 border-b border-line bg-surface/70 px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-danger/70" />
        <span className="size-2.5 rounded-full bg-warning/70" />
        <span className="size-2.5 rounded-full bg-success/70" />
        <span className="ml-3 truncate rounded-md bg-canvas px-2.5 py-1 text-[11px] text-faint">
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

const STATS = [
  { value: "142", label: "DSA SOLVED", color: "text-teal" },
  { value: "4.6", label: "INTERVIEW SCORE", color: "text-indigo" },
  { value: "91%", label: "PROFILE SCORE", color: "text-cyan" },
  { value: "6", label: "VERIFIED PROJECTS", color: "text-warning" },
];

const SKILLS = ["React", "Node.js", "PostgreSQL", "System Design", "Python"];

export function RecruiterProfileMockup() {
  return (
    <BrowserFrame title="recruiter.krackit.in/students/ananya-r">
      <div className="bg-surface/40 p-5 sm:p-6">
        <div className="rounded-2xl border border-line bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3.5">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-cyan/12 text-[20px] font-bold text-cyan">
                AR
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-[16px] font-bold text-ink">Ananya Rao</p>
                  <span className="rounded-full bg-success/10 px-2 py-0.5 text-[9.5px] font-semibold text-success">
                    ✓ Verified
                  </span>
                </div>
                <p className="mt-0.5 text-[12px] text-muted">
                  Backend Engineer · NIT Trichy, CSE · Sem 7
                </p>
              </div>
            </div>
            <span className="shrink-0 rounded-lg bg-cyan px-3 py-1.5 text-[11.5px] font-semibold text-on-accent">
              Message
            </span>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-3 border-t border-line pt-4">
            {STATS.map((s) => (
              <div key={s.label}>
                <p className={`text-[17px] font-bold ${s.color}`}>{s.value}</p>
                <p className="mt-0.5 text-[8.5px] font-semibold uppercase tracking-wide text-faint">
                  {s.label}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-1.5 border-t border-line pt-4">
            {SKILLS.map((s) => (
              <span key={s} className="rounded-full bg-cyan/10 px-2.5 py-1 text-[10.5px] font-medium text-cyan">
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

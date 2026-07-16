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

const LEADERBOARD = [
  { name: "Ananya Rao", dept: "CSE · NIT Trichy", solved: 142, pct: 94 },
  { name: "Rohit Verma", dept: "IT · VJTI", solved: 118, pct: 82 },
  { name: "Priya Nair", dept: "CSE · IIIT-B", solved: 96, pct: 71 },
];

/** Feature-block mockup for "Verified DSA scores" — a compact scoreboard, not a literal brain
 *  icon: shows the thing recruiters actually care about (solved counts, relative standing). */
export function DsaScoreboardMockup() {
  return (
    <BrowserFrame title="recruiter.krackit.in/students?sort=dsa">
      <div className="bg-surface/40 p-5 sm:p-6">
        <div className="rounded-2xl border border-line bg-card p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wide text-faint">DSA solved, this batch</p>
            <span className="rounded-full bg-teal/10 px-2 py-0.5 text-[9.5px] font-semibold text-teal">Live</span>
          </div>
          <div className="space-y-3">
            {LEADERBOARD.map((s) => (
              <div key={s.name}>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="font-semibold text-ink">{s.name}</span>
                  <span className="font-mono text-[11px] text-muted">{s.solved} solved</span>
                </div>
                <p className="text-[10.5px] text-faint">{s.dept}</p>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface">
                  <div className="h-full rounded-full bg-gradient-to-r from-cyan to-teal" style={{ width: `${s.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

/** Feature-block mockup for "Live interview rooms" — split code editor + candidate feed, the
 *  actual product surface (real interview rooms), not a generic camera icon. */
export function LiveInterviewRoomMockup() {
  return (
    <BrowserFrame title="recruiter.krackit.in/interviews/live/8f2c">
      <div className="grid grid-cols-5">
        <div className="col-span-3 bg-[#1e1e2e] p-4 font-mono text-[10px] leading-relaxed text-[#cdd6f4]">
          <p><span className="text-[#89b4fa]">function</span> <span className="text-[#a6e3a1]">mergeSort</span>(arr) {"{"}</p>
          <p className="pl-3"><span className="text-[#89b4fa]">if</span> (arr.length &lt;= 1) <span className="text-[#89b4fa]">return</span> arr;</p>
          <p className="pl-3">const mid = arr.length &gt;&gt; 1;</p>
          <p className="pl-3 text-[#f9e2af]">// candidate is typing…</p>
          <p className="pl-3 animate-pulse">|</p>
        </div>
        <div className="relative col-span-2 flex flex-col justify-between bg-gradient-to-br from-[#11203a] to-[#0c1224] p-3">
          <div className="flex items-center gap-1.5 self-start rounded-full bg-danger/90 px-2 py-0.5 text-[9px] font-bold text-white">
            <span className="size-1.5 animate-pulse-ring rounded-full bg-white" />
            LIVE
          </div>
          <div className="flex flex-col items-center gap-1.5 text-center">
            <span className="flex size-10 items-center justify-center rounded-full bg-cyan/20 text-[13px] font-bold text-cyan">RV</span>
            <p className="text-[9.5px] text-white/70">Rohit V.</p>
          </div>
          <div className="rounded-md bg-black/40 px-2 py-1.5 text-[9px] text-white/80">
            AI suggests: ask about time complexity
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

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

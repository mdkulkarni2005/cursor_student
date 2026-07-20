/**
 * Static, faithful recreations of real in-app screens for marketing use — same CSS classes,
 * colors, and layout conventions as the actual product (report-doc numbering, voice-ring pulse,
 * code editor palette) rather than generic stock icons. Content is illustrative, not live data.
 */

function BrowserFrame({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-line-strong bg-base shadow-[0_24px_70px_rgba(15,23,42,0.16)] ${className}`}
    >
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

export function ReportMockup() {
  return (
    <BrowserFrame title="app.krackit.in/reports/mini-project-report">
      <div className="report-doc bg-surface/50 p-5 sm:p-7">
        <div className="mx-auto max-w-[420px] rounded-md bg-white p-5 shadow-[0_10px_40px_rgba(15,23,42,0.14)] sm:p-7">
          {/* `!` overrides here are load-bearing — .report-doc's h1/h2/p rules (globals.css,
              built for the real full-size document editor) outrank these Tailwind utilities on
              specificity alone, so without `!` this "miniature" mockup silently renders at real
              editor scale (26px h1, 1.75rem heading margins…), badly inflating this section's
              height — the mobile gap bug traced back to exactly this collision. */}
          <p className="text-[9px]! font-semibold uppercase tracking-[0.14em] text-faint">
            Department of Computer Science
          </p>
          <h1 className="mt-2! mb-2! text-[17px]! leading-snug!">Smart Attendance System Using Facial Recognition</h1>
          <h2 className="mt-3! mb-1! text-[12px]!">Introduction</h2>
          <p className="my-1! text-[10.5px]! leading-snug!">
            Manual attendance tracking in academic institutions is time-consuming and prone to
            proxy attendance. This report presents a facial-recognition-based system that...
          </p>
          <h2 className="mt-3! mb-1! text-[12px]!">Literature Survey</h2>
          <p className="my-1! text-[10.5px]! leading-snug!">
            Prior work in biometric attendance falls into two categories: fingerprint-based and
            vision-based systems. Vision-based approaches offer contactless...
          </p>
          <div className="mt-3 h-1.5 w-2/3 rounded-full bg-cyan/15" />
          <div className="mt-1.5 h-1.5 w-1/2 rounded-full bg-cyan/10" />
        </div>
      </div>
    </BrowserFrame>
  );
}

export function InterviewMockup() {
  return (
    <BrowserFrame title="app.krackit.in/interview/session">
      <div className="relative flex h-[280px] flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[#11203a] to-[#0c1224] px-5">
        <div className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-danger/90 px-2.5 py-1 text-[10px] font-bold text-white">
          <span className="size-1.5 animate-pulse-ring rounded-full bg-white" />
          REC
        </div>
        <div className="relative flex size-24 items-center justify-center rounded-full bg-accent-gradient text-[13px] font-bold text-on-accent shadow-[0_0_40px_rgba(254,127,45,0.4)]">
          AI
          <span className="voice-ring absolute inset-0 rounded-full border-2 border-cyan/60" />
          <span
            className="voice-ring absolute inset-0 rounded-full border-2 border-indigo/50"
            style={{ animationDelay: "0.6s" }}
          />
          <span
            className="voice-ring absolute inset-0 rounded-full border-2 border-cyan/40"
            style={{ animationDelay: "1.2s" }}
          />
        </div>
        <p className="mt-4 text-[12px] font-medium text-white/70">Interviewer is speaking…</p>
        <div className="absolute bottom-4 left-4 right-4 rounded-lg bg-black/55 px-3.5 py-2.5 text-left text-[11px] leading-relaxed text-white/90 backdrop-blur">
          &ldquo;Can you walk me through how you&apos;d optimize this query if the table had ten
          million rows?&rdquo;
        </div>
        <div className="absolute bottom-4 right-4 flex size-11 items-center justify-center rounded-lg border-2 border-white/20 bg-black/60 text-[16px]">
          🧑
        </div>
      </div>
    </BrowserFrame>
  );
}

export function DsaMockup() {
  return (
    <BrowserFrame title="app.krackit.in/dsa/two-sum">
      <div className="grid grid-cols-1 gap-px bg-line sm:grid-cols-2">
        <div className="bg-base p-4">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-teal/10 px-2 py-0.5 text-[9.5px] font-semibold text-teal">
              Arrays
            </span>
            <span className="rounded-full bg-success/10 px-2 py-0.5 text-[9.5px] font-semibold text-success">
              Easy
            </span>
          </div>
          <p className="mt-2.5 text-[11px] font-semibold text-ink">Two Sum</p>
          <p className="mt-1 text-[10.5px] leading-relaxed text-muted">
            Given an array of integers <code className="font-mono text-[10px] text-cyan">nums</code>{" "}
            and an integer <code className="font-mono text-[10px] text-cyan">target</code>, return
            indices of the two numbers that add up to target.
          </p>
          <div className="mt-3 rounded-md border border-line bg-surface px-2.5 py-2 font-mono text-[10px] text-soft">
            Input: nums = [2,7,11,15], target = 9<br />
            Output: [0,1]
          </div>
        </div>
        <div className="bg-[#1e1e2e] p-4 font-mono text-[10.5px] leading-relaxed text-[#cdd6f4]">
          <p><span className="text-[#89b4fa]">function</span> <span className="text-[#a6e3a1]">solve</span>(nums, target) {"{"}</p>
          <p className="pl-3 text-[#f9e2af]">const seen = new Map();</p>
          <p className="pl-3"><span className="text-[#89b4fa]">for</span> (let i = 0; i &lt; nums.length; i++) {"{"}</p>
          <p className="pl-6">const need = target - nums[i];</p>
          <p className="pl-6"><span className="text-[#89b4fa]">if</span> (seen.has(need)) <span className="text-[#89b4fa]">return</span> [seen.get(need), i];</p>
          <p className="pl-3">{"}"}</p>
          <p>{"}"}</p>
          <div className="mt-3 flex items-center gap-2 rounded-md border border-success/30 bg-success/10 px-2.5 py-1.5">
            <span className="flex size-4 items-center justify-center rounded-sm bg-success text-[9px] font-bold text-white">✓</span>
            <span className="text-[10px] font-semibold text-success">14/14 test cases passed</span>
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

import Link from "next/link";
import { Sparkle } from "@/components/icons";

/** Public, auth-free shell for the Privacy and Terms pages. */
export function LegalShell({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-[760px] items-center justify-between px-5 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex size-[28px] items-center justify-center rounded-lg bg-accent-gradient shadow-[0_0_16px_rgba(246,146,30,0.4)]">
              <Sparkle size={15} className="text-on-accent" />
            </span>
            <span className="font-display text-[16px] font-bold text-ink">Vidyas OS</span>
          </Link>
          <div className="flex gap-4 text-[12.5px] text-muted">
            <Link href="/privacy" className="hover:text-soft">Privacy</Link>
            <Link href="/terms" className="hover:text-soft">Terms</Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[760px] px-5 py-10">
        <h1 className="font-display text-[26px] font-bold text-ink">{title}</h1>
        <p className="mt-1 text-[12.5px] text-faint">Last updated {updated}</p>
        <div className="mt-3 rounded-xl border border-warning/25 bg-warning/[0.06] p-3 text-[12px] text-warning">
          This is a plain-language starting template, not legal advice. Have it reviewed by a lawyer before launch.
        </div>
        <div className="legal mt-6 space-y-5 text-[13.5px] leading-relaxed text-soft">{children}</div>
        <Link href="/" className="mt-8 inline-block text-[13px] font-semibold text-cyan hover:underline">← Back</Link>
      </main>
    </div>
  );
}

export function LegalSection({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-1.5 font-display text-[15px] font-semibold text-ink">{heading}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

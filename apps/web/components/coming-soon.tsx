import Link from "next/link";
import { Sparkle } from "@/components/icons";

/**
 * Honest placeholder for features that are intentionally deferred to a later version
 * (see docs/DEFERRED.md). Keeps the nav/links unbroken without faking functionality.
 */
export function ComingSoon({
  title,
  description,
  bullets,
}: {
  title: string;
  description: string;
  bullets?: string[];
}) {
  return (
    <div className="mx-auto max-w-[560px] pt-6">
      <div className="rounded-2xl border border-line bg-card p-8 text-center sm:p-10">
        <span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-accent-gradient shadow-[0_0_20px_rgba(34,211,238,0.35)]">
          <Sparkle size={22} className="text-on-accent" />
        </span>
        <span className="mb-3 inline-block rounded-full border border-cyan/25 bg-cyan/10 px-3 py-1 text-[11.5px] font-semibold tracking-wide text-cyan">
          Coming soon
        </span>
        <h1 className="font-display text-[21px] font-bold text-ink">{title}</h1>
        <p className="mx-auto mt-2 max-w-[420px] text-[14px] leading-relaxed text-muted">{description}</p>

        {bullets?.length ? (
          <ul className="mx-auto mt-5 flex max-w-[360px] flex-col gap-2.5 text-left">
            {bullets.map((b) => (
              <li key={b} className="flex items-start gap-2.5 text-[13px] text-soft">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-cyan" />
                {b}
              </li>
            ))}
          </ul>
        ) : null}

        <Link
          href="/dashboard"
          className="mt-7 inline-block rounded-xl border border-line-strong bg-white/5 px-5 py-2.5 text-[13.5px] font-semibold text-soft transition-colors hover:bg-white/10"
        >
          ← Back to home
        </Link>
      </div>
    </div>
  );
}

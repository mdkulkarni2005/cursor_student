import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { requireOnboardedUser, shellUserFrom } from "@/lib/user";
import { StarIcon } from "@/components/icons";

export const metadata = { title: "Plans — Vidyas OS" };

const TIERS = [
  {
    id: "FREE",
    name: "Free",
    price: 0,
    tagline: "Get started with the essentials.",
    features: ["50 AI Credits / month", "A few reports, PPTs & assignments", "DSA practice & streaks", "Community support"],
    cta: "Current plan",
    href: null as string | null,
    highlight: false,
  },
  {
    id: "PRO",
    name: "Pro",
    price: 499,
    tagline: "For students who ship every week.",
    features: ["500 AI Credits / month", "Unlimited reports, PPTs & assignments", "Priority generation queue", "Full interview & DSA suite"],
    cta: "Upgrade to Pro",
    href: "/plans/checkout?plan=pro" as string | null,
    highlight: true,
  },
  {
    id: "PREMIUM",
    name: "Premium",
    price: 999,
    tagline: "Everything, unlimited.",
    features: ["Unlimited AI Credits", "Everything in Pro", "1:1 mentor reviews", "Early access to new modules"],
    cta: "Go Premium",
    href: "/plans/checkout?plan=premium" as string | null,
    highlight: false,
  },
];

const COMPARE: { label: string; free: string; pro: string; premium: string }[] = [
  { label: "Monthly AI Credits", free: "50", pro: "500", premium: "Unlimited" },
  { label: "Reports, PPTs & Assignments", free: "Limited", pro: "Unlimited", premium: "Unlimited" },
  { label: "Interview & DSA suite", free: "Basic", pro: "Full", premium: "Full" },
  { label: "Generation priority", free: "Standard", pro: "Priority", premium: "Priority" },
  { label: "Mentor reviews", free: "—", pro: "—", premium: "1:1" },
];

export default async function PlansPage() {
  const user = await requireOnboardedUser();
  const current = user.plan;

  return (
    <AppShell user={await shellUserFrom(user)}>
      <div className="mx-auto max-w-[1080px]">
        <header className="mb-10 text-center">
          <h1 className="font-display text-[32px] font-bold tracking-tight text-ink">Elevate Your Academic Intelligence</h1>
          <p className="mx-auto mt-2 max-w-2xl text-[15px] text-muted">
            Choose the plan that fits your study needs. Unlock powerful AI features, unlimited projects, and advanced
            research tools.
          </p>
        </header>

        {/* Tier cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {TIERS.map((t) => {
            const isCurrent = current === t.id;
            return (
              <div
                key={t.id}
                className={`relative flex flex-col rounded-3xl border p-7 ${
                  t.highlight
                    ? "border-cyan bg-gradient-to-br from-cyan/8 to-indigo/8 shadow-[0_18px_40px_rgba(246,146,30,0.12)]"
                    : "border-line bg-card"
                }`}
              >
                {t.highlight && !isCurrent && (
                  <span className="absolute right-4 top-4 rounded-full bg-cyan px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-on-accent">
                    Most Popular
                  </span>
                )}
                {isCurrent && (
                  <span className="absolute right-4 top-4 rounded-full bg-teal/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-teal">
                    Current Plan
                  </span>
                )}
                <h3 className="font-display text-[20px] font-bold text-ink">{t.name}</h3>
                <p className="mt-1 text-[13px] text-muted">{t.tagline}</p>
                <div className="mt-5 flex items-end gap-1">
                  <span className="font-display text-[36px] font-bold text-ink">₹{t.price}</span>
                  <span className="mb-1.5 text-[13px] text-muted">/month</span>
                </div>
                {t.href && !isCurrent ? (
                  <Link
                    href={t.href}
                    className={`mt-6 rounded-xl py-3 text-center text-[14px] font-semibold transition-transform active:scale-95 ${
                      t.highlight ? "bg-cyan text-on-accent" : "border border-cyan/30 bg-cyan/5 text-cyan hover:bg-cyan/10"
                    }`}
                  >
                    {t.cta}
                  </Link>
                ) : (
                  <span className="mt-6 cursor-default rounded-xl border border-line bg-surface py-3 text-center text-[14px] font-semibold text-muted">
                    {isCurrent ? "Current plan" : t.cta}
                  </span>
                )}
                <ul className="mt-6 space-y-3 border-t border-line pt-6">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-[13.5px] text-soft">
                      <StarIcon size={15} className={`mt-0.5 shrink-0 ${t.highlight ? "text-cyan" : "text-teal"}`} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Compare table */}
        <div className="mt-12">
          <h2 className="mb-6 text-center font-display text-[22px] font-bold text-ink">Compare Features</h2>
          <div className="overflow-hidden rounded-2xl border border-line bg-card">
            <table className="w-full text-[13.5px]">
              <thead className="border-b border-line bg-surface/50">
                <tr>
                  <th className="p-5 text-left font-semibold text-ink">Features</th>
                  <th className="p-5 text-center font-semibold text-muted">Free</th>
                  <th className="p-5 text-center font-semibold text-cyan">Pro</th>
                  <th className="p-5 text-center font-semibold text-ink">Premium</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {COMPARE.map((r) => (
                  <tr key={r.label}>
                    <td className="p-5 font-medium text-ink">{r.label}</td>
                    <td className="p-5 text-center text-muted">{r.free}</td>
                    <td className="p-5 text-center font-semibold text-ink">{r.pro}</td>
                    <td className="p-5 text-center font-semibold text-ink">{r.premium}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

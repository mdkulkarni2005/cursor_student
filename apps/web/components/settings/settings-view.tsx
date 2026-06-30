"use client";

import { useState } from "react";
import Link from "next/link";
import { useClerk } from "@clerk/nextjs";
import { StarIcon, GearIcon } from "@/components/icons";

type Tab = "profile" | "billing" | "account";

export type SettingsData = {
  name: string;
  email: string;
  department: string | null;
  semester: string | null;
  careerGoal: string | null;
  plan: string;
  /** Plan allowance (FREE=limited number/month, paid=null=unlimited). Usage metering not yet tracked. */
  creditsLimit: number | null;
};

const TABS: { id: Tab; label: string }[] = [
  { id: "profile", label: "Profile" },
  { id: "billing", label: "Plan & Billing" },
  { id: "account", label: "Account" },
];

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-2">
      <label className="text-[13px] font-medium text-muted">{label}</label>
      <input
        defaultValue={value}
        readOnly
        className="w-full rounded-lg border border-line bg-surface px-4 py-2.5 text-[14px] text-ink outline-none focus:ring-2 focus:ring-cyan/20"
      />
    </div>
  );
}

export function SettingsView({ data }: { data: SettingsData }) {
  const [tab, setTab] = useState<Tab>("profile");
  const { openUserProfile } = useClerk();
  const initials = data.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex flex-col gap-10 lg:flex-row">
      {/* Inner nav */}
      <nav className="flex shrink-0 gap-1 overflow-x-auto lg:w-48 lg:flex-col">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`whitespace-nowrap rounded-lg px-4 py-2.5 text-left text-[13.5px] font-medium transition-all ${
              tab === t.id ? "bg-cyan/8 font-bold text-cyan" : "text-muted hover:bg-surface"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <section className="flex-1 space-y-8 pb-10">
        {tab === "profile" && (
          <div className="rounded-2xl border border-line bg-card p-8">
            <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
              <div className="flex items-center gap-6">
                <span className="flex size-24 items-center justify-center rounded-full bg-cyan/12 font-display text-[28px] font-bold text-cyan">
                  {initials}
                </span>
                <div>
                  <h3 className="font-display text-[22px] font-semibold text-ink">{data.name}</h3>
                  <p className="text-[14px] text-muted">{data.email}</p>
                  <div className="mt-3 flex gap-2">
                    <span className="rounded-full bg-cyan/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-cyan">
                      Undergraduate
                    </span>
                    <span className="rounded-full bg-teal/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-teal">
                      {data.plan} Tier
                    </span>
                  </div>
                </div>
              </div>
              <Link
                href="/onboarding"
                className="rounded-lg bg-cyan px-5 py-2 text-[13.5px] font-semibold text-on-accent transition-transform active:scale-95"
              >
                Edit Profile
              </Link>
            </div>
            <div className="mt-10 grid grid-cols-1 gap-8 border-t border-line pt-8 md:grid-cols-2">
              <Field label="Full Name" value={data.name} />
              <Field label="Email" value={data.email} />
              <Field label="Department" value={data.department ?? "—"} />
              <Field label="Semester" value={data.semester ? `Semester ${data.semester}` : "—"} />
              <Field label="Career Goal" value={data.careerGoal ?? "—"} />
            </div>
          </div>
        )}

        {tab === "billing" && (
          <div className="overflow-hidden rounded-2xl border border-line bg-card">
            <div className="border-b border-line bg-surface/40 p-8">
              <h4 className="font-display text-[18px] font-semibold text-ink">Plan &amp; Billing</h4>
              <p className="mt-1 text-[13.5px] text-muted">Manage your subscription and monitor AI usage.</p>
            </div>
            <div className="space-y-8 p-8">
              <div className="flex items-center justify-between rounded-xl bg-cyan/10 p-6">
                <div className="flex items-center gap-5">
                  <span className="flex size-12 items-center justify-center rounded-lg bg-cyan/20 text-cyan">
                    <StarIcon size={26} />
                  </span>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Current Plan</p>
                    <p className="font-display text-[20px] font-semibold text-ink">Vidyas {data.plan}</p>
                  </div>
                </div>
                <Link
                  href="/plans"
                  className="rounded-lg bg-cyan px-4 py-2 text-[13px] font-semibold text-on-accent"
                >
                  Change Plan
                </Link>
              </div>
              <div className="rounded-xl border border-line bg-surface p-5">
                <p className="text-[12px] font-bold uppercase tracking-widest text-muted">Monthly Allowance</p>
                <p className="mt-1 text-[13.5px] text-soft">
                  {data.creditsLimit === null
                    ? "Unlimited reports, PPTs, assignments and prep on your plan."
                    : `Your ${data.plan} plan includes a generous monthly allowance for reports, PPTs and assignments. Upgrade for unlimited.`}
                </p>
                <Link href="/plans" className="mt-3 inline-block text-[13px] font-semibold text-cyan hover:underline">Compare plans →</Link>
              </div>
            </div>
          </div>
        )}

        {tab === "account" && (
          <div className="space-y-4 rounded-2xl border border-line bg-card p-8">
            <div>
              <h4 className="font-display text-[18px] font-semibold text-ink">Account &amp; Security</h4>
              <p className="mt-1 text-[13.5px] text-muted">
                Your password, two-factor authentication, connected logins and active sessions are managed securely in your account portal.
              </p>
            </div>
            <button
              type="button"
              onClick={() => openUserProfile()}
              className="flex w-full items-center justify-between rounded-xl border border-line bg-surface p-5 text-left transition-colors hover:border-cyan/40"
            >
              <span className="flex items-center gap-3">
                <GearIcon size={18} className="text-muted" />
                <span className="text-[14px] font-medium text-ink">Manage account &amp; sessions</span>
              </span>
              <span className="text-[13.5px] font-semibold text-cyan">Open →</span>
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

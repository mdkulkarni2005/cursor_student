"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useClerk } from "@clerk/nextjs";
import { StarIcon, GearIcon } from "@/components/icons";
import { useInstallPrompt } from "@/components/install-prompt";
import { updateProfile } from "@/lib/actions/profile-edit";
import { DEPARTMENTS, SEMESTERS } from "@/lib/constants";

type Tab = "profile" | "billing" | "account";

export type SettingsData = {
  name: string;
  email: string;
  department: string | null;
  semester: string | null;
  college: string | null;
  careerGoal: string | null;
  userType: "STUDENT" | "PROFESSIONAL";
  companyName: string | null;
  jobTitle: string | null;
  yearsOfExperience: number | null;
  github: string | null;
  /** Only PROFESSIONAL and coding-track STUDENTs are required to have a GitHub link. */
  codingEnabled: boolean;
  linkedin: string | null;
  gpa: number | null;
  plan: string;
  /** Plan allowance (FREE=limited number/month, paid=null=unlimited). Usage metering not yet tracked. */
  creditsLimit: number | null;
  /** Intelligence Pulse — generations used this period vs total allowance (null limit = unlimited). */
  usage: { used: number; limit: number | null };
};

const TABS: { id: Tab; label: string }[] = [
  { id: "profile", label: "Profile" },
  { id: "billing", label: "Plan & Billing" },
  { id: "account", label: "Account" },
];

const fieldLabel = "text-[13px] font-medium text-muted";
const fieldBox =
  "w-full rounded-lg border border-line bg-surface px-4 py-2.5 text-[14px] text-ink outline-none focus:ring-2 focus:ring-cyan/20";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-2">
      <label className={fieldLabel}>{label}</label>
      <input defaultValue={value} readOnly className={fieldBox} />
    </div>
  );
}

function EditProfileForm({ data }: { data: SettingsData }) {
  const router = useRouter();
  const [name, setName] = useState(data.name);
  const [department, setDepartment] = useState(data.department ?? "");
  const [semester, setSemester] = useState(data.semester ?? "");
  const [college, setCollege] = useState(data.college ?? "");
  const [companyName, setCompanyName] = useState(data.companyName ?? "");
  const [jobTitle, setJobTitle] = useState(data.jobTitle ?? "");
  const [yearsOfExperience, setYearsOfExperience] = useState(
    data.yearsOfExperience != null ? String(data.yearsOfExperience) : "",
  );
  const [careerGoal, setCareerGoal] = useState(data.careerGoal ?? "");
  const [github, setGithub] = useState(data.github ?? "");
  const [linkedin, setLinkedin] = useState(data.linkedin ?? "");
  const [gpa, setGpa] = useState(data.gpa != null ? String(data.gpa) : "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  // Same rule for both roles now — driven purely by the coding-track flag, set at onboarding.
  const githubRequired = data.codingEnabled;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    start(async () => {
      const result = await updateProfile({
        name,
        careerGoal,
        github,
        linkedin,
        gpa: gpa.trim() ? Number(gpa) : null,
        ...(data.userType === "PROFESSIONAL"
          ? { companyName, jobTitle, yearsOfExperience: yearsOfExperience.trim() ? Number(yearsOfExperience) : null }
          : { department, semester, college }),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="mt-10 space-y-8 border-t border-line pt-8">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <div className="space-y-2">
          <label className={fieldLabel}>Full Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={fieldBox} />
        </div>
        <Field label="Email" value={data.email} />

        {data.userType === "PROFESSIONAL" ? (
          <>
            <div className="space-y-2">
              <label className={fieldLabel}>Company</label>
              <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={fieldBox} />
            </div>
            <div className="space-y-2">
              <label className={fieldLabel}>Job Title</label>
              <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} className={fieldBox} />
            </div>
            <div className="space-y-2">
              <label className={fieldLabel}>Years of Experience</label>
              <input
                type="number"
                min={0}
                max={60}
                value={yearsOfExperience}
                onChange={(e) => setYearsOfExperience(e.target.value)}
                className={fieldBox}
              />
            </div>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <label className={fieldLabel}>Department</label>
              <select value={department} onChange={(e) => setDepartment(e.target.value)} className={fieldBox}>
                <option value="" disabled>Select your department…</option>
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className={fieldLabel}>Semester</label>
              <select value={semester} onChange={(e) => setSemester(e.target.value)} className={fieldBox}>
                <option value="" disabled>Select…</option>
                {SEMESTERS.map((s) => <option key={s} value={s}>Semester {s}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className={fieldLabel}>College / University</label>
              <input value={college} onChange={(e) => setCollege(e.target.value)} className={fieldBox} />
            </div>
          </>
        )}

        <div className="space-y-2">
          <label className={fieldLabel}>Career Goal</label>
          <input value={careerGoal} onChange={(e) => setCareerGoal(e.target.value)} className={fieldBox} />
        </div>
        <div className="space-y-2">
          <label className={fieldLabel}>
            GitHub{githubRequired ? "" : <span className="font-normal text-faint"> (optional)</span>}
          </label>
          <input
            value={github}
            onChange={(e) => setGithub(e.target.value)}
            required={githubRequired}
            placeholder="github.com/yourname"
            className={fieldBox}
          />
          {!githubRequired ? <p className="text-[11.5px] text-faint">Only needed for the coding track.</p> : null}
        </div>
        <div className="space-y-2">
          <label className={fieldLabel}>LinkedIn</label>
          <input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="linkedin.com/in/yourname" className={fieldBox} />
        </div>
        <div className="space-y-2">
          <label className={fieldLabel}>GPA / CGPA <span className="font-normal text-faint">(optional, out of 10)</span></label>
          <input type="number" min={0} max={10} step="0.01" value={gpa} onChange={(e) => setGpa(e.target.value)} className={fieldBox} />
        </div>
      </div>

      {error ? <p className="rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-[12.5px] text-danger">{error}</p> : null}
      {saved ? <p className="text-[12.5px] text-teal">Saved.</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-cyan px-5 py-2 text-[13.5px] font-semibold text-on-accent transition-transform active:scale-95 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}

export function SettingsView({ data }: { data: SettingsData }) {
  const [tab, setTab] = useState<Tab>("profile");
  const { openUserProfile } = useClerk();
  const { available: installAvailable, promptInstall } = useInstallPrompt();
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
            </div>
            <EditProfileForm data={data} />
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
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[12px] font-bold uppercase tracking-widest text-muted">Intelligence Pulse</p>
                    <p className="mt-0.5 text-[13px] text-soft">Generations used this period</p>
                  </div>
                  <span className="font-display text-[15px] font-semibold text-ink">
                    {data.usage.used} / {data.usage.limit === null ? "∞" : data.usage.limit}
                  </span>
                </div>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-card">
                  <div
                    className="h-full rounded-full bg-cyan"
                    style={{ width: `${data.usage.limit ? Math.min(100, Math.round((data.usage.used / data.usage.limit) * 100)) : 8}%` }}
                  />
                </div>
                <p className="mt-3 text-[13px] text-soft">
                  {data.usage.limit === null
                    ? "Unlimited reports, PPTs, assignments and prep on your plan."
                    : `Your ${data.plan} plan includes a generous monthly allowance for reports, PPTs and assignments. Limits reset on the 1st.`}
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
            {installAvailable && (
              <button
                type="button"
                onClick={() => void promptInstall()}
                className="flex w-full items-center justify-between rounded-xl border border-line bg-surface p-5 text-left transition-colors hover:border-cyan/40"
              >
                <span className="flex items-center gap-3">
                  <StarIcon size={18} className="text-muted" />
                  <span className="text-[14px] font-medium text-ink">Install app</span>
                </span>
                <span className="text-[13.5px] font-semibold text-cyan">Install →</span>
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useActionState } from "react";
import { completeOnboarding, type OnboardingState } from "@/lib/actions/onboarding";
import { DEPARTMENTS, SEMESTERS } from "@/lib/constants";
import { CODING_DEPARTMENTS } from "@/lib/capabilities";
import { Sparkle } from "@/components/icons";

// Target roles for career-goal mapping (mockup: "What's your vision?").
const CAREER_GOALS = [
  "Software Engineer",
  "Data Scientist",
  "Product Manager",
  "ML / AI Engineer",
  "Core Engineering (Mech/Civil/Elec)",
  "Higher Studies / Research",
  "Entrepreneurship",
  "Undecided",
] as const;

const CAREER_INSIGHT: Record<string, string> = {
  "Software Engineer": "Strong DSA + system design skills see a 40% higher placement rate at top product companies.",
  "Data Scientist": "Pairing statistics with a portfolio of real projects is the #1 differentiator recruiters look for.",
  "Product Manager": "A public profile showing shipped projects beats a generic resume for PM internships.",
  "ML / AI Engineer": "Reproducible notebooks + a deployed demo convert far better than coursework alone.",
  "Higher Studies / Research": "Early research involvement and a strong SOP matter more than raw GPA for admits.",
  "Entrepreneurship": "Building and shipping anything end-to-end is the strongest signal of founder potential.",
};

const fieldLabel = "mb-1.5 block text-[12.5px] font-semibold text-muted";
const fieldBox =
  "w-full rounded-xl border border-line-strong bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none transition-colors focus:border-cyan/50";

export function OnboardingForm({ firstName }: { firstName: string | null }) {
  const [state, action, pending] = useActionState<OnboardingState, FormData>(completeOnboarding, {});

  const [dept, setDept] = useState("");
  const [coding, setCoding] = useState(false);
  const [codingTouched, setCodingTouched] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [goal, setGoal] = useState("");

  function onDept(value: string) {
    setDept(value);
    // Seed the coding-track default from the branch — until the user sets it themselves.
    if (!codingTouched) setCoding(CODING_DEPARTMENTS.includes(value));
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4 py-12">
      <div className="w-full max-w-[440px]">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-accent-gradient shadow-[0_0_18px_rgba(79,70,229,0.4)]">
            <Sparkle size={18} className="text-on-accent" />
          </span>
          <span className="font-display text-lg font-bold text-ink">Vidyas OS</span>
        </div>

        <h1 className="font-display text-[24px] font-bold leading-tight text-ink">
          {firstName ? `Welcome, ${firstName}.` : "Welcome."}
        </h1>
        <p className="mb-6 mt-1.5 text-[14px] text-muted">
          Tell us your academic context so every assignment, report and PPT comes out in the right
          format for your branch and college.
        </p>

        <form action={action} className="rounded-2xl border border-line bg-card p-5">
          <div className="mb-4">
            <label htmlFor="department" className={fieldLabel}>Department</label>
            <select id="department" name="department" value={dept} onChange={(e) => onDept(e.target.value)} required className={fieldBox}>
              <option value="" disabled>Select your department…</option>
              {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div className="mb-4">
            <label htmlFor="college" className={fieldLabel}>College / University</label>
            <input id="college" name="college" type="text" required placeholder="e.g. Sardar Patel Institute of Technology" className={`${fieldBox} placeholder:text-faint`} />
          </div>

          <div className="mb-4">
            <label htmlFor="semester" className={fieldLabel}>Current semester</label>
            <select id="semester" name="semester" defaultValue="" required className={fieldBox}>
              <option value="" disabled>Select…</option>
              {SEMESTERS.map((s) => <option key={s} value={s}>Semester {s}</option>)}
            </select>
          </div>

          {/* Career-goal mapping — "What's your vision?" */}
          <div className="mb-4">
            <label htmlFor="careerGoal" className={fieldLabel}>Career goal</label>
            <select id="careerGoal" name="careerGoal" value={goal} onChange={(e) => setGoal(e.target.value)} className={fieldBox}>
              <option value="">What&apos;s your vision? (optional)</option>
              {CAREER_GOALS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
            {CAREER_INSIGHT[goal] ? (
              <div className="mt-2 rounded-lg border border-cyan/20 bg-cyan/[0.06] px-3 py-2">
                <p className="text-[11px] font-bold uppercase tracking-wide text-cyan">Career Insight</p>
                <p className="mt-0.5 text-[12px] text-soft">{CAREER_INSIGHT[goal]}</p>
              </div>
            ) : null}
          </div>

          {/* Coding track — seeded by branch, but the student decides. */}
          <label className="mb-5 flex cursor-pointer items-start gap-2.5 rounded-xl border border-line-strong bg-surface/60 p-3">
            <input type="checkbox" name="codingEnabled" checked={coding} onChange={(e) => { setCoding(e.target.checked); setCodingTouched(true); }} className="mt-0.5 size-4 accent-cyan" />
            <span className="text-[12.5px] text-soft">
              I want <b>DSA practice &amp; coding interviews</b>
              <span className="block text-[11.5px] text-faint">On by default for CS/IT. Any branch can turn it on — turn it off if you only want reports, PPTs, resume &amp; non-coding interviews.</span>
            </span>
          </label>

          {/* Legal acceptance — the last step before entering. */}
          <label className="mb-4 flex cursor-pointer items-start gap-2.5">
            <input type="checkbox" name="acceptedLegal" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5 size-4 accent-cyan" />
            <span className="text-[12px] text-muted">
              I agree to the{" "}
              <a href="/terms" target="_blank" className="text-cyan hover:underline">Terms</a> and{" "}
              <a href="/privacy" target="_blank" className="text-cyan hover:underline">Privacy Policy</a>.
            </span>
          </label>

          {state.error ? (
            <p className="mb-4 rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-[12.5px] text-danger">{state.error}</p>
          ) : null}

          <button
            type="submit"
            disabled={pending || !accepted}
            className="w-full rounded-xl bg-accent-gradient py-3 text-[14px] font-semibold text-on-accent shadow-[0_6px_18px_rgba(79,70,229,0.3)] transition-transform hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0"
          >
            {pending ? "Setting up your workspace…" : "Enter Vidyas OS →"}
          </button>
        </form>
      </div>
    </main>
  );
}

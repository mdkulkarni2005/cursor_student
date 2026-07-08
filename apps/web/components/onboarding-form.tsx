"use client";

import { useState } from "react";
import { useActionState } from "react";
import Link from "next/link";
import { completeOnboarding, type OnboardingState } from "@/lib/actions/onboarding";
import { SESSION_EXPIRED_ERROR } from "@/lib/actions/onboarding-constants";
import { DEPARTMENTS, SEMESTERS } from "@/lib/constants";
import { CODING_DEPARTMENTS } from "@/lib/capabilities";
import { Sparkle } from "@/components/icons";
import { SignOutButtonPlain } from "@/components/sign-out-button";

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

const ROLE_COPY: Record<"STUDENT" | "PROFESSIONAL", { title: string; body: string }> = {
  STUDENT: {
    title: "I'm a Student",
    body: "Tell us your academic context so every assignment, report and PPT comes out in the right format for your branch and college.",
  },
  PROFESSIONAL: {
    title: "I'm a Working Professional",
    body: "Tell us where you work so recruiters can reach out — you'll get DSA practice, mock interviews, and real recruiter interviews.",
  },
};

export function OnboardingForm({ firstName }: { firstName: string | null }) {
  const [state, action, pending] = useActionState<OnboardingState, FormData>(completeOnboarding, {});

  const [userType, setUserType] = useState<"STUDENT" | "PROFESSIONAL">("STUDENT");
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
        <div className="mb-6 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-accent-gradient shadow-[0_0_18px_rgba(246,146,30,0.4)]">
              <Sparkle size={18} className="text-on-accent" />
            </span>
            <span className="font-display text-lg font-bold text-ink">Vidyas OS</span>
          </div>
          <SignOutButtonPlain className="text-[12.5px] font-medium text-faint hover:text-muted hover:underline">
            Not you? Sign out
          </SignOutButtonPlain>
        </div>

        <h1 className="font-display text-[24px] font-bold leading-tight text-ink">
          {firstName ? `Welcome, ${firstName}.` : "Welcome."}
        </h1>
        <p className="mb-6 mt-1.5 text-[14px] text-muted">{ROLE_COPY[userType].body}</p>

        <form action={action} className="rounded-2xl border border-line bg-card p-5">
          <input type="hidden" name="userType" value={userType} />

          {/* Role toggle — determines which fields below apply. */}
          <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl border border-line-strong bg-surface/60 p-1">
            {(["STUDENT", "PROFESSIONAL"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setUserType(t)}
                className={[
                  "rounded-lg px-3 py-2 text-[12.5px] font-semibold transition-colors",
                  userType === t ? "bg-accent-gradient text-on-accent" : "text-muted hover:text-soft",
                ].join(" ")}
              >
                {ROLE_COPY[t].title}
              </button>
            ))}
          </div>

          {userType === "STUDENT" ? (
            <>
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
            </>
          ) : (
            <>
              <div className="mb-4">
                <label htmlFor="companyName" className={fieldLabel}>Company</label>
                <input id="companyName" name="companyName" type="text" required placeholder="e.g. Acme Corp" className={`${fieldBox} placeholder:text-faint`} />
              </div>

              <div className="mb-4">
                <label htmlFor="jobTitle" className={fieldLabel}>Job title</label>
                <input id="jobTitle" name="jobTitle" type="text" required placeholder="e.g. Software Engineer" className={`${fieldBox} placeholder:text-faint`} />
              </div>

              <div className="mb-4">
                <label htmlFor="yearsOfExperience" className={fieldLabel}>Years of experience</label>
                <input id="yearsOfExperience" name="yearsOfExperience" type="number" min={0} max={60} placeholder="e.g. 3" className={`${fieldBox} placeholder:text-faint`} />
              </div>
            </>
          )}

          <div className="mb-4">
            <label htmlFor="phone" className={fieldLabel}>Phone number</label>
            <input id="phone" name="phone" type="tel" required placeholder="e.g. 9876543210" className={`${fieldBox} placeholder:text-faint`} />
            <p className="mt-1 text-[11px] text-faint">Used only to verify you&apos;re a unique person — never shared or used for marketing.</p>
          </div>

          <div className="mb-4">
            <label htmlFor="github" className={fieldLabel}>GitHub link</label>
            <input id="github" name="github" type="text" required placeholder="e.g. github.com/yourname" className={`${fieldBox} placeholder:text-faint`} />
          </div>

          <div className="mb-4">
            <label htmlFor="linkedin" className={fieldLabel}>LinkedIn link</label>
            <input id="linkedin" name="linkedin" type="text" required placeholder="e.g. linkedin.com/in/yourname" className={`${fieldBox} placeholder:text-faint`} />
          </div>

          <div className="mb-4">
            <label htmlFor="gpa" className={fieldLabel}>GPA / CGPA <span className="font-normal text-faint">(optional, out of 10)</span></label>
            <input id="gpa" name="gpa" type="number" min={0} max={10} step="0.01" placeholder="e.g. 8.5" className={`${fieldBox} placeholder:text-faint`} />
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

          {/* Coding track — seeded by branch, but the student decides. Professionals always get it. */}
          {userType === "STUDENT" ? (
            <label className="mb-5 flex cursor-pointer items-start gap-2.5 rounded-xl border border-line-strong bg-surface/60 p-3">
              <input type="checkbox" name="codingEnabled" checked={coding} onChange={(e) => { setCoding(e.target.checked); setCodingTouched(true); }} className="mt-0.5 size-4 accent-cyan" />
              <span className="text-[12.5px] text-soft">
                I want <b>DSA practice &amp; coding interviews</b>
                <span className="block text-[11.5px] text-faint">On by default for CS/IT. Any branch can turn it on — turn it off if you only want reports, PPTs, resume &amp; non-coding interviews.</span>
              </span>
            </label>
          ) : null}

          {/* Legal acceptance — the last step before entering. */}
          <label className="mb-4 flex cursor-pointer items-start gap-2.5">
            <input type="checkbox" name="acceptedLegal" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5 size-4 accent-cyan" />
            <span className="text-[12px] text-muted">
              I agree to the{" "}
              <a href="/terms" target="_blank" className="text-cyan hover:underline">Terms</a> and{" "}
              <a href="/privacy" target="_blank" className="text-cyan hover:underline">Privacy Policy</a>.
            </span>
          </label>

          {state.error === SESSION_EXPIRED_ERROR ? (
            <div className="mb-4 rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-[12.5px] text-danger">
              <p>Your session has expired.</p>
              <Link href="/sign-in" className="font-semibold underline underline-offset-2 hover:opacity-80">
                Sign in again →
              </Link>
            </div>
          ) : state.error ? (
            <p className="mb-4 rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-[12.5px] text-danger">{state.error}</p>
          ) : null}

          <button
            type="submit"
            disabled={pending || !accepted}
            className="w-full rounded-xl bg-accent-gradient py-3 text-[14px] font-semibold text-on-accent shadow-[0_6px_18px_rgba(246,146,30,0.3)] transition-transform hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0"
          >
            {pending ? "Setting up your workspace…" : "Enter Vidyas OS →"}
          </button>
        </form>
      </div>
    </main>
  );
}

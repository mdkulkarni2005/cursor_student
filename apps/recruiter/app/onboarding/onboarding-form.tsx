"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { saveApplication, type OnboardingState } from "./actions";
import { SESSION_EXPIRED_ERROR } from "./onboarding-constants";
import { INDUSTRIES } from "@/lib/industries";
import { SignOutButtonPlain } from "@/components/sign-out-button";

type Initial = {
  name: string;
  phone: string;
  companyName: string;
  companyEmail: string;
  industry: string;
  designation: string;
  linkedinUrl: string;
};

const fieldLabel = "mb-1.5 block text-[12.5px] font-semibold text-muted";
const fieldBox =
  "w-full rounded-xl border border-line-strong bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none transition-colors focus:border-cyan/50";

export function OnboardingForm({ initial }: { initial: Initial }) {
  const [state, action, pending] = useActionState<OnboardingState, FormData>(saveApplication, {});
  const [savedAt, setSavedAt] = useState<string | null>(null);

  // Fields are CONTROLLED (not defaultValue) — React resets uncontrolled form fields after any
  // action that doesn't throw, which would otherwise clear the visible inputs right after a
  // successful "Save draft" even though the data safely persisted. Controlled state keeps what
  // the recruiter sees in sync with what's actually saved.
  const [fields, setFields] = useState(initial);
  function set<K extends keyof Initial>(key: K, value: Initial[K]) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  async function draftAction(formData: FormData) {
    formData.set("intent", "draft");
    setSavedAt(null);
    await action(formData);
    setSavedAt(new Date().toLocaleTimeString());
  }
  async function submitAction(formData: FormData) {
    formData.set("intent", "submit");
    await action(formData);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4 py-12">
      <div className="w-full max-w-[480px]">
        <div className="mb-6 flex items-start justify-between gap-2.5">
          <div className="text-center">
            <span className="font-display text-[19px] font-bold text-cyan">krackit</span>
            <span className="mt-0.5 block text-[10px] font-bold uppercase tracking-[0.18em] text-faint">
              Recruiter Application
            </span>
          </div>
          <SignOutButtonPlain className="mt-1 text-[12.5px] font-medium text-faint hover:text-muted hover:underline">
            Not you? Sign out
          </SignOutButtonPlain>
        </div>

        <form action={submitAction} className="rounded-2xl border border-line bg-card p-5">
          <p className="mb-4 text-[13px] text-muted">
            Your application is reviewed by our team before you can browse student profiles. Progress is saved as you
            go — if your connection drops, just come back and pick up where you left off.
          </p>

          <div className="mb-4">
            <label htmlFor="name" className={fieldLabel}>Your name</label>
            <input id="name" name="name" type="text" required value={fields.name} onChange={(e) => set("name", e.target.value)} className={fieldBox} />
          </div>

          <div className="mb-4">
            <label htmlFor="phone" className={fieldLabel}>Phone number</label>
            <input id="phone" name="phone" type="tel" required placeholder="e.g. 9876543210" value={fields.phone} onChange={(e) => set("phone", e.target.value)} className={`${fieldBox} placeholder:text-faint`} />
          </div>

          <div className="mb-4">
            <label htmlFor="companyName" className={fieldLabel}>Company name</label>
            <input id="companyName" name="companyName" type="text" required value={fields.companyName} onChange={(e) => set("companyName", e.target.value)} className={fieldBox} />
          </div>

          <div className="mb-4">
            <label htmlFor="companyEmail" className={fieldLabel}>Company email (optional)</label>
            <input id="companyEmail" name="companyEmail" type="email" placeholder="you@company.com" value={fields.companyEmail} onChange={(e) => set("companyEmail", e.target.value)} className={`${fieldBox} placeholder:text-faint`} />
            <p className="mt-1 text-[11px] text-faint">Helps our team verify your company faster.</p>
          </div>

          <div className="mb-4">
            <label htmlFor="industry" className={fieldLabel}>Industry you hire for</label>
            <select id="industry" name="industry" required value={fields.industry} onChange={(e) => set("industry", e.target.value)} className={fieldBox}>
              <option value="" disabled>Select…</option>
              {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>

          <div className="mb-4">
            <label htmlFor="designation" className={fieldLabel}>Designation (optional)</label>
            <input id="designation" name="designation" type="text" placeholder="e.g. Talent Acquisition Lead" value={fields.designation} onChange={(e) => set("designation", e.target.value)} className={`${fieldBox} placeholder:text-faint`} />
          </div>

          <div className="mb-5">
            <label htmlFor="linkedinUrl" className={fieldLabel}>LinkedIn profile (optional)</label>
            <input id="linkedinUrl" name="linkedinUrl" type="url" placeholder="https://linkedin.com/in/…" value={fields.linkedinUrl} onChange={(e) => set("linkedinUrl", e.target.value)} className={`${fieldBox} placeholder:text-faint`} />
          </div>

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
          {savedAt && !state.error ? (
            <p className="mb-4 text-[12px] text-success">Draft saved at {savedAt}.</p>
          ) : null}

          <div className="flex gap-2">
            <button
              type="submit"
              formAction={draftAction}
              disabled={pending}
              className="flex-1 rounded-xl border border-line-strong py-3 text-[13.5px] font-semibold text-soft hover:bg-surface disabled:opacity-60"
            >
              Save draft
            </button>
            <button
              type="submit"
              disabled={pending}
              className="flex-1 rounded-xl bg-accent-gradient py-3 text-[13.5px] font-semibold text-on-accent shadow-[0_6px_18px_rgba(246,146,30,0.3)] disabled:opacity-60"
            >
              Submit for review
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

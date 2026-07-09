"use client";

import { useActionState } from "react";
import { generateResumeAction, type ResumeFormState } from "@/lib/actions/resume";
import { ClarifyQuestions } from "@/components/clarify-questions";
import { GeneratingOverlay } from "@/components/generating-overlay";
import { useErrorToast } from "@/lib/use-error-toast";

const label = "mb-1.5 block text-[12.5px] font-semibold text-muted";
const box =
  "w-full rounded-xl border border-line-strong bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none transition-colors focus:border-cyan/50 placeholder:text-faint";

export function GenerateResumeForm({ defaults }: { defaults: { name?: string; email?: string } }) {
  const [state, action, pending] = useActionState<ResumeFormState, FormData>(generateResumeAction, {});
  useErrorToast(state.error);
  const questions = state.questions ?? [];

  return (
    <form action={action} className="rounded-2xl border border-line bg-card p-5">
      <GeneratingOverlay label="Generating your resume…" />
      <div className="mb-4">
        <label htmlFor="targetRole" className={label}>
          Target role
        </label>
        <input id="targetRole" name="targetRole" type="text" placeholder="e.g. Backend Engineer, ML Intern" className={box} />
      </div>

      <div className="mb-4">
        <label htmlFor="rawNotes" className={label}>
          About you — projects, experience, skills, achievements
        </label>
        <textarea
          id="rawNotes"
          name="rawNotes"
          rows={5}
          placeholder="Dump everything in any shape: what you built, tech used, internships, impact (users, %), skills, coursework… We'll turn it into strong ATS bullets in the house format."
          className={`${box} resize-none`}
        />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="name" className={label}>Full name</label>
          <input id="name" name="name" type="text" defaultValue={defaults.name} className={box} />
        </div>
        <div>
          <label htmlFor="email" className={label}>Email</label>
          <input id="email" name="email" type="email" defaultValue={defaults.email} className={box} />
        </div>
        <div>
          <label htmlFor="phone" className={label}>Phone</label>
          <input id="phone" name="phone" type="tel" placeholder="+91…" className={box} />
        </div>
        <div>
          <label htmlFor="location" className={label}>Location</label>
          <input id="location" name="location" type="text" placeholder="City, State" className={box} />
        </div>
        <div>
          <label htmlFor="linkedin" className={label}>LinkedIn</label>
          <input id="linkedin" name="linkedin" type="text" placeholder="linkedin.com/in/…" className={box} />
        </div>
        <div>
          <label htmlFor="github" className={label}>GitHub <span className="font-normal text-faint">(optional)</span></label>
          <input id="github" name="github" type="text" placeholder="github.com/…" className={box} />
        </div>
      </div>

      {questions.length > 0 ? <ClarifyQuestions questions={questions} /> : null}

      {state.error ? (
        <div className="mb-4 rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-[12.5px] text-danger">
          {state.error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-accent-gradient py-3 text-[14px] font-semibold text-on-accent shadow-[0_6px_18px_rgba(246,146,30,0.3)] transition-transform hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0"
      >
        {pending ? "Building your resume…" : questions.length > 0 ? "Continue →" : "Generate resume →"}
      </button>
      <p className="mt-3 text-center text-[11.5px] text-faint">ATS-friendly · your format · exported as Word (.docx)</p>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { startInterviewAction, type InterviewFormState } from "@/lib/actions/interview";
import { useErrorToast } from "@/lib/use-error-toast";

const label = "mb-1.5 block text-[12.5px] font-semibold text-muted";
const box =
  "w-full rounded-xl border border-line-strong bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none transition-colors focus:border-cyan/50 placeholder:text-faint";

// Local so this client component doesn't pull the @studentos/ai barrel.
const ROUND_OPTIONS = [
  { value: "technical", label: "Technical" },
  { value: "behavioral", label: "Behavioral" },
  { value: "coding", label: "Coding / DSA" },
];

const DIFFICULTY_OPTIONS = [
  { value: "auto", label: "Auto — match the role" },
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

export function StartInterviewForm({ resumes, codingEnabled = true }: { resumes: { id: string; title: string }[]; codingEnabled?: boolean }) {
  const [state, action, pending] = useActionState<InterviewFormState, FormData>(startInterviewAction, {});
  useErrorToast(state.error);
  // Non-coding tracks get a normal interview (technical + behavioral) without the coding round.
  const rounds = ROUND_OPTIONS.filter((r) => codingEnabled || r.value !== "coding");

  return (
    <form action={action} className="rounded-2xl border border-line bg-card p-5">
      <div className="mb-4">
        <label htmlFor="role" className={label}>Role you&apos;re interviewing for</label>
        <input id="role" name="role" type="text" required placeholder="e.g. Backend Engineer, ML Intern" className={box} />
      </div>

      <div className="mb-4">
        <span className={label}>Rounds</span>
        <div className="flex flex-wrap gap-2">
          {rounds.map((r) => (
            <label
              key={r.value}
              className="cursor-pointer rounded-full border border-line-strong bg-surface px-3.5 py-2 text-[13px] text-soft transition-colors has-[:checked]:border-cyan/50 has-[:checked]:bg-cyan/12 has-[:checked]:text-cyan"
            >
              <input type="checkbox" name="rounds" value={r.value} defaultChecked={r.value !== "coding"} className="sr-only" />
              {r.label}
            </label>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <span className={label}>
          Difficulty <span className="font-normal text-faint">(Auto reads the role/JD — intern gets easier questions, SDE2+ gets harder ones)</span>
        </span>
        <div className="flex flex-wrap gap-2">
          {DIFFICULTY_OPTIONS.map((d) => (
            <label
              key={d.value}
              className="cursor-pointer rounded-full border border-line-strong bg-surface px-3.5 py-2 text-[13px] text-soft transition-colors has-[:checked]:border-cyan/50 has-[:checked]:bg-cyan/12 has-[:checked]:text-cyan"
            >
              <input type="radio" name="difficulty" value={d.value} defaultChecked={d.value === "auto"} className="sr-only" />
              {d.label}
            </label>
          ))}
        </div>
      </div>

      {resumes.length > 0 ? (
        <div className="mb-4">
          <label htmlFor="resumeDocId" className={label}>
            Use a resume <span className="font-normal text-faint">(grounds questions in your experience)</span>
          </label>
          <select id="resumeDocId" name="resumeDocId" defaultValue="" className={box}>
            <option value="">No resume — use my profile</option>
            {resumes.map((r) => (
              <option key={r.id} value={r.id}>{r.title}</option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="mb-4">
        <label htmlFor="jobDescription" className={label}>
          Paste a job description <span className="font-normal text-faint">(optional — tailors the questions to the role)</span>
        </label>
        <textarea
          id="jobDescription"
          name="jobDescription"
          rows={3}
          placeholder="Paste the JD here, or leave blank for a general interview based on your resume/profile…"
          className={`${box} resize-none`}
        />
      </div>

      {state.error ? (
        <div className="mb-4 rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-[12.5px] text-danger">{state.error}</div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-accent-gradient py-3 text-[14px] font-semibold text-on-accent shadow-[0_6px_18px_rgba(254,127,45,0.3)] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
      >
        {pending ? "Setting up your interview…" : "Start interview →"}
      </button>
      <p className="mt-3 text-center text-[11.5px] text-faint">{codingEnabled ? "Technical + behavioral + coding · evaluation report at the end" : "Technical + behavioral · evaluation report at the end"}</p>
    </form>
  );
}

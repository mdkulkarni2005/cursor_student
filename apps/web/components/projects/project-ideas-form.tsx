"use client";

import { useActionState } from "react";
import { suggestIdeasAction, type IdeasFormState } from "@/lib/actions/projects";
import { ClarifyQuestions } from "@/components/clarify-questions";
import { IdeaCard, DIFFICULTY_LABELS } from "@/components/projects/idea-card";

const label = "mb-1.5 block text-[12.5px] font-semibold text-muted";
const box =
  "w-full rounded-xl border border-line-strong bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none transition-colors focus:border-cyan/50 placeholder:text-faint";

const PROJECT_DIFFICULTIES = Object.keys(DIFFICULTY_LABELS);

export function ProjectIdeasForm() {
  const [state, action, pending] = useActionState<IdeasFormState, FormData>(suggestIdeasAction, {});
  const questions = state.questions ?? [];
  const ideas = state.ideas ?? [];

  return (
    <div>
      <form action={action} className="rounded-2xl border border-line bg-card p-5">
        <div className="mb-4">
          <label htmlFor="interests" className={label}>
            Your interests / area <span className="font-normal text-faint">(optional)</span>
          </label>
          <input id="interests" name="interests" type="text" placeholder="e.g. renewable energy, computer vision, robotics" className={box} />
        </div>
        <div className="mb-4">
          <label htmlFor="difficulty" className={label}>Project type</label>
          <select id="difficulty" name="difficulty" defaultValue="mini" className={box}>
            {PROJECT_DIFFICULTIES.map((d) => (
              <option key={d} value={d}>{DIFFICULTY_LABELS[d]}</option>
            ))}
          </select>
        </div>

        {questions.length > 0 ? <ClarifyQuestions questions={questions} /> : null}

        {state.error ? (
          <div className="mb-4 rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-[12.5px] text-danger">{state.error}</div>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-accent-gradient py-3 text-[14px] font-semibold text-on-accent shadow-[0_6px_18px_rgba(246,146,30,0.3)] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
        >
          {pending ? "Thinking up ideas…" : questions.length > 0 ? "Continue →" : ideas.length > 0 ? "Suggest more →" : "Suggest project ideas →"}
        </button>
      </form>

      {ideas.length > 0 ? (
        <div className="mt-4">
          <p className="mb-2.5 text-[13px] font-semibold text-ink">Compare {ideas.length} ideas — finalize one to build it:</p>
          <div className="grid grid-cols-1 gap-3">
            {ideas.map((idea, i) => (
              <IdeaCard key={i} idea={idea} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

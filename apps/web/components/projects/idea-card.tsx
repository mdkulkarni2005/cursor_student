import { finalizeProjectAction } from "@/lib/actions/projects";
import { SubmitButton } from "@/components/ui/button";

// Kept local so this doesn't pull the @studentos/ai barrel (Node-only deps) into client bundles.
export const DIFFICULTY_LABELS: Record<string, string> = {
  mini: "Mini Project",
  major: "Major Project",
  tpcs: "TPCS",
  "3rd-year": "3rd-Year",
};

export type IdeaCardIdea = {
  title: string;
  summary: string;
  difficulty: string;
  skills: string[];
  hardwareNeeded: boolean;
  hardwareNote?: string;
  whyGood: string;
};

/** One idea, shown as a compare/finalize card. Server-safe — no hooks — usable from either a server or client tree. */
export function IdeaCard({ idea }: { idea: IdeaCardIdea }) {
  return (
    <form action={finalizeProjectAction} className="rounded-xl border border-line bg-card p-4 transition-colors hover:border-cyan/30">
      <input type="hidden" name="idea" value={JSON.stringify(idea)} />
      <div className="flex items-start justify-between gap-3">
        <p className="text-[14px] font-semibold text-ink">{idea.title}</p>
        <span className="shrink-0 rounded-full bg-indigo/12 px-2.5 py-1 text-[11px] font-semibold text-indigo">
          {DIFFICULTY_LABELS[idea.difficulty] ?? idea.difficulty}
        </span>
      </div>
      <p className="mt-1.5 text-[12.5px] text-soft">{idea.summary}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {idea.skills.map((s) => (
          <span key={s} className="rounded-full border border-line-strong bg-surface px-2.5 py-0.5 text-[11px] text-muted">{s}</span>
        ))}
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${idea.hardwareNeeded ? "bg-warning/12 text-warning" : "bg-success/12 text-success"}`}>
          {idea.hardwareNeeded ? "Hardware needed" : "Software only"}
        </span>
      </div>
      <p className="mt-2 text-[11.5px] text-faint">{idea.whyGood}</p>
      {idea.hardwareNote ? <p className="mt-1 text-[11.5px] text-warning/80">⚙ {idea.hardwareNote}</p> : null}
      <input
        name="description"
        placeholder="Add any details (team size, what you have)…"
        className="mt-3 w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-[12.5px] text-ink outline-none focus:border-cyan/50 placeholder:text-faint"
      />
      <SubmitButton loadingText="Finalizing…" className="mt-2.5 w-full rounded-lg bg-accent-gradient py-2 text-[12.5px] font-semibold text-on-accent transition-transform hover:-translate-y-0.5 disabled:opacity-60">
        Finalize this project →
      </SubmitButton>
    </form>
  );
}

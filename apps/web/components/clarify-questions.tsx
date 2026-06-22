import type { ClarifyQuestion } from "@studentos/ai";

/**
 * Renders the clarifying questions the system asks when context is unclear.
 * Lives inside the generator's <form> — answers post back with the form. Includes
 * hidden fields so the action knows questions were shown and can reconstruct them.
 * Each question allows selecting options AND/OR typing a custom answer.
 */
export function ClarifyQuestions({ questions }: { questions: ClarifyQuestion[] }) {
  return (
    <div className="mb-4 rounded-xl border border-cyan/25 bg-cyan/[0.06] p-4">
      <input type="hidden" name="clarifyShown" value="1" />
      <input type="hidden" name="clarifyQuestions" value={JSON.stringify(questions)} />
      <p className="mb-3 text-[12.5px] font-semibold text-cyan">
        A few quick questions to get this right:
      </p>
      <div className="flex flex-col gap-4">
        {questions.map((q) => (
          <div key={q.id}>
            <p className="mb-1.5 text-[13px] font-medium text-soft">{q.question}</p>
            {q.type !== "text" && q.options.length > 0 ? (
              <div className="mb-1.5 flex flex-wrap gap-1.5">
                {q.options.map((opt) => (
                  <label
                    key={opt}
                    className="cursor-pointer rounded-full border border-line-strong bg-surface px-3 py-1.5 text-[12px] text-soft transition-colors has-[:checked]:border-cyan/50 has-[:checked]:bg-cyan/12 has-[:checked]:text-cyan"
                  >
                    <input
                      type={q.type === "multi" ? "checkbox" : "radio"}
                      name={`clarify_${q.id}`}
                      value={opt}
                      className="sr-only"
                    />
                    {opt}
                  </label>
                ))}
              </div>
            ) : null}
            <input
              type="text"
              name={`clarify_${q.id}`}
              placeholder={q.type === "text" ? "Type your answer…" : "or type your own…"}
              className="w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-[13px] text-ink outline-none transition-colors focus:border-cyan/50 placeholder:text-faint"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Correctness caveat for branch-solver outputs (numerical/design/code-clause answers). These are
 * AI-generated, not a validated computation engine — same honesty standard as the plagiarism/
 * AI-detection heuristic elsewhere in the app. Render on every solver result page and mirror the
 * text in the DOCX export footer.
 */
export function AIGeneratedNotice({ subject }: { subject?: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-warning/25 bg-warning/8 p-3.5 text-[12.5px] leading-relaxed text-soft">
      <span className="mt-0.5 shrink-0 text-warning">⚠</span>
      <p>
        AI-generated{subject ? ` ${subject}` : ""} — double-check formulas, code-clause citations, and
        final answers against your reference book or faculty before submitting.
      </p>
    </div>
  );
}

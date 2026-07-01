"use client";

import { useMemo, useState, useTransition } from "react";
import { TemplatePreview } from "./template-preview";
import { saveTemplateDeckAction } from "@/lib/actions/ppt";

export type TemplateSectionInit = { heading: string; bullets: string[] };
export type TemplateFieldInit = { label: string; value: string };

/**
 * View + edit surface for a deck bound to an uploaded STRUCTURED template. Preview mode shows the
 * EXACT rendered slides (PDF via Gotenberg); Edit mode is a lightweight, template-safe editor —
 * per-section bullets + the info-table fields — which on Save re-fills the user's own template (not
 * a generic deck). Editing is only offered when the deck is linked to its template file (`canEdit`).
 */
export function TemplateDeck({
  docId,
  canEdit,
  sections: initialSections,
  fields: initialFields,
}: {
  docId: string;
  canEdit: boolean;
  sections: TemplateSectionInit[];
  fields: TemplateFieldInit[];
}) {
  const [mode, setMode] = useState<"preview" | "edit">("preview");
  const [version, setVersion] = useState(0);
  const [saving, startSave] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  // Editor working copy: bullets as newline-joined text (one bullet per line).
  const [sectionText, setSectionText] = useState<string[]>(() => initialSections.map((s) => s.bullets.join("\n")));
  const [fieldVals, setFieldVals] = useState<Record<string, string>>(
    () => Object.fromEntries(initialFields.map((f) => [f.label, f.value])),
  );

  const readOnlyFallback = useMemo(
    () => (
      <div className="space-y-4 rounded-xl border border-line bg-card p-5">
        {initialSections.map((s, i) => (
          <div key={i}>
            <p className="font-semibold text-ink">{s.heading}</p>
            <ul className="mt-1 list-disc pl-5 text-[13.5px] text-soft">
              {s.bullets.map((b, j) => <li key={j}>{b}</li>)}
            </ul>
          </div>
        ))}
      </div>
    ),
    [initialSections],
  );

  function save() {
    setMsg(null);
    startSave(async () => {
      const res = await saveTemplateDeckAction(docId, {
        sections: sectionText.map((t) => t.split("\n").map((l) => l.trim()).filter(Boolean)),
        fields: fieldVals,
      });
      if (res.error) { setMsg(res.error); return; }
      setVersion((v) => v + 1); // bust the PDF cache so the preview shows the new slides
      setMode("preview");
    });
  }

  return (
    <div className="mt-4">
      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-card p-2">
        <div className="flex rounded-lg border border-line bg-surface p-0.5">
          <button
            onClick={() => setMode("preview")}
            className={`rounded-md px-3 py-1.5 text-[13px] font-semibold transition-colors ${mode === "preview" ? "bg-cyan text-on-accent" : "text-soft hover:text-cyan"}`}
          >
            Preview
          </button>
          {canEdit ? (
            <button
              onClick={() => setMode("edit")}
              className={`rounded-md px-3 py-1.5 text-[13px] font-semibold transition-colors ${mode === "edit" ? "bg-cyan text-on-accent" : "text-soft hover:text-cyan"}`}
            >
              ✎ Edit
            </button>
          ) : null}
        </div>
        {mode === "edit" ? (
          <button
            onClick={save}
            disabled={saving}
            className="rounded-lg border border-cyan/30 bg-cyan/5 px-4 py-1.5 text-[13px] font-semibold text-cyan disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        ) : null}
        {msg ? <span className="text-[12.5px] text-danger">{msg}</span> : null}
        <span className="ml-auto text-[12px] text-faint">
          {canEdit ? "Edits re-fill your template · download to fine-tune in PowerPoint" : "Regenerate this deck to enable in-app editing"}
        </span>
      </div>

      {mode === "preview" ? (
        <TemplatePreview docId={docId} version={version}>{readOnlyFallback}</TemplatePreview>
      ) : (
        <div className="space-y-4">
          {saving ? (
            <div className="flex items-center gap-2 rounded-lg border border-cyan/25 bg-cyan/[0.06] px-3.5 py-2.5 text-[12.5px] text-cyan">
              <span className="size-4 animate-spin rounded-full border-2 border-cyan/30 border-t-cyan" />
              Re-filling your template with the edits…
            </div>
          ) : null}

          {/* Info-table fields */}
          {initialFields.length ? (
            <div className="rounded-xl border border-line bg-card p-4">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-faint">Cover details</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {initialFields.map((f) => (
                  <label key={f.label} className="block">
                    <span className="mb-1 block text-[12px] font-medium text-soft">{f.label}</span>
                    <input
                      value={fieldVals[f.label] ?? ""}
                      onChange={(e) => setFieldVals((prev) => ({ ...prev, [f.label]: e.target.value }))}
                      className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-[13.5px] text-ink outline-none focus:border-cyan/50"
                    />
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          {/* Section bullets */}
          {initialSections.map((s, i) => (
            <div key={i} className="rounded-xl border border-line bg-card p-4">
              <p className="mb-2 font-display text-[15px] font-semibold text-ink">{s.heading}</p>
              <p className="mb-1.5 text-[11px] text-faint">One bullet per line</p>
              <textarea
                value={sectionText[i] ?? ""}
                onChange={(e) => setSectionText((prev) => prev.map((t, j) => (j === i ? e.target.value : t)))}
                rows={Math.max(4, (sectionText[i] ?? "").split("\n").length + 1)}
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-[13.5px] leading-relaxed text-ink outline-none focus:border-cyan/50"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import type { Resume } from "@studentos/documents";
import { updateResumeAction } from "@/lib/actions/resume";
import { SubmitButton } from "@/components/ui/button";

const label = "mb-1 block text-[11.5px] font-semibold text-muted";
const box =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-[13px] text-ink outline-none transition-colors focus:border-cyan/50 placeholder:text-faint";
const btnSm =
  "rounded-lg border border-cyan/30 bg-cyan/5 px-2.5 py-1 text-[12px] font-semibold text-cyan transition-colors hover:bg-cyan/10";
const sectionCard = "rounded-2xl border border-line bg-card p-4";

const CONTACT_LABELS: Record<string, string> = {
  name: "Full Name", email: "Email", phone: "Phone", location: "Location", linkedin: "LinkedIn", github: "GitHub",
};

/** Section header with an accent dot + title and optional action on the right. */
function SectionHead({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h3 className="flex items-center gap-2 text-[13px] font-semibold text-ink">
        <span className="size-2 rounded-full bg-cyan" />
        {title}
      </h3>
      {action}
    </div>
  );
}

type EntryKind = "experience" | "projects" | "education";

export function ResumeEditor({ docId, resume }: { docId: string; resume: Resume }) {
  const [r, setR] = useState<Resume>(resume);

  const setContact = (k: keyof Resume["contact"], v: string) =>
    setR((p) => ({ ...p, contact: { ...p.contact, [k]: v || undefined } }));

  // Generic helpers for entry arrays.
  const updateEntry = (kind: EntryKind, i: number, patch: Record<string, unknown>) =>
    setR((p) => ({ ...p, [kind]: p[kind].map((e, idx) => (idx === i ? { ...e, ...patch } : e)) }));
  const removeEntry = (kind: EntryKind, i: number) =>
    setR((p) => ({ ...p, [kind]: p[kind].filter((_, idx) => idx !== i) }));
  const addEntry = (kind: EntryKind) =>
    setR((p) => {
      const blank =
        kind === "education"
          ? { institution: "New institution", degree: "", dates: { start: "", end: "" } }
          : kind === "projects"
            ? { name: "New project", role: "", dates: { start: "", end: "" }, bullets: [], link: "" }
            : { organization: "New role", role: "", dates: { start: "", end: "" }, bullets: [] };
      return { ...p, [kind]: [...p[kind], blank] } as Resume;
    });

  const bulletsText = (b: string[]) => b.join("\n");
  const parseBullets = (t: string) => t.split("\n").map((s) => s.trim()).filter(Boolean);

  return (
    <form action={updateResumeAction} className="space-y-5">
      <input type="hidden" name="docId" value={docId} />
      <input type="hidden" name="resume" value={JSON.stringify(r)} />

      {/* Personal Information */}
      <div className={sectionCard}>
        <SectionHead title="Personal Information" />
        <div className="grid grid-cols-2 gap-3">
          {(["name", "email", "phone", "location", "linkedin", "github"] as const).map((k) => (
            <div key={k}>
              <label className={label}>{CONTACT_LABELS[k]}</label>
              <input id={`resume-contact-${k}`} className={box} value={r.contact[k] ?? ""} onChange={(e) => setContact(k, e.target.value)} />
            </div>
          ))}
        </div>
        <div className="mt-3">
          <label className={label}>Professional Summary</label>
          <textarea className={`${box} resize-none`} rows={3} value={r.summary ?? ""} onChange={(e) => setR((p) => ({ ...p, summary: e.target.value }))} />
        </div>
      </div>

      {/* Skills */}
      <div className={sectionCard}>
        <SectionHead title="Skills" action={<button type="button" className={btnSm} onClick={() => setR((p) => ({ ...p, skills: [...p.skills, { category: "New", items: [] }] }))}>+ Group</button>} />
        <div className="space-y-2">
          {r.skills.map((g, i) => (
            <div key={i} className="flex gap-2">
              <input
                className={`${box} w-40 shrink-0`}
                value={g.category}
                placeholder="Category"
                onChange={(e) => setR((p) => ({ ...p, skills: p.skills.map((x, idx) => (idx === i ? { ...x, category: e.target.value } : x)) }))}
              />
              <input
                className={box}
                value={g.items.join(", ")}
                placeholder="comma, separated, skills"
                onChange={(e) => setR((p) => ({ ...p, skills: p.skills.map((x, idx) => (idx === i ? { ...x, items: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) } : x)) }))}
              />
              <button type="button" className={btnSm} onClick={() => setR((p) => ({ ...p, skills: p.skills.filter((_, idx) => idx !== i) }))}>✕</button>
            </div>
          ))}
        </div>
      </div>

      {/* Experience + Projects (same shape) */}
      {(["experience", "projects"] as const).map((kind) => (
        <div key={kind} className={sectionCard}>
          <SectionHead title={kind === "experience" ? "Experience" : "Projects"} action={<button type="button" className={btnSm} onClick={() => addEntry(kind)}>+ Add {kind === "experience" ? "Role" : "Project"}</button>} />
          <div className="space-y-3">
            {r[kind].map((e, i) => {
              const isProj = kind === "projects";
              const main = isProj ? (e as Resume["projects"][number]).name : (e as Resume["experience"][number]).organization;
              return (
                <div key={i} className="rounded-xl border border-line bg-surface p-3">
                  <div className="grid grid-cols-2 gap-2">
                    <input className={box} value={main} placeholder={isProj ? "Project name" : "Organization"} onChange={(ev) => updateEntry(kind, i, isProj ? { name: ev.target.value } : { organization: ev.target.value })} />
                    <input className={box} value={(e as { role?: string }).role ?? ""} placeholder="Role" onChange={(ev) => updateEntry(kind, i, { role: ev.target.value })} />
                    <input className={box} value={(e as { dates?: { start?: string } }).dates?.start ?? ""} placeholder="Start (e.g. Jan 2026)" onChange={(ev) => updateEntry(kind, i, { dates: { ...(e as { dates?: object }).dates, start: ev.target.value } })} />
                    <input className={box} value={(e as { dates?: { end?: string } }).dates?.end ?? ""} placeholder="End (e.g. Present)" onChange={(ev) => updateEntry(kind, i, { dates: { ...(e as { dates?: object }).dates, end: ev.target.value } })} />
                  </div>
                  <textarea
                    className={`${box} mt-2 resize-none`}
                    rows={3}
                    placeholder="One bullet per line"
                    value={bulletsText((e as { bullets: string[] }).bullets)}
                    onChange={(ev) => updateEntry(kind, i, { bullets: parseBullets(ev.target.value) })}
                  />
                  {isProj ? (
                    <input className={`${box} mt-2`} value={(e as { link?: string }).link ?? ""} placeholder="Project link (optional)" onChange={(ev) => updateEntry(kind, i, { link: ev.target.value })} />
                  ) : null}
                  <button type="button" className={`${btnSm} mt-2`} onClick={() => removeEntry(kind, i)}>Remove</button>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Education */}
      <div className={sectionCard}>
        <SectionHead title="Education" action={<button type="button" className={btnSm} onClick={() => addEntry("education")}>+ Add</button>} />
        <div className="space-y-3">
          {r.education.map((ed, i) => (
            <div key={i} className="rounded-xl border border-line bg-surface p-3">
              <div className="grid grid-cols-2 gap-2">
                <input className={box} value={ed.institution} placeholder="Institution" onChange={(ev) => updateEntry("education", i, { institution: ev.target.value })} />
                <input className={box} value={ed.degree ?? ""} placeholder="Degree" onChange={(ev) => updateEntry("education", i, { degree: ev.target.value })} />
                <input className={box} value={ed.dates?.start ?? ""} placeholder="Start" onChange={(ev) => updateEntry("education", i, { dates: { ...ed.dates, start: ev.target.value } })} />
                <input className={box} value={ed.dates?.end ?? ""} placeholder="End" onChange={(ev) => updateEntry("education", i, { dates: { ...ed.dates, end: ev.target.value } })} />
              </div>
              <button type="button" className={`${btnSm} mt-2`} onClick={() => removeEntry("education", i)}>Remove</button>
            </div>
          ))}
        </div>
      </div>

      <SubmitButton
        loadingText="Saving…"
        className="w-full rounded-xl bg-cyan py-3 text-[14px] font-semibold text-on-accent shadow-[0_6px_18px_rgba(79,70,229,0.25)] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
      >
        ✦ Optimize &amp; Save →
      </SubmitButton>
    </form>
  );
}

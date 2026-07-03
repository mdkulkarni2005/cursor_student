import { prisma } from "@studentos/db";
import { requireAdmin } from "@/lib/admin";
import { NotAuthorized } from "@/components/not-authorized";
import { AdminShell } from "@/components/shell";
import { TemplateRow } from "./template-row";
import { createTemplate } from "./actions";

export const metadata = { title: "Templates — Admin" };

const TYPE_STYLE: Record<string, string> = {
  REPORT: "text-cyan bg-cyan/12",
  PPT: "text-indigo bg-indigo/12",
  RESUME: "text-teal bg-teal/12",
};

export default async function TemplatesPage() {
  const guard = await requireAdmin();
  if (!guard.ok) return <NotAuthorized reason={guard.reason} />;

  const [templates, institutions] = await Promise.all([
    prisma.template.findMany({
      orderBy: [{ type: "asc" }, { createdAt: "desc" }],
      include: { institution: { select: { name: true } }, _count: { select: { documents: true } } },
    }),
    prisma.institution.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <AdminShell>
      <div className="mb-5">
        <h1 className="font-display text-[24px] font-bold text-ink">Templates</h1>
        <p className="mt-1 text-[13px] text-muted">
          {templates.length} total — locked .docx/.pptx template assets the renderer fills. The AI never emits
          layout; it only fills these slots.
        </p>
      </div>

      <form action={createTemplate} className="mb-5 grid gap-2 rounded-2xl border border-line bg-card p-4 sm:grid-cols-2 lg:grid-cols-5">
        <select name="type" required className="rounded-lg border border-line bg-input px-2.5 py-2 text-[13px] text-ink">
          <option value="REPORT">Report</option>
          <option value="PPT">PPT</option>
          <option value="RESUME">Resume</option>
        </select>
        <select name="institutionId" className="rounded-lg border border-line bg-input px-2.5 py-2 text-[13px] text-ink">
          <option value="">No institution (global)</option>
          {institutions.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>
        <input
          name="name"
          placeholder="Template name"
          required
          className="rounded-lg border border-line bg-input px-3 py-2 text-[13px] text-ink placeholder:text-faint"
        />
        <input
          type="file"
          name="file"
          accept=".docx,.pptx"
          required
          className="rounded-lg border border-line bg-input px-2.5 py-1.5 text-[12.5px] text-ink file:mr-2 file:rounded-md file:border-0 file:bg-surface file:px-2 file:py-1 file:text-[11.5px]"
        />
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-[12.5px] text-soft">
            <input type="checkbox" name="isDefault" className="h-3.5 w-3.5" />
            Set as default
          </label>
          <button type="submit" className="rounded-lg bg-cyan px-3 py-2 text-[12.5px] font-semibold text-on-accent hover:opacity-90">
            Upload
          </button>
        </div>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-line bg-card">
        <table className="w-full text-left text-[12.5px]">
          <thead className="border-b border-line text-[11px] uppercase tracking-wide text-faint">
            <tr>
              {["Name", "Type", "Institution", "Default", "Used by", "Actions"].map((h) => (
                <th key={h} className="px-3 py-2.5 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {templates.map((t) => (
              <tr key={t.id} className="border-b border-line/60 last:border-0 hover:bg-surface">
                <td className="px-3 py-2.5 font-medium text-ink">{t.name}</td>
                <td className="px-3 py-2.5">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${TYPE_STYLE[t.type]}`}>{t.type}</span>
                </td>
                <td className="px-3 py-2.5 text-soft">{t.institution?.name ?? "Global"}</td>
                <td className="px-3 py-2.5">
                  {t.isDefault ? <span className="text-success">✓ default</span> : <span className="text-faint">—</span>}
                </td>
                <td className="px-3 py-2.5 text-soft">{t._count.documents} docs</td>
                <td className="px-3 py-2.5">
                  <TemplateRow id={t.id} type={t.type} institutionId={t.institutionId} isDefault={t.isDefault} />
                </td>
              </tr>
            ))}
            {templates.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-faint">
                  No templates yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}

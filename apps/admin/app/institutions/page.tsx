import { prisma } from "@studentos/db";
import { requireAdmin } from "@/lib/admin";
import { NotAuthorized } from "@/components/not-authorized";
import { AdminShell } from "@/components/shell";
import { InstitutionRow } from "./institution-row";
import { createInstitution } from "./actions";

export const metadata = { title: "Institutions — Admin" };

export default async function InstitutionsPage() {
  const guard = await requireAdmin();
  if (!guard.ok) return <NotAuthorized reason={guard.reason} />;

  const institutions = await prisma.institution.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { users: true, templates: true } } },
  });

  return (
    <AdminShell>
      <div className="mb-5">
        <h1 className="font-display text-[24px] font-bold text-ink">Institutions</h1>
        <p className="mt-1 text-[13px] text-muted">
          {institutions.length} total — colleges whose students use krackit and can have locked report/PPT/resume
          templates.
        </p>
      </div>

      <form action={createInstitution} className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-card p-4">
        <input
          name="name"
          placeholder="College name"
          required
          className="rounded-lg border border-line bg-input px-3 py-2 text-[13px] text-ink placeholder:text-faint"
        />
        <input
          name="university"
          placeholder="University (optional)"
          className="rounded-lg border border-line bg-input px-3 py-2 text-[13px] text-ink placeholder:text-faint"
        />
        <button type="submit" className="rounded-lg bg-cyan px-3 py-2 text-[12.5px] font-semibold text-on-accent hover:opacity-90">
          Add institution
        </button>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-line bg-card">
        <table className="w-full text-left text-[12.5px]">
          <thead className="border-b border-line text-[11px] uppercase tracking-wide text-faint">
            <tr>
              {["Name", "University", "Usage", "Actions"].map((h) => (
                <th key={h} className="px-3 py-2.5 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {institutions.map((i) => (
              <InstitutionRow
                key={i.id}
                id={i.id}
                name={i.name}
                university={i.university}
                userCount={i._count.users}
                templateCount={i._count.templates}
              />
            ))}
            {institutions.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-faint">
                  No institutions yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}

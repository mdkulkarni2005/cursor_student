import Link from "next/link";
import { requireRecruiter } from "@/lib/recruiter";
import { NotAuthorized } from "@/components/not-authorized";
import { RecruiterShell } from "@/components/shell";
import { listVisibleStudents, listVisibleDepartments } from "@/lib/student-profile";

export const metadata = { title: "Students — Recruiter" };

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; department?: string }>;
}) {
  const guard = await requireRecruiter();
  if (!guard.ok) return <NotAuthorized reason={guard.reason} />;

  const { q, department } = await searchParams;
  const [students, departments] = await Promise.all([
    listVisibleStudents({ department, query: q }),
    listVisibleDepartments(),
  ]);

  return (
    <RecruiterShell>
      <div className="mb-5">
        <h1 className="font-display text-[24px] font-bold text-ink">Students</h1>
        <p className="mt-1 text-[13px] text-muted">
          {students.length} student{students.length === 1 ? "" : "s"}
          {department ? ` in "${department}"` : ""}. Use the filters below to narrow by branch or name.
        </p>
      </div>

      <form className="mb-5 flex flex-wrap items-center gap-3">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search by name…"
          className="w-full max-w-[320px] rounded-xl border border-line-strong bg-input px-3.5 py-2.5 text-[13.5px] text-ink placeholder:text-faint"
        />
        <select
          name="department"
          defaultValue={department ?? ""}
          className="rounded-xl border border-line-strong bg-input px-3.5 py-2.5 text-[13.5px] text-ink"
        >
          <option value="">All branches</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-xl bg-cyan px-4 py-2.5 text-[13px] font-semibold text-on-accent">
          Apply
        </button>
      </form>

      {students.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-card p-10 text-center text-[13.5px] text-muted">
          No matching students yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {students.map((s) => (
            <Link
              key={s.id}
              href={`/students/${s.id}`}
              className="rounded-2xl border border-line bg-card p-5 transition-all hover:-translate-y-1 hover:border-cyan/40"
            >
              <p className="text-[15px] font-semibold text-ink">{s.name}</p>
              <p className="mt-1 text-[12.5px] text-muted">
                {s.careerGoal ?? "Student"}
                {s.department ? ` · ${s.department}` : ""}
              </p>
              {s.institution ? <p className="mt-0.5 text-[11.5px] text-faint">{s.institution}</p> : null}
              <div className="mt-3 flex items-center gap-2 text-[11px] font-semibold text-cyan">
                <span className="rounded-full bg-cyan/10 px-2 py-0.5">{s.dsaSolved} DSA solved</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </RecruiterShell>
  );
}

import { AppShell } from "@/components/app-shell";
import { requireOnboardedUser, shellUserFrom } from "@/lib/user";
import { ProfilerWorkspace } from "@/components/csv-profiler/profiler-workspace";

export default async function CsvProfilerPage() {
  const user = await requireOnboardedUser();

  return (
    <AppShell user={await shellUserFrom(user)}>
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted">Data Science</p>
          <h1 className="mt-1 font-display text-[22px] font-bold leading-tight text-ink">CSV Auto-Profiler</h1>
          <p className="mt-1 text-[13px] text-soft">
            Upload any CSV and instantly get per-column stats, missing-value rates, distributions, and a correlation heatmap.
          </p>
        </div>

        <ProfilerWorkspace />
      </div>
    </AppShell>
  );
}

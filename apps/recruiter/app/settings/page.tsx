import { requireRecruiter } from "@/lib/recruiter";
import { NotAuthorized } from "@/components/not-authorized";
import { RecruiterShell } from "@/components/shell";
import { SettingsForm } from "./settings-form";

export const metadata = { title: "Settings — Recruiter" };

export default async function SettingsPage() {
  const guard = await requireRecruiter();
  if (!guard.ok) return <NotAuthorized reason={guard.reason} />;

  return (
    <RecruiterShell>
      <div className="mb-5">
        <h1 className="font-display text-[24px] font-bold text-ink">Settings</h1>
        <p className="mt-1 text-[13px] text-muted">
          Update the industry you hire for — this was set once during onboarding and can be changed anytime.
        </p>
      </div>

      <SettingsForm initialIndustry={guard.recruiter.industry ?? ""} />
    </RecruiterShell>
  );
}

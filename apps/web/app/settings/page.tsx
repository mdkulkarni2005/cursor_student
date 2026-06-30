import { AppShell } from "@/components/app-shell";
import { requireOnboardedUser, shellUserFrom } from "@/lib/user";
import { SettingsView } from "@/components/settings/settings-view";

export const metadata = { title: "Settings — Vidyas OS" };

const PLAN_LABEL: Record<string, string> = { FREE: "Free", PRO: "Pro", PREMIUM: "Premium" };

export default async function SettingsPage() {
  const user = await requireOnboardedUser();
  const plan = PLAN_LABEL[user.plan] ?? "Free";

  return (
    <AppShell user={shellUserFrom(user)}>
      <div className="mx-auto max-w-[1180px]">
        <header className="mb-10">
          <h1 className="font-display text-[30px] font-semibold tracking-tight text-ink">Settings</h1>
          <p className="mt-2 text-[14px] text-muted">Manage your profile, plan and account.</p>
        </header>
        <SettingsView
          data={{
            name: user.name ?? "Student",
            email: user.email,
            department: user.department,
            semester: user.semester,
            careerGoal: user.careerGoal,
            plan,
            creditsLimit: user.plan === "FREE" ? 50 : null,
          }}
        />
      </div>
    </AppShell>
  );
}

import { AppShell } from "@/components/app-shell";
import { requireOnboardedUser, shellUserFrom } from "@/lib/user";
import { quotaStatus } from "@/lib/entitlements";
import { SettingsView } from "@/components/settings/settings-view";

export const metadata = { title: "Settings — Vidyas OS" };

const PLAN_LABEL: Record<string, string> = { FREE: "Free", PRO: "Pro", PREMIUM: "Premium" };

export default async function SettingsPage() {
  const user = await requireOnboardedUser();
  const plan = PLAN_LABEL[user.plan] ?? "Free";

  // Intelligence Pulse — generations used vs monthly allowance (moved off the dashboard).
  const [assignmentQ, reportQ, pptQ] = await Promise.all([
    quotaStatus(user, "ASSIGNMENT"),
    quotaStatus(user, "REPORT"),
    quotaStatus(user, "PPT"),
  ]);
  const used = assignmentQ.used + reportQ.used + pptQ.used;
  const limits = [assignmentQ.limit, reportQ.limit, pptQ.limit];
  const unlimited = limits.some((l) => l === null);
  const totalLimit = unlimited ? null : limits.reduce<number>((a, b) => a + (b ?? 0), 0);

  return (
    <AppShell user={await shellUserFrom(user)}>
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
            usage: { used, limit: totalLimit },
          }}
        />
      </div>
    </AppShell>
  );
}

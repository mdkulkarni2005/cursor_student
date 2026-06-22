import { AppShell } from "@/components/app-shell";
import { ComingSoon } from "@/components/coming-soon";
import { requireOnboardedUser, shellUserFrom } from "@/lib/user";

const PLAN_LABEL: Record<string, string> = { FREE: "Free", PRO: "Pro", PREMIUM: "Premium" };

export default async function PlansPage() {
  const user = await requireOnboardedUser();
  const plan = PLAN_LABEL[user.plan] ?? "Free";
  return (
    <AppShell user={shellUserFrom(user)}>
      <ComingSoon
        title="Plans & Billing"
        description={`You're on the ${plan} plan. Paid upgrades aren't open yet — StudentOS is free while we're in early testing.`}
        bullets={[
          "Free plan: a few reports, PPTs and assignments every month",
          "Higher limits and priority generation are on the way",
          "No card needed today — just build",
        ]}
      />
    </AppShell>
  );
}

import { prisma } from "@studentos/db";
import type { UsageKind } from "@studentos/db";
import { AppShell } from "@/components/app-shell";
import { requireOnboardedUser, shellUserFrom } from "@/lib/user";
import { getActivePlanTier, quotaStatus, creditStatus } from "@/lib/entitlements";
import { SettingsView, type UsageRow } from "@/components/settings/settings-view";

export const metadata = { title: "Settings — krackit" };

const USAGE_LABEL: Record<UsageKind, string> = {
  ASSIGNMENT: "Assignments",
  REPORT: "Reports",
  PPT: "PPTs",
  LAB_REPORT: "Lab reports",
  BRANCH_SOLVER: "Branch-solver tools",
  INTERVIEW: "Mock interviews",
  DSA: "DSA submissions",
  SYSTEM_DESIGN: "System design reviews",
};

// Document-generation kinds are student-only tools (nav-gated); professionals only ever get
// interview + DSA quotas, per apps/web/components/app-shell.tsx.
const STUDENT_KINDS: UsageKind[] = ["ASSIGNMENT", "REPORT", "LAB_REPORT", "PPT", "BRANCH_SOLVER", "INTERVIEW", "DSA", "SYSTEM_DESIGN"];
const PROFESSIONAL_KINDS: UsageKind[] = ["INTERVIEW", "DSA"];

export default async function SettingsPage() {
  const user = await requireOnboardedUser();
  const institution = user.institutionId
    ? await prisma.institution.findUnique({ where: { id: user.institutionId }, select: { name: true } })
    : null;

  const activeTier = await getActivePlanTier(user);
  // activeTier.id is "fallback-unlimited" when no PlanTier rows exist yet for this audience —
  // that's not a real DB row, so skip the lookup rather than querying for a row that can't exist.
  const tierRow =
    activeTier.id === "fallback-unlimited"
      ? null
      : await prisma.planTier.findUnique({ where: { id: activeTier.id }, select: { name: true, priceCents: true, currency: true, billingPeriod: true } });
  const planName = tierRow?.name ?? "Free";

  const kinds = user.userType === "PROFESSIONAL" ? PROFESSIONAL_KINDS : STUDENT_KINDS;
  const [statuses, credits] = await Promise.all([
    Promise.all(kinds.map((kind) => quotaStatus(user, kind))),
    creditStatus(user),
  ]);
  const usage: UsageRow[] = kinds.map((kind, i) => ({ label: USAGE_LABEL[kind], ...statuses[i] }));

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
            college: institution?.name ?? null,
            careerGoal: user.careerGoal,
            userType: user.userType,
            companyName: user.companyName,
            jobTitle: user.jobTitle,
            yearsOfExperience: user.yearsOfExperience,
            github: user.githubUrl,
            codingEnabled: user.codingEnabled,
            linkedin: user.linkedin,
            gpa: user.gpa,
            plan: planName,
            priceCents: tierRow?.priceCents ?? null,
            currency: tierRow?.currency ?? "INR",
            billingPeriod: tierRow?.billingPeriod ?? "monthly",
            usage,
            credits,
          }}
        />
      </div>
    </AppShell>
  );
}

import { prisma } from "@studentos/db";
import { AppShell } from "@/components/app-shell";
import { requireOnboardedUser, shellUserFrom } from "@/lib/user";
import { SupportForm } from "@/components/support/support-form";
import { HelpIcon } from "@/components/icons";

export const metadata = { title: "Support — krackit" };

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

const STATUS_STYLE: Record<string, string> = {
  OPEN: "text-warning bg-warning/12",
  IN_PROGRESS: "text-cyan bg-cyan/12",
  RESOLVED: "text-success bg-success/12",
  CLOSED: "text-muted bg-surface",
};

function fmtDateTime(d: Date): string {
  return new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default async function SupportPage() {
  const user = await requireOnboardedUser();

  const tickets = await prisma.supportTicket.findMany({
    where: { studentId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <AppShell user={await shellUserFrom(user)}>
      <div className="mx-auto max-w-[760px]">
        <header className="mb-6">
          <h1 className="font-display text-[26px] font-bold text-ink">Support</h1>
          <p className="mt-1 text-[13.5px] text-muted">Raise a ticket for any issue — an admin will review and act on it.</p>
        </header>

        <div className="mb-8">
          <SupportForm />
        </div>

        <h2 className="mb-3 font-display text-[15px] font-semibold text-ink">Your tickets</h2>
        {tickets.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line bg-card p-12 text-center">
            <HelpIcon size={28} className="text-faint" />
            <p className="text-[13.5px] text-muted">No tickets yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {tickets.map((t) => (
              <div key={t.id} className="rounded-2xl border border-line bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[14px] font-semibold text-ink">{t.subject}</p>
                    <p className="mt-0.5 text-[11px] text-faint">{fmtDateTime(t.createdAt)}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLE[t.status]}`}>
                    {STATUS_LABEL[t.status]}
                  </span>
                </div>
                <p className="mt-2.5 whitespace-pre-wrap text-[13.5px] text-soft">{t.message}</p>
                {t.adminNote ? (
                  <div className="mt-3 rounded-xl border border-cyan/20 bg-cyan/[0.06] px-3 py-2">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-cyan">Admin response</p>
                    <p className="mt-0.5 text-[12.5px] text-soft">{t.adminNote}</p>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

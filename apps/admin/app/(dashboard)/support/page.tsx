import { prisma } from "@studentos/db";
import { requireAdmin } from "@/lib/admin";
import { NotAuthorized } from "@/components/not-authorized";
import { TicketRow } from "./ticket-row";

export const metadata = { title: "Support — Admin" };

// OPEN/IN_PROGRESS first so tickets needing attention float to the top; RESOLVED/CLOSED sink.
const STATUS_RANK: Record<string, number> = { OPEN: 0, IN_PROGRESS: 1, RESOLVED: 2, CLOSED: 3 };

export default async function SupportPage() {
  const guard = await requireAdmin();
  if (!guard.ok) return <NotAuthorized reason={guard.reason} />;

  const tickets = await prisma.supportTicket.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      student: { select: { id: true, name: true, email: true } },
      recruiter: { select: { id: true, name: true, companyName: true, email: true } },
    },
  });

  tickets.sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status]);

  const openCount = tickets.filter((t) => t.status === "OPEN" || t.status === "IN_PROGRESS").length;

  return (
    <>
      <div className="mb-5">
        <h1 className="font-display text-[26px] font-bold text-ink">Support</h1>
        <p className="mt-1 text-[15px] text-muted">
          {openCount} ticket{openCount === 1 ? "" : "s"} needing attention, out of {tickets.length} total. Raised by
          students and recruiters — open the linked account to take corrective action (suspend, reset quota,
          approve/reject, etc.), then record the outcome here.
        </p>
      </div>

      {tickets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-card p-10 text-center text-[15px] text-faint">
          No support tickets yet.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {tickets.map((t) => {
            const from =
              t.requesterType === "STUDENT"
                ? `${t.student?.name ?? "Student"} · ${t.student?.email ?? "—"}`
                : `${t.recruiter?.companyName ?? t.recruiter?.name ?? "Recruiter"} · ${t.recruiter?.email ?? "—"}`;
            const correctiveActionHref = t.studentId ? `/users/${t.studentId}` : t.recruiterId ? "/recruiters" : null;
            return (
              <TicketRow
                key={t.id}
                id={t.id}
                from={from}
                correctiveActionHref={correctiveActionHref}
                subject={t.subject}
                message={t.message}
                status={t.status}
                adminNote={t.adminNote}
                createdAt={t.createdAt}
              />
            );
          })}
        </div>
      )}
    </>
  );
}

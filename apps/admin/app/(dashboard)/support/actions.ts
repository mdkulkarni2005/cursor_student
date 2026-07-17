"use server";

import { revalidatePath } from "next/cache";
import { SupportTicketStatus, prisma } from "@studentos/db";
import { requireAdmin } from "@/lib/admin";
import { logAdminAction } from "@/lib/audit";

const STATUS_VALUES = new Set(Object.values(SupportTicketStatus));

/**
 * Updates a ticket's status and/or admin-visible response note. The actual "corrective action"
 * (suspend the user, reset their quota, approve/reject a recruiter, …) happens via the existing
 * admin tools on that user's/recruiter's own page — this just records the ticket's outcome.
 */
export async function updateTicket(id: string, status: string, adminNote: string): Promise<void> {
  const guard = await requireAdmin();
  if (!guard.ok) throw new Error("Not authorized");
  if (!STATUS_VALUES.has(status as SupportTicketStatus)) throw new Error("Invalid status");

  const before = await prisma.supportTicket.findUnique({ where: { id }, select: { status: true, adminNote: true } });

  await prisma.supportTicket.update({
    where: { id },
    data: {
      status: status as SupportTicketStatus,
      adminNote: adminNote.trim() || null,
      resolvedAt: status === "RESOLVED" || status === "CLOSED" ? new Date() : null,
    },
  });

  await logAdminAction({
    action: "support.ticket.update",
    targetType: "supportTicket",
    targetId: id,
    before,
    after: { status, adminNote: adminNote.trim() || null },
  });

  revalidatePath("/support");
}

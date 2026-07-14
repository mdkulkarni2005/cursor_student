import { escapeHtml } from "../escape";

/**
 * Pure string builder — no I/O. Sent to the recruiter whenever the student takes an action on a
 * proposed interview (accept / decline / propose a different time) — the recruiter has no other
 * way to find out short of re-checking the /interviews list themselves.
 */
export function interviewResponseEmail(opts: {
  recruiterName: string;
  studentName: string;
  action: "ACCEPTED" | "DECLINED" | "RESCHEDULE_REQUESTED";
  proposedAt: Date;
  studentNote?: string | null;
  interviewLink: string;
}): { subject: string; html: string; text: string } {
  const when = opts.proposedAt.toLocaleString("en-IN", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  });

  const ACTION_LABEL: Record<typeof opts.action, string> = {
    ACCEPTED: "accepted",
    DECLINED: "declined",
    RESCHEDULE_REQUESTED: "asked to reschedule",
  };
  const label = ACTION_LABEL[opts.action];

  const subject = `${opts.studentName} ${label} the interview — ${when}`;

  const text = `Hi ${opts.recruiterName},

${opts.studentName} has ${label} the interview you proposed for ${when}.
${opts.studentNote ? `\nTheir note: ${opts.studentNote}\n` : ""}
View the interview:
${opts.interviewLink}`;

  const html = `<p>Hi ${escapeHtml(opts.recruiterName)},</p>
<p><strong>${escapeHtml(opts.studentName)}</strong> has ${label} the interview you proposed for <strong>${when}</strong>.</p>
${opts.studentNote ? `<p>Their note: ${escapeHtml(opts.studentNote)}</p>` : ""}
<p><a href="${opts.interviewLink}">${opts.interviewLink}</a></p>`;

  return { subject, html, text };
}

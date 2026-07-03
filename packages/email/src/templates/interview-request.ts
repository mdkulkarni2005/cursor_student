/** Pure string builder — no I/O. Sent when a recruiter first proposes an interview slot. */
export function interviewRequestEmail(opts: {
  studentName: string;
  recruiterCompany?: string | null;
  proposedAt: Date;
  note?: string | null;
  messagesLink: string;
}): { subject: string; html: string; text: string } {
  const when = opts.proposedAt.toLocaleString("en-IN", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  });
  const who = opts.recruiterCompany ? ` from ${opts.recruiterCompany}` : "";

  const subject = `New interview request${who} — ${when}`;

  const text = `Hi ${opts.studentName},

You have a new interview request${who} for ${when}.
${opts.note ? `\nNote: ${opts.note}\n` : ""}
Accept, decline, or suggest another time here:
${opts.messagesLink}`;

  const html = `<p>Hi ${opts.studentName},</p>
<p>You have a new interview request${who} for <strong>${when}</strong>.</p>
${opts.note ? `<p>Note: ${opts.note}</p>` : ""}
<p>Accept, decline, or suggest another time here:</p>
<p><a href="${opts.messagesLink}">${opts.messagesLink}</a></p>`;

  return { subject, html, text };
}

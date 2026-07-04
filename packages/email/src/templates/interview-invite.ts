/** Pure string builder — no I/O. Sent when a recruiter's proposed interview slot is accepted. */
export function interviewInviteEmail(opts: {
  studentName: string;
  recruiterCompany?: string | null;
  proposedAt: Date;
  joinLink: string;
}): { subject: string; html: string; text: string } {
  const when = opts.proposedAt.toLocaleString("en-IN", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  });
  const who = opts.recruiterCompany ? ` with ${opts.recruiterCompany}` : "";

  const subject = `Your interview${who} is confirmed — ${when}`;

  const text = `Hi ${opts.studentName},

Your real interview${who} is confirmed for ${when}.

Join right from your browser — camera and microphone required:
${opts.joinLink}

Good luck!`;

  const html = `<p>Hi ${opts.studentName},</p>
<p>Your real interview${who} is confirmed for <strong>${when}</strong>.</p>
<p>Join right from your browser — camera and microphone required.</p>
<p><a href="${opts.joinLink}">${opts.joinLink}</a></p>
<p>Good luck!</p>`;

  return { subject, html, text };
}

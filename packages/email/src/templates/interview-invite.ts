/** Pure string builder — no I/O. Sent when a recruiter's proposed interview slot is accepted. */
export function interviewInviteEmail(opts: {
  studentName: string;
  recruiterCompany?: string | null;
  proposedAt: Date;
  installLink: string;
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

Real interviews run through the StudentOS desktop app. Install it here before your interview time:
${opts.installLink}

Good luck!`;

  const html = `<p>Hi ${opts.studentName},</p>
<p>Your real interview${who} is confirmed for <strong>${when}</strong>.</p>
<p>Real interviews run through the StudentOS desktop app. Install it before your interview time:</p>
<p><a href="${opts.installLink}">${opts.installLink}</a></p>
<p>Good luck!</p>`;

  return { subject, html, text };
}

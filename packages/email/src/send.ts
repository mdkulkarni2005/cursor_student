/**
 * Transactional email via Resend. EMAIL_DRIVER=stub (or a missing RESEND_API_KEY) logs the send
 * instead of calling the provider — no account needed for local dev.
 *
 * NEVER throws: an email hiccup must never block the caller's primary action (ground rule —
 * never show the user a failure). Callers should fire-and-forget this and swallow the result.
 */
const useStub = () => process.env.EMAIL_DRIVER === "stub" || !process.env.RESEND_API_KEY;

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export type SendEmailResult = {
  ok: boolean;
  id?: string;
  stub?: boolean;
};

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  if (useStub()) {
    console.log(`[email:stub] to=${input.to} subject="${input.subject}"`);
    return { ok: true, stub: true };
  }
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM ?? "StudentOS <notifications@studentos.app>",
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    if (error) {
      console.error("[email] resend error", error);
      return { ok: false };
    }
    return { ok: true, id: data?.id };
  } catch (err) {
    console.error("[email] send failed", err);
    return { ok: false };
  }
}

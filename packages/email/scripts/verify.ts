/**
 * Verification for the transactional email layer.
 *
 * Stub-mode checks need NO Resend account and always run: sendEmail never throws, returns
 * {ok:true, stub:true} when EMAIL_DRIVER=stub or no RESEND_API_KEY is set, and the interview-invite
 * template renders all fields without I/O.
 *
 * A real Resend send is intentionally NOT attempted here — this only proves the seam, not
 * deliverability (matches the plan's explicit scope note).
 *
 *   pnpm --filter @studentos/email verify
 */
import assert from "node:assert";
import { sendEmail, interviewInviteEmail } from "../src/index";

let pass = 0;
function ok(name: string, cond: boolean, extra = "") {
  assert(cond, `FAILED: ${name} ${extra}`);
  console.log(`  ✓ ${name}${extra ? `  (${extra})` : ""}`);
  pass++;
}

async function stubChecks() {
  delete process.env.RESEND_API_KEY;
  process.env.EMAIL_DRIVER = "stub";

  const result = await sendEmail({ to: "student@example.com", subject: "Test", html: "<p>hi</p>" });
  ok("stub: sendEmail returns ok+stub", result.ok === true && result.stub === true);

  // No RESEND_API_KEY at all (EMAIL_DRIVER unset) should ALSO fall back to stub — fail closed on
  // missing config rather than throwing/crashing the caller.
  delete process.env.EMAIL_DRIVER;
  const noKeyResult = await sendEmail({ to: "student@example.com", subject: "Test", html: "<p>hi</p>" });
  ok("no RESEND_API_KEY → falls back to stub (never throws)", noKeyResult.ok === true && noKeyResult.stub === true);
}

function templateChecks() {
  const { subject, html, text } = interviewInviteEmail({
    studentName: "Asha",
    recruiterCompany: "Acme Corp",
    proposedAt: new Date("2026-07-10T09:30:00Z"),
    installLink: "https://studentos.app/real-interview",
  });
  ok("template: subject mentions company", subject.includes("Acme Corp"));
  ok("template: html contains student name", html.includes("Asha"));
  ok("template: html contains install link", html.includes("https://studentos.app/real-interview"));
  ok("template: text version also renders", text.includes("Asha") && text.includes("Acme Corp"));

  const noCompany = interviewInviteEmail({
    studentName: "Rahul",
    proposedAt: new Date(),
    installLink: "https://studentos.app/real-interview",
  });
  ok("template: no company still renders cleanly", !noCompany.subject.includes("with undefined"));
}

async function main() {
  console.log("Email verification\n");

  console.log("Stub mode (no Resend account needed):");
  await stubChecks();

  console.log("\nTemplate rendering:");
  templateChecks();

  console.log(`\n✅ ${pass} checks passed.`);
  console.log("\nNote: real Resend delivery is NOT verified here — set RESEND_API_KEY and send manually to confirm deliverability.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("\n❌", e.message);
    process.exit(1);
  });

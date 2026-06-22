import { LegalShell, LegalSection } from "@/components/legal-shell";

export const metadata = { title: "Terms of Service — StudentOS" };

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Service" updated="June 2026">
      <p>
        These terms govern your use of StudentOS. By creating an account you agree to them and to our{" "}
        <a href="/privacy" className="text-cyan hover:underline">Privacy Policy</a>.
      </p>

      <LegalSection heading="1. Your account">
        <p>You must give accurate onboarding details and keep your login secure. You are responsible for activity
          under your account. One account per person.</p>
      </LegalSection>

      <LegalSection heading="2. Acceptable use — academic integrity">
        <p>StudentOS is a study and productivity aid. You are responsible for how you use its output and for
          following your institution&apos;s academic-integrity rules. Do not use the app to cheat where prohibited,
          to break the law, to abuse or overload the service, or to attempt to manipulate or jailbreak the AI
          (including the interview evaluator).</p>
      </LegalSection>

      <LegalSection heading="3. Your content &amp; AI output">
        <p>You keep ownership of the inputs you provide. You receive the AI-generated output for your own use. AI
          output may contain errors, outdated facts, or unintended similarity to existing work — <b>you must review
          and verify it</b> before submitting or relying on it. We are not responsible for academic, professional,
          or other outcomes from using the output.</p>
      </LegalSection>

      <LegalSection heading="4. Plans, limits &amp; payments">
        <p>Free accounts have monthly usage limits. Paid plans (when available) unlock higher limits and are billed
          through our payment processor. Fees are non-refundable except where required by law. We may change plans
          or pricing with notice.</p>
      </LegalSection>

      <LegalSection heading="5. Availability &amp; changes">
        <p>We may add, change, or remove features, and the service may occasionally be unavailable. We&apos;ll try to
          minimise disruption but don&apos;t guarantee uninterrupted access.</p>
      </LegalSection>

      <LegalSection heading="6. Termination">
        <p>You may stop using the app and delete your account anytime. We may suspend or terminate accounts that
          violate these terms or abuse the service.</p>
      </LegalSection>

      <LegalSection heading="7. Disclaimer &amp; liability">
        <p>The service is provided &ldquo;as is&rdquo; without warranties. To the extent permitted by law, our
          liability is limited, and we are not liable for indirect or consequential losses.</p>
      </LegalSection>

      <LegalSection heading="8. Governing law">
        <p>These terms are governed by the laws of India. Contact us via the support email on our site with any
          questions.</p>
      </LegalSection>
    </LegalShell>
  );
}

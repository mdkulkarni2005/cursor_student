import { LegalShell, LegalSection } from "@/components/legal-shell";

export const metadata = { title: "Privacy Policy — krackit" };

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" updated="June 2026">
      <p>
        krackit (&ldquo;we&rdquo;, &ldquo;the app&rdquo;) helps students generate academic work and prepare for
        interviews. This policy explains what we collect, why, and your choices. By creating an account you agree to
        this policy and our <a href="/terms" className="text-cyan hover:underline">Terms</a>.
      </p>

      <LegalSection heading="1. What we collect">
        <p>• <b>Account &amp; profile:</b> your name, email (via Clerk), and the academic details you give us at
          onboarding — department, semester, college, and feature preferences.</p>
        <p>• <b>Your content:</b> what you create or upload — report/PPT/resume/assignment inputs and outputs,
          project ideas, interview answers and code, DSA submissions, and chat messages with the AI assistant.</p>
        <p>• <b>Usage:</b> which features you use and basic activity (e.g. when you last opened the app) to run
          quotas and improve the product.</p>
      </LegalSection>

      <LegalSection heading="2. How we use it">
        <p>We use your data to generate your documents and answers, ground the AI in your academic context, enforce
          plan limits, secure the service, and improve features. We do <b>not</b> sell your personal data.</p>
      </LegalSection>

      <LegalSection heading="3. AI processing">
        <p>To produce your content we send the relevant inputs to AI providers through the Vercel AI Gateway
          (e.g. Anthropic, Google). Your code may run in an isolated sandbox to check that it works. Providers
          process this to return a result; we choose providers that do not train on paid API data. AI output can be
          imperfect — review it before relying on it.</p>
      </LegalSection>

      <LegalSection heading="4. Storage &amp; security">
        <p>Account data is stored in our database (Neon Postgres); files in object storage (Cloudflare R2);
          authentication is handled by Clerk. We apply reasonable safeguards, but no system is perfectly secure.</p>
      </LegalSection>

      <LegalSection heading="5. Sharing">
        <p>We share data only with the processors that run the service (auth, database, storage, AI gateway,
          payments), or where required by law. If you publish a profile link in future, only what you choose to
          include there becomes visible to people you share it with.</p>
      </LegalSection>

      <LegalSection heading="6. Your rights">
        <p>You can view and edit your profile and content in the app. You can request a copy of your data or
          deletion of your account by contacting us; deleting your account removes your personal data and content,
          subject to limited records we must keep.</p>
      </LegalSection>

      <LegalSection heading="7. Children">
        <p>The app is intended for college students. If you are below the age of digital consent in your region,
          use it only with a parent or guardian&apos;s permission.</p>
      </LegalSection>

      <LegalSection heading="8. Changes &amp; contact">
        <p>We may update this policy; material changes will be notified in-app. Questions or data requests:
          reach us at the support email listed on our site.</p>
      </LegalSection>
    </LegalShell>
  );
}

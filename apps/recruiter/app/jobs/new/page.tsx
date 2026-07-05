import { requireRecruiter } from "@/lib/recruiter";
import { NotAuthorized } from "@/components/not-authorized";
import { RecruiterShell } from "@/components/shell";
import { PostingForm } from "./posting-form";

export const metadata = { title: "New job posting — Recruiter" };

export default async function NewJobPostingPage() {
  const guard = await requireRecruiter();
  if (!guard.ok) return <NotAuthorized reason={guard.reason} />;

  return (
    <RecruiterShell>
      <div className="mb-5">
        <h1 className="font-display text-[24px] font-bold text-ink">New job posting</h1>
        <p className="mt-1 text-[13px] text-muted">
          Once created, use &ldquo;Find candidates&rdquo; to have AI rank visible students against this JD.
        </p>
      </div>
      <PostingForm />
    </RecruiterShell>
  );
}

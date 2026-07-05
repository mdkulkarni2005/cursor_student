"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProfileLinks } from "@/lib/actions/profile-links";

const fieldBox =
  "w-full rounded-xl border border-line-strong bg-surface px-3.5 py-2.5 text-[13.5px] text-ink outline-none transition-colors focus:border-cyan/50";

/**
 * Shown on /profile when a user (onboarded before GitHub/LinkedIn were required) is missing
 * either field — required to generate a /u/[handle] link. See apps/web/lib/actions/profile.ts.
 */
export function SocialLinksForm({ initialGithub, initialLinkedin, initialGpa }: {
  initialGithub: string | null;
  initialLinkedin: string | null;
  initialGpa: number | null;
}) {
  const router = useRouter();
  const [github, setGithub] = useState(initialGithub ?? "");
  const [linkedin, setLinkedin] = useState(initialLinkedin ?? "");
  const [gpa, setGpa] = useState(initialGpa != null ? String(initialGpa) : "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    start(async () => {
      const result = await updateProfileLinks({
        github,
        linkedin,
        gpa: gpa.trim() ? Number(gpa) : null,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="mb-6 rounded-2xl border border-cyan/25 bg-cyan/[0.04] p-5">
      <h3 className="text-[14px] font-semibold text-ink">Complete your profile</h3>
      <p className="mt-1 text-[12.5px] text-muted">GitHub and LinkedIn are required before you can share your profile link.</p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <input value={github} onChange={(e) => setGithub(e.target.value)} placeholder="github.com/yourname" className={fieldBox} />
        <input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="linkedin.com/in/yourname" className={fieldBox} />
        <input value={gpa} onChange={(e) => setGpa(e.target.value)} type="number" min={0} max={10} step="0.01" placeholder="GPA (optional)" className={fieldBox} />
      </div>

      {error ? <p className="mt-3 text-[12.5px] text-danger">{error}</p> : null}
      {saved ? <p className="mt-3 text-[12.5px] text-teal">Saved.</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-4 rounded-xl bg-cyan px-5 py-2.5 text-[13px] font-semibold text-on-accent disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}

import { AppShell } from "@/components/app-shell";
import { ComingSoon } from "@/components/coming-soon";
import { requireOnboardedUser, shellUserFrom } from "@/lib/user";

export default async function ProfilePage() {
  const user = await requireOnboardedUser();
  return (
    <AppShell user={shellUserFrom(user)}>
      <ComingSoon
        title="Your public profile link"
        description="A shareable page that showcases your projects, resume, and skills — one link for placements and LinkedIn."
        bullets={[
          "A clean public URL you can put on your resume",
          "Auto-built from your projects and resume",
          "You choose exactly what's visible",
        ]}
      />
    </AppShell>
  );
}

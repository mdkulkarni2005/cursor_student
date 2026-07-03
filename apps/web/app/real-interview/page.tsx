import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { requireOnboardedUser, shellUserFrom } from "@/lib/user";
import { joinableRealInterviews } from "@/lib/real-interview";
import { JoinRoomPanel } from "@/components/real-interview/join-room-panel";

export default async function RealInterviewPage() {
  const user = await requireOnboardedUser();

  // Defense in depth — don't trust nav visibility as the real access gate, re-check here.
  const interviews = await joinableRealInterviews(user.id);
  if (interviews.length === 0) redirect("/messages");

  return (
    <AppShell user={await shellUserFrom(user)}>
      <div className="mx-auto max-w-[720px]">
        <div className="mb-6">
          <h1 className="font-display text-[30px] font-semibold tracking-tight text-ink">Real Interview</h1>
          <p className="mt-1 text-[14px] text-muted">
            A recruiter has an interview scheduled with you. Join when you&apos;re ready.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {interviews.map((iv) => (
            <div key={iv.id} className="rounded-2xl border border-line bg-card p-5">
              <div className="mb-3">
                <p className="text-[14.5px] font-semibold text-ink">
                  {iv.recruiter.companyName ?? "Recruiter"} interview
                </p>
                <p className="mt-1 text-[12.5px] text-muted">
                  {new Date(iv.proposedAt).toLocaleString("en-IN", { dateStyle: "full", timeStyle: "short", timeZone: "Asia/Kolkata" })}
                </p>
              </div>
              <JoinRoomPanel scheduleId={iv.id} />
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

import Link from "next/link";
import { prisma } from "@studentos/db";
import { AppShell } from "@/components/app-shell";
import { requireOnboardedUser, shellUserFrom } from "@/lib/user";
import { generateVivaAction } from "@/lib/actions/viva";
import { SlidesIcon, PencilIcon } from "@/components/icons";
import { SubmitButton } from "@/components/ui/button";

const TYPE_LABEL: Record<string, string> = { REPORT: "Report", PPT: "PPT", ASSIGNMENT: "Assignment" };

export default async function VivaPage() {
  const user = await requireOnboardedUser();
  const docs = await prisma.document.findMany({
    where: {
      ownerId: user.id,
      type: { in: ["REPORT", "PPT", "ASSIGNMENT"] },
      status: "READY",
    },
    orderBy: { createdAt: "desc" },
    take: 40,
    include: { viva: true },
  });

  return (
    <AppShell user={shellUserFrom(user)}>
      <div className="mx-auto max-w-[760px]">
        <h1 className="font-display text-[22px] font-bold text-ink">Viva Preparation</h1>
        <p className="mb-6 mt-1.5 text-[14px] text-muted">
          Pick anything you&apos;ve made — we generate the questions a panel is most likely to ask,
          with model answers.
        </p>

        {docs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line-strong bg-card p-10 text-center">
            <p className="text-[14px] text-muted">Nothing to prepare from yet.</p>
            <p className="mt-1 text-[12.5px] text-faint">
              Generate a report, PPT or assignment first, then come back here.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {docs.map((d) => {
              const Icon = d.type === "ASSIGNMENT" ? PencilIcon : SlidesIcon;
              return (
                <div
                  key={d.id}
                  className="flex items-center gap-3.5 rounded-xl border border-line bg-card p-3.5"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo/12">
                    <Icon size={19} className="text-indigo" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-ink">{d.title}</p>
                    <p className="text-[12px] text-faint">{TYPE_LABEL[d.type] ?? d.type}</p>
                  </div>
                  {d.viva ? (
                    <Link
                      href={`/viva/${d.id}`}
                      className="shrink-0 rounded-lg border border-cyan/35 bg-cyan/10 px-3.5 py-1.5 text-[12.5px] font-semibold text-cyan transition-colors hover:bg-cyan/20"
                    >
                      View viva →
                    </Link>
                  ) : (
                    <form action={generateVivaAction}>
                      <input type="hidden" name="sourceId" value={d.id} />
                      <SubmitButton
                        loadingText="Generating…"
                        className="shrink-0 rounded-lg bg-accent-gradient px-3.5 py-1.5 text-[12.5px] font-semibold text-on-accent transition-transform hover:-translate-y-0.5 disabled:opacity-60"
                      >
                        Generate viva
                      </SubmitButton>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}

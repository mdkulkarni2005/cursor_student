import Link from "next/link";
import { prisma } from "@studentos/db";
import { AppShell } from "@/components/app-shell";
import { requireOnboardedUser, shellUserFrom } from "@/lib/user";
import { getOrCreateCurrentWorkspace } from "@/lib/workspace";
import { DocumentRow } from "@/components/document-row";

const GROUP_ORDER: { type: string; label: string }[] = [
  { type: "REPORT", label: "Reports" },
  { type: "PPT", label: "Presentations" },
  { type: "ASSIGNMENT", label: "Assignments" },
  { type: "PROJECT", label: "Projects" },
  { type: "VIVA", label: "Viva prep" },
];

export default async function WorkspacePage() {
  const user = await requireOnboardedUser();
  const workspace = await getOrCreateCurrentWorkspace(user);

  const docs = await prisma.document.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: "desc" },
  });

  const byType = new Map<string, typeof docs>();
  for (const d of docs) {
    const list = byType.get(d.type) ?? [];
    list.push(d);
    byType.set(d.type, list);
  }

  return (
    <AppShell user={await shellUserFrom(user)}>
      <div className="mx-auto max-w-[820px]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-[22px] font-bold text-ink">{workspace.name}</h1>
            <p className="mt-1.5 text-[14px] text-muted">
              {user.department ?? "Your department"} · {docs.length}{" "}
              {docs.length === 1 ? "item" : "items"}
            </p>
          </div>
          <Link
            href="/reports"
            className="rounded-xl bg-accent-gradient px-4 py-2.5 text-[13.5px] font-semibold text-on-accent shadow-[0_6px_18px_rgba(79,70,229,0.3)] transition-transform hover:-translate-y-0.5"
          >
            New report
          </Link>
        </div>

        {docs.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-line-strong bg-card p-10 text-center">
            <p className="text-[14px] text-muted">This semester&apos;s workspace is empty.</p>
            <p className="mt-1 text-[12.5px] text-faint">
              Anything you generate this semester lands here, organized by type.
            </p>
          </div>
        ) : (
          <div className="mt-7 flex flex-col gap-7">
            {GROUP_ORDER.filter((g) => byType.has(g.type)).map((g) => (
              <section key={g.type}>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-display text-base font-semibold text-ink">{g.label}</h2>
                  <span className="text-[12.5px] text-faint">{byType.get(g.type)!.length}</span>
                </div>
                <div className="flex flex-col gap-2.5">
                  {byType.get(g.type)!.map((d) => (
                    <DocumentRow key={d.id} doc={d} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

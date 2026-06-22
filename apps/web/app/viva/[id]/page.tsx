import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@studentos/db";
import { AppShell } from "@/components/app-shell";
import { requireOnboardedUser, shellUserFrom } from "@/lib/user";
import { generateVivaAction } from "@/lib/actions/viva";

type VivaQ = { question: string; answer: string; difficulty: "easy" | "medium" | "hard" };

const DIFF_STYLE: Record<string, string> = {
  easy: "text-success bg-success/12",
  medium: "text-warning bg-warning/12",
  hard: "text-danger bg-danger/12",
};

export default async function VivaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireOnboardedUser();

  const doc = await prisma.document.findFirst({
    where: { id, ownerId: user.id },
    include: { viva: true },
  });
  if (!doc) notFound();

  const questions = (doc.viva?.questions as VivaQ[] | undefined) ?? [];

  return (
    <AppShell user={shellUserFrom(user)}>
      <div className="mx-auto max-w-[760px]">
        <Link href="/viva" className="text-[13px] text-muted transition-colors hover:text-soft">
          ← Viva prep
        </Link>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-[22px] font-bold leading-tight text-ink">{doc.title}</h1>
            <p className="mt-1 text-[13px] text-faint">{questions.length} likely viva questions</p>
          </div>
          <form action={generateVivaAction}>
            <input type="hidden" name="sourceId" value={doc.id} />
            <button
              type="submit"
              className="rounded-xl border border-line-strong bg-surface px-4 py-2.5 text-[13px] font-semibold text-soft transition-colors hover:border-cyan/40"
            >
              Regenerate
            </button>
          </form>
        </div>

        {questions.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-line-strong bg-card/50 p-10 text-center">
            <p className="text-[14px] text-muted">No viva generated yet for this document.</p>
            <form action={generateVivaAction} className="mt-3">
              <input type="hidden" name="sourceId" value={doc.id} />
              <button
                type="submit"
                className="rounded-xl bg-accent-gradient px-4 py-2.5 text-[13.5px] font-semibold text-on-accent transition-transform hover:-translate-y-0.5"
              >
                Generate viva
              </button>
            </form>
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-3">
            {questions.map((q, i) => (
              <div key={i} className="rounded-2xl border border-line bg-card p-5">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <p className="font-display text-[15px] font-semibold text-ink">
                    Q{i + 1}. {q.question}
                  </p>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-semibold uppercase ${DIFF_STYLE[q.difficulty] ?? "text-muted bg-white/5"}`}
                  >
                    {q.difficulty}
                  </span>
                </div>
                <p className="text-[13.5px] leading-relaxed text-soft">{q.answer}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

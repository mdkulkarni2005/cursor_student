import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@studentos/db";
import { AppShell } from "@/components/app-shell";
import { requireOnboardedUser, shellUserFrom } from "@/lib/user";
import { resumePptAction, convertPptToReportAction } from "@/lib/actions/ppt";
import { ClarifyQuestions } from "@/components/clarify-questions";
import { GeneratingPoller } from "@/components/reports/generating-poller";
import { DeleteDocButton } from "@/components/delete-doc-button";
import { PPT_STAGES } from "@/lib/ppt/generate";
import { stageOf } from "@/lib/jobs";
import { DeckViewer, type Deck } from "@/components/ppt/deck-viewer";
import { GeneratingOverlay } from "@/components/generating-overlay";
import type { ClarifyQuestion } from "@studentos/ai";
import type { PptTheme, PptSlide } from "@studentos/documents";

type PptData = {
  title?: string;
  subtitle?: string;
  slides?: PptSlide[];
  theme?: PptTheme;
  /** Deck bound to an uploaded .pptx template — in-app editing is disabled for these. */
  templated?: boolean;
};

export default async function PptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireOnboardedUser();

  const doc = await prisma.document.findFirst({
    where: { id, ownerId: user.id, type: "PPT" },
    include: { content: true, exports: true, job: true },
  });
  if (!doc) notFound();

  const data = (doc.content?.data ?? {}) as PptData;
  const slides = data.slides ?? [];
  const hasExport = doc.exports.length > 0;
  const pendingQuestions =
    ((doc.job?.pending as { questions?: ClarifyQuestion[] } | null)?.questions) ?? [];
  const stage = stageOf(doc.job?.pending);

  const deck: Deck = {
    title: data.title ?? doc.title,
    subtitle: data.subtitle ?? "",
    slides,
    theme: data.theme,
  };

  return (
    <AppShell user={shellUserFrom(user)}>
      <div className="mx-auto w-full max-w-[1400px]">
        <Link href="/ppt" className="text-[13px] text-muted transition-colors hover:text-soft">
          ← All presentations
        </Link>

        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-[24px] font-bold leading-tight text-ink">{doc.title}</h1>
            <p className="mt-1 text-[13px] text-faint">
              {slides.length} slides ·{" "}
              {new Date(doc.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {doc.status === "READY" && hasExport ? (
              <>
                <form action={convertPptToReportAction}>
                  <input type="hidden" name="docId" value={doc.id} />
                  <button
                    type="submit"
                    className="rounded-xl border border-line-strong bg-surface px-4 py-2.5 text-[13.5px] font-semibold text-soft transition-colors hover:border-cyan/40 hover:text-cyan"
                  >
                    Convert to Report
                  </button>
                  <GeneratingOverlay label="Converting to a report…" sub="We're expanding your slides into a full report. This takes a minute — keep this tab open." />
                </form>
                <a
                  href={`/ppt/${doc.id}/download`}
                  className="rounded-xl bg-accent-gradient px-4 py-2.5 text-[13.5px] font-semibold text-on-accent shadow-[0_6px_18px_rgba(34,211,238,0.3)] transition-transform hover:-translate-y-0.5"
                >
                  Download PPTX
                </a>
              </>
            ) : null}
            <DeleteDocButton docId={doc.id} kind="presentation" />
          </div>
        </div>

        {doc.status === "NEEDS_INPUT" && pendingQuestions.length > 0 ? (
          <form
            action={resumePptAction}
            className="mt-6 rounded-2xl border border-cyan/25 bg-cyan/[0.06] p-5"
          >
            <GeneratingOverlay label="Finishing your deck…" />
            <input type="hidden" name="docId" value={doc.id} />
            <p className="font-display text-[15px] font-semibold text-ink">
              A few details to finish your deck
            </p>
            <p className="mb-4 mt-1 text-[13px] text-muted">
              We drafted what we could from your topic — answer these and we&apos;ll complete it.
            </p>
            <ClarifyQuestions questions={pendingQuestions} />
            <button
              type="submit"
              className="w-full rounded-xl bg-accent-gradient py-3 text-[14px] font-semibold text-on-accent shadow-[0_6px_18px_rgba(34,211,238,0.3)] transition-transform hover:-translate-y-0.5"
            >
              Finish my deck →
            </button>
          </form>
        ) : null}

        {doc.status === "GENERATING" ? (
          <GeneratingPoller stages={PPT_STAGES} current={stage} />
        ) : doc.status === "FAILED" ? (
          <div className="mt-6 rounded-xl border border-danger/25 bg-danger/10 p-4 text-[13.5px] text-danger">
            Generation failed: {doc.job?.error ?? "unknown error"}. Try generating again.
          </div>
        ) : (
          <DeckViewer docId={doc.id} deck={deck} editable={!data.templated} />
        )}
      </div>
    </AppShell>
  );
}

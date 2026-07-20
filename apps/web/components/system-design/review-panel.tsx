import type { SystemDesignReview } from "@studentos/ai";

function List({ title, items, tone }: { title: string; items: string[]; tone: "success" | "danger" | "warning" | "cyan" }) {
  if (items.length === 0) return null;
  const dot: Record<typeof tone, string> = {
    success: "bg-success",
    danger: "bg-danger",
    warning: "bg-warning",
    cyan: "bg-cyan",
  };
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wide text-muted">{title}</p>
      <ul className="mt-1.5 space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-[13px] leading-relaxed text-soft">
            <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${dot[tone]}`} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ReviewPanel({ review }: { review: SystemDesignReview }) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-line bg-card p-4">
      <p className="text-[13.5px] leading-relaxed text-ink">{review.overallFeedback}</p>
      <List title="Strengths" items={review.strengths} tone="success" />
      <List title="Bottlenecks" items={review.bottlenecks} tone="danger" />
      <List title="Missing components" items={review.missingComponents} tone="warning" />
      <List title="Suggestions" items={review.suggestions} tone="cyan" />
    </div>
  );
}

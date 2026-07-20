"use client";

export function Toolbar({
  onClearAll,
  onRun,
  running,
  disabled,
  componentCount,
}: {
  onClearAll: () => void;
  onRun: () => void;
  running?: boolean;
  disabled: boolean;
  componentCount: number;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-line bg-card px-3 py-2">
      <div className="flex items-center gap-3">
        <span className="font-mono text-[11px] text-faint">{componentCount} component{componentCount === 1 ? "" : "s"} on sheet</span>
        <button
          type="button"
          onClick={onClearAll}
          disabled={componentCount === 0}
          className="rounded-lg border border-line px-2.5 py-1 text-[11.5px] font-semibold text-muted transition-colors hover:border-danger/40 hover:text-danger disabled:opacity-40"
        >
          Clear sheet
        </button>
      </div>
      <button
        type="button"
        onClick={onRun}
        disabled={disabled}
        className="rounded-lg bg-accent-gradient px-5 py-1.5 text-[12.5px] font-semibold text-on-accent shadow-[0_4px_14px_rgba(246,146,30,0.3)] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
      >
        {running ? "Simulating…" : "Run ▶"}
      </button>
    </div>
  );
}

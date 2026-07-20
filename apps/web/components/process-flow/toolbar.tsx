"use client";

export function Toolbar({
  onClearAll,
  onCheck,
  disabled,
  componentCount,
}: {
  onClearAll: () => void;
  onCheck: () => void;
  disabled: boolean;
  componentCount: number;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-line bg-card px-3 py-2">
      <div className="flex items-center gap-3">
        <span className="font-mono text-[11px] text-faint">{componentCount} unit{componentCount === 1 ? "" : "s"} on sheet</span>
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
        onClick={onCheck}
        disabled={disabled}
        className="rounded-lg bg-flask px-5 py-1.5 text-[12.5px] font-bold text-[#2b0f00] shadow-[0_4px_14px_rgba(255,122,69,0.3)] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
      >
        Check Balance ▶
      </button>
    </div>
  );
}

"use client";

export function Toolbar({
  onClearAll,
  onRun,
  onClockPulse,
  hasFlipFlop,
  disabled,
  componentCount,
}: {
  onClearAll: () => void;
  onRun: () => void;
  onClockPulse: () => void;
  hasFlipFlop: boolean;
  disabled: boolean;
  componentCount: number;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-line bg-card px-3 py-2">
      <div className="flex items-center gap-3">
        <span className="font-mono text-[11px] text-faint">{componentCount} gate{componentCount === 1 ? "" : "s"} on bench</span>
        <button
          type="button"
          onClick={onClearAll}
          disabled={componentCount === 0}
          className="rounded-lg border border-line px-2.5 py-1 text-[11.5px] font-semibold text-muted transition-colors hover:border-danger/40 hover:text-danger disabled:opacity-40"
        >
          Clear bench
        </button>
      </div>
      <div className="flex items-center gap-2">
        {hasFlipFlop ? (
          <button
            type="button"
            onClick={onClockPulse}
            className="rounded-lg border border-scope/40 px-3 py-1.5 text-[12px] font-semibold text-scope transition-colors hover:bg-scope/10"
          >
            Clock Pulse ⏱
          </button>
        ) : null}
        <button
          type="button"
          onClick={onRun}
          disabled={disabled}
          className="rounded-lg bg-scope px-5 py-1.5 text-[12.5px] font-bold text-[#052b0d] shadow-[0_4px_14px_rgba(124,255,107,0.3)] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
        >
          Run ▶
        </button>
      </div>
    </div>
  );
}

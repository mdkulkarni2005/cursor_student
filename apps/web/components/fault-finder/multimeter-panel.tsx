import type { CircuitReading } from "@/lib/circuits/types";

export type ProbeLogEntry = { componentId: string; label: string; reading: CircuitReading };

function formatCurrent(a: number): string {
  const abs = Math.abs(a);
  if (abs < 1) return `${(a * 1000).toFixed(abs < 0.001 ? 2 : 1)} mA`;
  return `${a.toFixed(3)} A`;
}

export function MultimeterPanel({ log }: { log: ProbeLogEntry[] }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-3">
      <p className="px-1 text-[11px] font-bold uppercase tracking-wide text-muted">Multimeter readings</p>
      {log.length === 0 ? (
        <p className="mt-2 px-1 text-[12px] leading-relaxed text-faint">Click a component on the circuit to probe it.</p>
      ) : (
        <div className="mt-2 flex flex-col gap-1.5">
          {log.map((entry, i) => (
            <div key={i} className="rounded-lg bg-surface px-2.5 py-1.5 text-[12px] text-soft">
              <span className="font-semibold text-ink">{entry.label}</span>
              {": "}
              {!entry.reading.connected ? (
                <span className="text-faint">no reading — not part of a closed loop</span>
              ) : (
                <>
                  {entry.reading.currentA !== undefined ? <>I = {formatCurrent(entry.reading.currentA)} </> : null}
                  {entry.reading.voltageV !== undefined ? <>V = {entry.reading.voltageV.toFixed(2)}V</> : null}
                  {entry.reading.warning ? <span className="ml-1 font-semibold text-danger">⚠ {entry.reading.warning}</span> : null}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

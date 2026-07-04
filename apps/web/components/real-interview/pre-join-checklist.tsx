"use client";

import { useEffect, useRef, useState } from "react";

type CheckStatus = "checking" | "ok" | "unsupported" | "denied";

export type PreJoinCheckSummary = {
  fullscreen: boolean;
  monitorCount: number | null;
};

/**
 * Runs before any LiveKit connection. Camera/mic is REQUIRED. Fullscreen and monitor count stay
 * informational (best-effort, never blocking) — that ceiling is a browser limitation. Copy/paste
 * blocking is NOT handled here — it's attached by useProctoringSignals once the parent flips
 * `active` on, so there's a single source of truth for that listener regardless of which phase
 * triggered it.
 */
export function PreJoinChecklist({
  onContinue,
}: {
  onContinue: (stream: MediaStream, summary: PreJoinCheckSummary) => void;
}) {
  const [mediaStatus, setMediaStatus] = useState<CheckStatus>("checking");
  const [mediaMessage, setMediaMessage] = useState<string | null>(null);
  const [fullscreenStatus, setFullscreenStatus] = useState<CheckStatus>("checking");
  const [monitorStatus, setMonitorStatus] = useState<CheckStatus>("checking");
  const [monitorCount, setMonitorCount] = useState<number | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        setMediaStatus("ok");
      } catch {
        if (!cancelled) {
          setMediaStatus("denied");
          setMediaMessage("Camera and microphone access is required to join this interview. Please allow access and try again.");
        }
      }
    })();

    // Best-effort — never blocks continuing.
    document.documentElement
      .requestFullscreen?.()
      .then(() => !cancelled && setFullscreenStatus("ok"))
      .catch(() => !cancelled && setFullscreenStatus("unsupported"));

    (async () => {
      try {
        const w = window as typeof window & { getScreenDetails?: () => Promise<{ screens: unknown[] }> };
        if (typeof w.getScreenDetails !== "function") {
          if (!cancelled) setMonitorStatus("unsupported");
          return;
        }
        // getScreenDetails() can hang indefinitely if its permission prompt is ignored/dismissed
        // without an explicit choice — race it against a timeout so this never gets stuck on
        // "checking…" forever (this is a best-effort, non-blocking check either way).
        const details = await Promise.race([
          w.getScreenDetails(),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timed out")), 4000)),
        ]);
        if (!cancelled) {
          setMonitorCount(details.screens.length);
          setMonitorStatus("ok");
        }
      } catch {
        if (!cancelled) setMonitorStatus("unsupported");
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleRetry() {
    setMediaStatus("checking");
    setMediaMessage(null);
    void (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        streamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        setMediaStatus("ok");
      } catch {
        setMediaStatus("denied");
        setMediaMessage("Camera and microphone access is required to join this interview. Please allow access and try again.");
      }
    })();
  }

  const canContinue = mediaStatus === "ok";

  function handleContinue() {
    if (!canContinue || !streamRef.current) return;
    onContinue(streamRef.current, { fullscreen: fullscreenStatus === "ok", monitorCount });
  }

  return (
    <div>
      <div className="mb-3 max-w-[420px]">
        <video ref={localVideoRef} autoPlay muted playsInline className="aspect-video w-full rounded-xl bg-black object-cover" />
      </div>
      <ul className="mb-3 space-y-1.5 text-[12.5px]">
        <ChecklistRow label="Camera & microphone" status={mediaStatus} required />
        <ChecklistRow label="Fullscreen mode" status={fullscreenStatus} />
        <ChecklistRow
          label="Display check"
          status={monitorStatus}
          detail={monitorStatus === "ok" && monitorCount !== null ? `${monitorCount} display${monitorCount === 1 ? "" : "s"} detected` : undefined}
        />
      </ul>
      {mediaMessage && (
        <div className="mb-3">
          <p className="mb-2 text-[12.5px] text-muted">{mediaMessage}</p>
          <button
            onClick={handleRetry}
            className="rounded-xl border border-line-strong bg-surface px-4 py-2.5 text-[13.5px] font-semibold text-ink"
          >
            Try again
          </button>
        </div>
      )}
      <button
        onClick={handleContinue}
        disabled={!canContinue}
        className="rounded-xl bg-cyan px-4 py-2.5 text-[13.5px] font-semibold text-on-accent transition-transform active:scale-[0.97] disabled:opacity-60"
      >
        Continue
      </button>
    </div>
  );
}

function ChecklistRow({
  label,
  status,
  detail,
  required,
}: {
  label: string;
  status: CheckStatus;
  detail?: string;
  required?: boolean;
}) {
  const icon = status === "checking" ? "…" : status === "ok" ? "✓" : status === "denied" ? "✗" : "–";
  return (
    <li className="flex items-center gap-2">
      <span aria-hidden className="w-4 text-center text-muted">
        {icon}
      </span>
      <span className="text-ink">
        {label}
        {required ? " (required)" : ""}
      </span>
      {detail && <span className="text-muted">— {detail}</span>}
    </li>
  );
}

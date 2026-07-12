"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "studentos:install-prompt-dismissed";

/** Captures the browser's install prompt once and keeps it for re-use (Settings' "Install app"
 *  button re-fires the same captured event — Chrome only fires beforeinstallprompt once per load). */
let capturedEvent: BeforeInstallPromptEvent | null = null;
const listeners = new Set<(e: BeforeInstallPromptEvent | null) => void>();

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    capturedEvent = e as BeforeInstallPromptEvent;
    listeners.forEach((cb) => cb(capturedEvent));
  });

  // Chrome/Android only fire beforeinstallprompt once a service worker is actually registered —
  // a manifest + icons alone are not enough. This registration was previously missing entirely,
  // which is why the install prompt never appeared.
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }
}

export function useInstallPrompt() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(capturedEvent);
  useEffect(() => {
    listeners.add(setEvent);
    return () => {
      listeners.delete(setEvent);
    };
  }, []);

  async function promptInstall() {
    if (!event) return;
    await event.prompt();
    await event.userChoice;
  }

  return { available: !!event, promptInstall };
}

/** Soft, dismissible install card — shown once on first login, never forced. */
export function InstallPrompt() {
  const { available, promptInstall } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    // Starts dismissed=true (hidden) so SSR/first paint never flashes the prompt, then reveals
    // once we can safely read localStorage (unavailable during SSR) — a legitimate one-time
    // external read on mount, not a stale-render bug.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  if (!available || dismissed) return null;

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  return (
    <div className="fixed bottom-24 left-1/2 z-50 w-[calc(100%-2rem)] max-w-[380px] -translate-x-1/2 rounded-2xl border border-line-strong bg-card p-4 shadow-[0_12px_28px_rgba(15,23,42,0.12)] lg:bottom-6">
      <p className="text-[13.5px] font-semibold text-ink">Install Vidyas OS</p>
      <p className="mt-1 text-[12.5px] text-muted">Add it to your home screen for quick access, just like a native app.</p>
      <div className="mt-3 flex gap-2">
        <button
          onClick={async () => {
            await promptInstall();
            dismiss();
          }}
          className="rounded-xl bg-cyan px-3.5 py-2 text-[12.5px] font-semibold text-on-accent"
        >
          Install
        </button>
        <button onClick={dismiss} className="rounded-xl border border-line-strong px-3.5 py-2 text-[12.5px] font-semibold text-ink">
          Not now
        </button>
      </div>
    </div>
  );
}

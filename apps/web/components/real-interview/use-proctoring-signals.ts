"use client";

import { useCallback, useEffect, useRef } from "react";
import { Room, RoomEvent, Track } from "livekit-client";
import { shouldSendFlag, type FlagKind } from "@/lib/proctoring-throttle";

export type { FlagKind };
export { shouldSendFlag };

/**
 * Fullscreen-exit, tab-switch, camera-off, and (best-effort) multi-monitor detection for a
 * connected real-interview session (Phase E3). DETECTS, doesn't ENFORCE — a candidate can still
 * exit fullscreen or switch tabs; this only logs it for the recruiter to review afterward.
 */
export function useProctoringSignals(opts: { scheduleId: string; room: Room | null; active: boolean }) {
  const { scheduleId, room, active } = opts;
  const lastSentRef = useRef<Map<FlagKind, number>>(new Map());

  const postFlag = useCallback(
    (kind: FlagKind, detail?: string) => {
      const now = Date.now();
      if (!shouldSendFlag(lastSentRef.current, kind, now)) return;
      lastSentRef.current.set(kind, now);
      void fetch("/api/interview-room/flag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduleId, kind, detail }),
      }).catch(() => {});
    },
    [scheduleId],
  );

  // Fullscreen + tab-visibility + (best-effort) monitor count.
  useEffect(() => {
    if (!active) return;

    // Best-effort — never blocks the interview if denied or unsupported.
    document.documentElement.requestFullscreen?.().catch(() => {});

    function onFullscreenChange() {
      if (!document.fullscreenElement) postFlag("FULLSCREEN_EXIT");
    }
    function onVisibilityChange() {
      if (document.hidden) postFlag("TAB_HIDDEN");
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("visibilitychange", onVisibilityChange);

    // Window Management API — Chromium-only, permission-gated. Silently skip on unsupported
    // browsers or denial; never block the interview.
    (async () => {
      try {
        const w = window as typeof window & { getScreenDetails?: () => Promise<{ screens: unknown[] }> };
        if (typeof w.getScreenDetails === "function") {
          const details = await w.getScreenDetails();
          if (details.screens.length > 1) {
            postFlag("MULTI_MONITOR", `${details.screens.length} displays detected`);
          }
        }
      } catch {
        // Unsupported or permission denied.
      }
    })();

    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [active, postFlag]);

  // Camera-off — the local participant's video track being muted/ended mid-session.
  useEffect(() => {
    if (!active || !room) return;

    function onTrackMuted(publication: { source?: Track.Source }, participant: { identity?: string }) {
      if (participant.identity !== room?.localParticipant.identity) return;
      if (publication.source === Track.Source.Camera) postFlag("CAMERA_OFF");
    }

    room.on(RoomEvent.TrackMuted, onTrackMuted);
    return () => {
      room.off(RoomEvent.TrackMuted, onTrackMuted);
    };
  }, [active, room, postFlag]);
}

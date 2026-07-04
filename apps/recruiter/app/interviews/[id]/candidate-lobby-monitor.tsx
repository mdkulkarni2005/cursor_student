"use client";

import { useEffect, useRef, useState } from "react";
import { Room, RoomEvent } from "livekit-client";

type ReadySummary = { fullscreen: boolean; monitorCount: number | null };

type MonitorState =
  | { phase: "connecting" }
  | { phase: "waiting-for-room" }
  | { phase: "watching"; candidatePresent: boolean; summary: ReadySummary | null }
  | { phase: "admitting" }
  | { phase: "admitted" }
  | { phase: "ended" }
  | { phase: "expired" }
  | { phase: "too-early" }
  | { phase: "error"; message: string };

/**
 * Recruiter's view into the candidate's pre-join lobby (Phase E6). While no InterviewRoom row
 * exists yet, polls the cheap read-only /status route (no token minting) every few seconds and
 * retries — the common case is the recruiter opening this page BEFORE the candidate, so a
 * one-shot check would otherwise leave the recruiter stuck on "waiting" forever. Once the room
 * exists, connects to LiveKit SUBSCRIBE-ONLY — no getUserMedia, no publish — so it doesn't compete
 * with the recruiter's real call connection in JoinPanel.
 *
 * Readiness (fullscreen/monitor count) is shown from whichever arrives first: the durable
 * InterviewRoom.candidateChecks (via /status, refreshed on the same poll) or the live LiveKit data
 * message (see join-room-panel.tsx) — the live one is more current, so it always wins once seen.
 *
 * Admitting posts /api/interview-room/admit (persists InterviewRoom.admittedAt) then broadcasts an
 * "admitted" data message so an already-connected candidate advances immediately; the candidate
 * also polls a status route as a fallback in case that single packet is lost.
 */
export function CandidateLobbyMonitor({
  scheduleId,
  initialCandidateReadyAt,
  initialAdmittedAt,
  initialChecks,
}: {
  scheduleId: string;
  initialCandidateReadyAt: string | null;
  initialAdmittedAt: string | null;
  initialChecks: ReadySummary | null;
}) {
  const [state, setState] = useState<MonitorState>(
    initialAdmittedAt
      ? { phase: "admitted" }
      : initialCandidateReadyAt
        ? { phase: "watching", candidatePresent: true, summary: initialChecks }
        : { phase: "connecting" },
  );
  const roomRef = useRef<Room | null>(null);
  const liveSummaryReceivedRef = useRef(false);

  useEffect(() => {
    if (initialAdmittedAt) return;
    let cancelled = false;
    let retryId: ReturnType<typeof setTimeout> | undefined;

    async function attemptConnect() {
      try {
        const statusRes = await fetch("/api/interview-room/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scheduleId }),
        });
        const status = await statusRes.json();
        if (cancelled) return;
        if (!statusRes.ok || status.error) {
          setState({ phase: "error", message: status.error ?? "Couldn't connect." });
          return;
        }
        if (status.tooEarly) {
          setState({ phase: "too-early" });
          return;
        }
        if (status.expired) {
          setState({ phase: "expired" });
          return;
        }
        if (!status.exists) {
          setState({ phase: "waiting-for-room" });
          retryId = setTimeout(attemptConnect, 3000);
          return;
        }
        if (status.ended) {
          setState({ phase: "ended" });
          return;
        }
        if (status.admittedAt) {
          setState({ phase: "admitted" });
          return;
        }
        // Seed from the durable summary before the live data message (if any) arrives.
        if (!liveSummaryReceivedRef.current) {
          setState({
            phase: "watching",
            candidatePresent: Boolean(status.candidateReadyAt),
            summary: status.checks ?? null,
          });
        }

        if (roomRef.current) return; // Already connected — just refreshed the durable fallback above.

        const joinRes = await fetch("/api/interview-room/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scheduleId }),
        });
        const joinData = await joinRes.json();
        if (cancelled) return;
        if (!joinRes.ok || joinData.error) {
          setState({ phase: "error", message: joinData.error ?? "Couldn't connect." });
          return;
        }
        if (joinData.ended) {
          setState({ phase: "ended" });
          return;
        }
        if (joinData.tooEarly) {
          setState({ phase: "too-early" });
          return;
        }
        if (joinData.expired) {
          setState({ phase: "expired" });
          return;
        }
        if (joinData.waiting) {
          // Room disappeared/unavailable between the status check and now — keep retrying.
          retryId = setTimeout(attemptConnect, 3000);
          return;
        }

        const room = new Room();
        roomRef.current = room;

        function onParticipantConnected() {
          setState((prev) => (prev.phase === "watching" ? { ...prev, candidatePresent: true } : { phase: "watching", candidatePresent: true, summary: null }));
        }
        function onParticipantDisconnected() {
          setState((prev) => (prev.phase === "watching" ? { ...prev, candidatePresent: false } : prev));
        }
        function onDataReceived(payload: Uint8Array) {
          let msg: { type?: string; fullscreen?: boolean; monitorCount?: number | null };
          try {
            msg = JSON.parse(new TextDecoder().decode(payload));
          } catch {
            return;
          }
          if (msg.type !== "candidate-ready") return;
          liveSummaryReceivedRef.current = true;
          setState({
            phase: "watching",
            candidatePresent: true,
            summary: {
              fullscreen: Boolean(msg.fullscreen),
              monitorCount: msg.monitorCount ?? null,
            },
          });
        }
        room.on(RoomEvent.ParticipantConnected, onParticipantConnected);
        room.on(RoomEvent.ParticipantDisconnected, onParticipantDisconnected);
        room.on(RoomEvent.DataReceived, onDataReceived);

        await room.connect(joinData.wsUrl, joinData.token);
        if (cancelled) {
          room.disconnect();
          return;
        }
        const candidatePresent = room.remoteParticipants.size > 0;
        setState((prev) => (prev.phase === "watching" ? { ...prev, candidatePresent } : { phase: "watching", candidatePresent, summary: null }));

        // Still poll durable state in the background — the candidateChecks/candidateReadyAt
        // fallback stays fresh even if the LiveKit data message was missed, until admitted.
        retryId = setTimeout(attemptConnect, 4000);
      } catch {
        if (!cancelled) setState({ phase: "error", message: "Couldn't connect. Refresh to retry." });
      }
    }

    void attemptConnect();

    return () => {
      cancelled = true;
      if (retryId) clearTimeout(retryId);
      roomRef.current?.disconnect();
      roomRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleId]);

  async function handleAdmit() {
    setState({ phase: "admitting" });
    try {
      const res = await fetch("/api/interview-room/admit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduleId }),
      });
      if (!res.ok) {
        setState({ phase: "error", message: "Couldn't admit the candidate. Try again." });
        return;
      }
      const room = roomRef.current;
      if (room) {
        await room.localParticipant.publishData(new TextEncoder().encode(JSON.stringify({ type: "admitted" })), { reliable: true });
        // Give the reliable data packet a beat to actually flush before tearing down the
        // connection — the candidate also polls a status route as a fallback, but no reason to
        // race an immediate disconnect against it.
        await new Promise((resolve) => setTimeout(resolve, 800));
        room.disconnect();
        roomRef.current = null;
      }
      setState({ phase: "admitted" });
    } catch {
      setState({ phase: "error", message: "Couldn't admit the candidate. Try again." });
    }
  }

  if (state.phase === "admitted") {
    return <p className="mb-3 text-[12.5px] text-muted">Candidate admitted — use &ldquo;Join call&rdquo; below to connect.</p>;
  }
  if (state.phase === "ended") {
    return <p className="mb-3 text-[12.5px] text-muted">This interview has ended.</p>;
  }
  if (state.phase === "expired") {
    return (
      <p className="mb-3 text-[12.5px] text-muted">
        This interview&rsquo;s join window has passed. Use &ldquo;Propose new time&rdquo; on the interviews list to reschedule.
      </p>
    );
  }
  if (state.phase === "too-early") {
    return <p className="mb-3 text-[12.5px] text-muted">This interview isn&rsquo;t joinable yet — the window opens 15 minutes before the scheduled time.</p>;
  }
  if (state.phase === "connecting") {
    return <p className="mb-3 text-[12.5px] text-muted">Checking candidate status…</p>;
  }
  if (state.phase === "waiting-for-room") {
    return <p className="mb-3 text-[12.5px] text-muted">Waiting for the candidate to open the interview page…</p>;
  }
  if (state.phase === "error") {
    return <p className="mb-3 text-[12.5px] text-muted">{state.message}</p>;
  }

  const watching = state.phase === "watching" ? state : null;
  const candidatePresent = watching?.candidatePresent ?? false;
  const summary = watching?.summary ?? null;

  return (
    <div className="mb-4 rounded-xl border border-line-strong bg-surface p-3">
      <p className="mb-2 text-[13px] font-semibold text-ink">Candidate pre-join status</p>
      {!candidatePresent ? (
        <p className="text-[12.5px] text-muted">Candidate hasn&rsquo;t started their pre-join checks yet.</p>
      ) : (
        <ul className="mb-3 space-y-1 text-[12.5px] text-muted">
          <li>Camera &amp; microphone: granted</li>
          <li>Fullscreen: {summary ? (summary.fullscreen ? "yes" : "no") : "checking…"}</li>
          <li>Displays detected: {summary?.monitorCount ?? "checking…"}</li>
        </ul>
      )}
      <button
        onClick={handleAdmit}
        disabled={!candidatePresent || state.phase === "admitting"}
        className="rounded-xl bg-cyan px-4 py-2 text-[13px] font-semibold text-on-accent transition-transform active:scale-[0.97] disabled:opacity-60"
      >
        {state.phase === "admitting" ? "Admitting…" : "Admit candidate"}
      </button>
    </div>
  );
}

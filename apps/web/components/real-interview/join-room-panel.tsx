"use client";

import { useEffect, useRef, useState } from "react";
import { Room, RoomEvent, RemoteTrack, RemoteTrackPublication, RemoteParticipant, Track } from "livekit-client";
import { PreJoinChecklist, type PreJoinCheckSummary } from "./pre-join-checklist";
import { useProctoringSignals } from "./use-proctoring-signals";
import { useTranscriptCapture } from "./use-transcript-capture";
import { useYjsLiveKitProvider } from "./use-yjs-livekit-provider";
import { CollabEditor } from "./collab-editor";
import { SandboxTerminal } from "./sandbox-terminal";

type JoinState =
  | { phase: "idle" }
  | { phase: "checks" }
  // Room created, token minted, LiveKit connected — but NOT publishing tracks yet. The candidate
  // sits here as a lobby participant while the recruiter's monitor sees them and their readiness.
  | { phase: "connecting-lobby" }
  | { phase: "awaiting-admission" }
  | { phase: "connected"; roomName: string }
  // Accidental drop (network blip, tab crash, closed laptop) — NOT an explicit leave. The room is
  // still alive server-side; rejoin just mints a fresh token into the same LiveKit room.
  | { phase: "disconnected" }
  // Candidate clicked "Leave call" themselves — same as disconnected, still rejoinable. Only the
  // recruiter's explicit "End interview" (or the candidate's own, if ever re-added) truly ends it.
  | { phase: "left" }
  // The interview was explicitly ended (by either side) — the room is gone, rejoin is refused
  // server-side (see joinRoom's ENDED guard in apps/web/lib/live-interview.ts).
  | { phase: "interview-ended" }
  | { phase: "unavailable"; message: string }
  | { phase: "error"; message: string };

/**
 * Pre-join checks (camera/mic required; fullscreen/monitor informational) gate everything: only
 * after they pass does the candidate connect to LiveKit at all, and even then it connects as a
 * lobby participant with NO tracks published. The recruiter's candidate-lobby-monitor sees them
 * live and admits them (persisted via InterviewRoom.admittedAt) — only then do camera/mic tracks
 * actually publish. Advancing past "awaiting-admission" happens on WHICHEVER comes first: the
 * recruiter's live "admitted" LiveKit data message, or the /api/interview-room/status poll
 * fallback (in case that single packet is dropped) — admittedHandledRef guards against both firing
 * the publish-and-transition step twice. Proctoring signals (fullscreen/tab/camera/monitor/
 * copy-paste) run from the moment checks start through the whole session, not just once fully
 * connected.
 */
export function JoinRoomPanel({ scheduleId }: { scheduleId: string }) {
  const [state, setState] = useState<JoinState>({ phase: "idle" });
  const [room, setRoom] = useState<Room | null>(null);
  const [remoteName, setRemoteName] = useState<string | null>(null);
  // Camera/mic must stay on for the whole call — set while connected if either drops, cleared on
  // resume. Blocks the candidate's own UI (recruiter still sees the drop, plus the CAMERA_OFF/
  // MIC_OFF proctoring flag below fires independently of this).
  const [blockedReason, setBlockedReason] = useState<"camera" | "mic" | null>(null);
  const [sandboxActive, setSandboxActive] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const roomRef = useRef<Room | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const roomNameRef = useRef<string | null>(null);
  const summaryRef = useRef<PreJoinCheckSummary | null>(null);
  // Guards against the DataReceived listener and the status-poll fallback both firing the
  // publish-and-transition-to-connected step for the same admission.
  const admittedHandledRef = useRef(false);
  // Set right before WE call room.disconnect() ourselves, so the Disconnected listener below can
  // tell "we chose to leave/end" apart from "the connection dropped out from under us".
  const intentionalDisconnectRef = useRef(false);

  // The local <video> tag for connecting-lobby/awaiting-admission/connected doesn't exist yet at
  // the moment handleChecklistContinue tries to attach the stream (that assignment races the
  // phase-change render, so it silently no-ops against a null ref) — re-attach here every time the
  // phase changes so the preview never ends up permanently blank once the tag actually mounts.
  useEffect(() => {
    if (localVideoRef.current && streamRef.current) {
      localVideoRef.current.srcObject = streamRef.current;
    }
  }, [state.phase]);

  const proctoringActive = state.phase === "connecting-lobby" || state.phase === "awaiting-admission" || state.phase === "connected";
  useProctoringSignals({ scheduleId, room, active: proctoringActive });
  useTranscriptCapture({ scheduleId, speaker: "candidate", active: state.phase === "connected" });
  const ydoc = useYjsLiveKitProvider(state.phase === "connected" ? room : null);

  useEffect(() => {
    if (!room) return;
    function attach(track: RemoteTrack) {
      if (track.kind === "video" && remoteVideoRef.current) track.attach(remoteVideoRef.current);
      else if (track.kind === "audio" && remoteVideoRef.current) track.attach(remoteVideoRef.current);
    }
    function onTrackSubscribed(track: RemoteTrack, _pub: RemoteTrackPublication, participant: RemoteParticipant) {
      setRemoteName(participant.name || participant.identity);
      attach(track);
    }
    function onTrackUnsubscribed(track: RemoteTrack) {
      track.detach();
    }
    function onParticipantDisconnected(participant: RemoteParticipant) {
      setRemoteName((cur) => (cur === (participant.name || participant.identity) ? null : cur));
    }
    function onParticipantConnected() {
      // A recruiter who connects (or reconnects, e.g. after a reload) AFTER our one-time
      // candidate-ready broadcast would otherwise never see the readiness summary — resend it.
      const summary = summaryRef.current;
      if (!summary) return;
      void room?.localParticipant.publishData(
        new TextEncoder().encode(JSON.stringify({ type: "candidate-ready", ...summary })),
        { reliable: true },
      );
    }
    function onDisconnected() {
      if (intentionalDisconnectRef.current) {
        intentionalDisconnectRef.current = false;
        return;
      }
      setState({ phase: "disconnected" });
    }
    async function onDataReceived(payload: Uint8Array) {
      let msg: { type?: string };
      try {
        msg = JSON.parse(new TextDecoder().decode(payload));
      } catch {
        return;
      }
      if (msg.type !== "admitted") return;
      if (admittedHandledRef.current) return;
      admittedHandledRef.current = true;
      await publishLocalTracks();
      setState((prev) => (prev.phase === "awaiting-admission" ? { phase: "connected", roomName: roomNameRef.current ?? "" } : prev));
    }
    async function publishLocalTracks() {
      const stream = streamRef.current;
      const activeRoom = roomRef.current;
      if (!stream || !activeRoom) return;
      for (const track of stream.getTracks()) {
        await activeRoom.localParticipant.publishTrack(track);
      }
    }
    room.on(RoomEvent.TrackSubscribed, onTrackSubscribed);
    room.on(RoomEvent.TrackUnsubscribed, onTrackUnsubscribed);
    room.on(RoomEvent.ParticipantConnected, onParticipantConnected);
    room.on(RoomEvent.ParticipantDisconnected, onParticipantDisconnected);
    room.on(RoomEvent.Disconnected, onDisconnected);
    room.on(RoomEvent.DataReceived, onDataReceived);
    return () => {
      room.off(RoomEvent.TrackSubscribed, onTrackSubscribed);
      room.off(RoomEvent.TrackUnsubscribed, onTrackUnsubscribed);
      room.off(RoomEvent.ParticipantConnected, onParticipantConnected);
      room.off(RoomEvent.ParticipantDisconnected, onParticipantDisconnected);
      room.off(RoomEvent.Disconnected, onDisconnected);
      room.off(RoomEvent.DataReceived, onDataReceived);
    };
  }, [room]);

  useEffect(() => {
    return () => {
      roomRef.current?.disconnect();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Poll for the recruiter having launched the coding sandbox — cheap, no token minting, only
  // needed once actually connected (candidates in the lobby have nothing to run yet).
  useEffect(() => {
    if (state.phase !== "connected") return;
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch("/api/interview-room/sandbox/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scheduleId }),
        });
        const data = await res.json();
        if (!cancelled) setSandboxActive(Boolean(data.active));
      } catch {
        // Best-effort — try again next tick.
      }
    }
    void poll();
    const id = setInterval(poll, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [state.phase, scheduleId]);

  // Camera/mic must-stay-on enforcement — only once actually connected (not during the lobby,
  // where tracks aren't published yet at all).
  useEffect(() => {
    if (state.phase !== "connected" || !room) return;
    // Clear any stale block reason from a previous room before subscribing to this one's events.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBlockedReason(null);

    function onTrackMuted(publication: { source?: Track.Source }, participant: { identity?: string }) {
      if (participant.identity !== room?.localParticipant.identity) return;
      if (publication.source === Track.Source.Camera) setBlockedReason("camera");
      else if (publication.source === Track.Source.Microphone) setBlockedReason((cur) => cur ?? "mic");
    }
    function onTrackUnmuted(publication: { source?: Track.Source }, participant: { identity?: string }) {
      if (participant.identity !== room?.localParticipant.identity) return;
      if (publication.source === Track.Source.Camera) setBlockedReason((cur) => (cur === "camera" ? null : cur));
      else if (publication.source === Track.Source.Microphone) setBlockedReason((cur) => (cur === "mic" ? null : cur));
    }

    room.on(RoomEvent.TrackMuted, onTrackMuted);
    room.on(RoomEvent.TrackUnmuted, onTrackUnmuted);
    return () => {
      room.off(RoomEvent.TrackMuted, onTrackMuted);
      room.off(RoomEvent.TrackUnmuted, onTrackUnmuted);
    };
  }, [state.phase, room]);

  // Safety net alongside the LiveKit "admitted" data message — a single dropped/late packet
  // shouldn't strand the candidate in the lobby forever.
  useEffect(() => {
    if (state.phase !== "awaiting-admission") return;
    const id = setInterval(async () => {
      try {
        const res = await fetch("/api/interview-room/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scheduleId }),
        });
        const data = await res.json();
        if (!data.admitted) return;
        if (admittedHandledRef.current) return;
        admittedHandledRef.current = true;
        const stream = streamRef.current;
        const activeRoom = roomRef.current;
        if (stream && activeRoom) {
          for (const track of stream.getTracks()) {
            await activeRoom.localParticipant.publishTrack(track);
          }
        }
        setState((prev) => (prev.phase === "awaiting-admission" ? { phase: "connected", roomName: roomNameRef.current ?? "" } : prev));
      } catch {
        // Best-effort — the LiveKit data message is still the primary path; try again next tick.
      }
    }, 3000);
    return () => clearInterval(id);
  }, [state.phase, scheduleId]);

  async function handleChecklistContinue(stream: MediaStream, summary: PreJoinCheckSummary) {
    streamRef.current = stream;
    summaryRef.current = summary;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    setState({ phase: "connecting-lobby" });
    try {
      const createRes = await fetch("/api/interview-room/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduleId }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) {
        setState({ phase: "error", message: createData.error ?? "Couldn't start the interview room." });
        return;
      }
      if (createData.unavailable) {
        setState({ phase: "unavailable", message: createData.message ?? "Live interview room isn't available right now." });
        return;
      }
      roomNameRef.current = createData.roomName;

      const joinRes = await fetch("/api/interview-room/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduleId }),
      });
      const joinData = await joinRes.json();
      if (!joinRes.ok) {
        setState({ phase: "error", message: joinData.error ?? "Couldn't join the interview room." });
        return;
      }
      if (joinData.ended) {
        setState({ phase: "interview-ended" });
        return;
      }
      if (joinData.unavailable) {
        setState({ phase: "unavailable", message: "Live interview room isn't available right now." });
        return;
      }

      const newRoom = new Room();
      roomRef.current = newRoom;
      await newRoom.connect(joinData.wsUrl, joinData.token);
      setRoom(newRoom);

      // Live push to the recruiter's lobby monitor — on top of the durable candidateReadyAt write
      // below and the existing FULLSCREEN_EXIT/MULTI_MONITOR proctoring flags.
      await newRoom.localParticipant.publishData(
        new TextEncoder().encode(JSON.stringify({ type: "candidate-ready", ...summary })),
        { reliable: true },
      );

      const readyRes = await fetch("/api/interview-room/ready", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduleId, ...summary }),
      });
      const readyData = await readyRes.json();
      if (readyData.admitted) {
        admittedHandledRef.current = true;
        for (const track of stream.getTracks()) {
          await newRoom.localParticipant.publishTrack(track);
        }
        setState({ phase: "connected", roomName: createData.roomName });
      } else {
        setState({ phase: "awaiting-admission" });
      }
    } catch {
      setState({ phase: "error", message: "Couldn't connect to the interview room. Try again." });
    }
  }

  /** Rejoin after an accidental drop or soft leave — already admitted, so publish immediately. */
  async function handleRejoin() {
    setState({ phase: "connecting-lobby" });
    try {
      const joinRes = await fetch("/api/interview-room/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduleId }),
      });
      const joinData = await joinRes.json();
      if (!joinRes.ok) {
        setState({ phase: "error", message: joinData.error ?? "Couldn't join the interview room." });
        return;
      }
      if (joinData.ended) {
        setState({ phase: "interview-ended" });
        return;
      }
      if (joinData.unavailable) {
        setState({ phase: "unavailable", message: "Live interview room isn't available right now." });
        return;
      }

      const newRoom = new Room();
      roomRef.current = newRoom;
      await newRoom.connect(joinData.wsUrl, joinData.token);
      const stream = streamRef.current;
      if (stream) {
        for (const track of stream.getTracks()) {
          await newRoom.localParticipant.publishTrack(track);
        }
      }
      setRoom(newRoom);
      setState({ phase: "connected", roomName: roomNameRef.current ?? "" });
    } catch {
      setState({ phase: "error", message: "Couldn't connect. Try again." });
    }
  }

  /** Re-request the dropped device via LiveKit — clears blockedReason once the track republishes
   *  and fires TrackUnmuted above. */
  async function handleResumeDevice() {
    const activeRoom = roomRef.current;
    if (!activeRoom) return;
    try {
      if (blockedReason === "camera") await activeRoom.localParticipant.setCameraEnabled(true);
      else if (blockedReason === "mic") await activeRoom.localParticipant.setMicrophoneEnabled(true);
    } catch {
      // Still blocked — the checklist message stays up; the candidate can retry.
    }
  }

  /** Soft leave — accidental-drop-equivalent. Room stays alive; rejoin is offered. */
  function handleLeave() {
    intentionalDisconnectRef.current = true;
    roomRef.current?.disconnect();
    setState({ phase: "left" });
  }

  const showLocalVideo =
    state.phase === "checks" ||
    state.phase === "connecting-lobby" ||
    state.phase === "awaiting-admission" ||
    state.phase === "connected";

  if (state.phase === "interview-ended") {
    return <p className="text-[12.5px] text-muted">This interview has ended.</p>;
  }

  const connected = state.phase === "connected";

  if (state.phase === "idle") {
    return (
      <button
        onClick={() => setState({ phase: "checks" })}
        className="rounded-xl bg-cyan px-4 py-2.5 text-[13.5px] font-semibold text-on-accent transition-transform active:scale-[0.97]"
      >
        Start pre-join checks
      </button>
    );
  }

  if (state.phase === "checks") {
    return <PreJoinChecklist onContinue={handleChecklistContinue} />;
  }

  return (
    <div>
      {/* Same two <video> nodes render across every phase — only visibility/layout changes — so
          the local preview's srcObject (set once in handleChecklistContinue) never gets dropped by
          a remount. */}
      <div className={`mb-3 grid gap-3 ${connected ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"} ${showLocalVideo ? "" : "hidden"}`}>
        <div className="relative">
          <video ref={localVideoRef} autoPlay muted playsInline className="aspect-video w-full rounded-xl bg-black object-cover" />
          {connected && (
            <span className="absolute bottom-1.5 left-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[10.5px] font-medium text-white">
              You
            </span>
          )}
        </div>
        <div className={`relative ${connected ? "" : "hidden"}`}>
          <video ref={remoteVideoRef} autoPlay playsInline className="aspect-video w-full rounded-xl bg-black object-cover" />
          <span className="absolute bottom-1.5 left-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[10.5px] font-medium text-white">
            {remoteName ?? "Waiting for recruiter…"}
          </span>
        </div>
      </div>

      {state.phase === "connecting-lobby" && <p className="text-[12.5px] text-muted">Connecting…</p>}
      {state.phase === "awaiting-admission" && (
        <p className="text-[12.5px] text-muted">Checks passed. Waiting for the recruiter to let you in…</p>
      )}

      {state.phase === "connected" ? (
        <button
          onClick={handleLeave}
          className="rounded-xl border border-line-strong bg-surface px-4 py-2.5 text-[13.5px] font-semibold text-ink transition-transform active:scale-[0.97]"
        >
          Leave call
        </button>
      ) : state.phase === "disconnected" || state.phase === "left" ? (
        <div>
          <p className="mb-2 text-[12.5px] text-muted">
            {state.phase === "disconnected" ? "Connection dropped." : "You left the call."} The interview is still open.
          </p>
          <button
            onClick={handleRejoin}
            className="rounded-xl bg-cyan px-4 py-2.5 text-[13.5px] font-semibold text-on-accent transition-transform active:scale-[0.97]"
          >
            Rejoin
          </button>
        </div>
      ) : null}
      {(state.phase === "unavailable" || state.phase === "error") && <p className="mt-2 text-[12.5px] text-muted">{state.message}</p>}
      {state.phase === "connected" && blockedReason && (
        <div className="mt-3 rounded-2xl border border-danger/30 bg-danger/10 p-4">
          <p className="mb-2 text-[13.5px] font-semibold text-danger">
            {blockedReason === "camera" ? "Camera is off" : "Microphone is off"} — the interview is paused
          </p>
          <p className="mb-3 text-[12.5px] text-muted">
            Turn your {blockedReason === "camera" ? "camera" : "microphone"} back on to continue. The recruiter can see this too.
          </p>
          <button
            onClick={handleResumeDevice}
            className="rounded-xl bg-cyan px-4 py-2 text-[13px] font-semibold text-on-accent transition-transform active:scale-[0.97]"
          >
            Turn {blockedReason === "camera" ? "camera" : "microphone"} back on
          </button>
        </div>
      )}
      {state.phase === "connected" && <CollabEditor ydoc={ydoc} scheduleId={scheduleId} showRun />}
      {state.phase === "connected" && sandboxActive && <SandboxTerminal ydoc={ydoc} scheduleId={scheduleId} />}
    </div>
  );
}

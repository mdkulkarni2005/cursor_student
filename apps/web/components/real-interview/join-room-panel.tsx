"use client";

import { useEffect, useRef, useState } from "react";
import { Room, RoomEvent, RemoteTrack, RemoteTrackPublication, RemoteParticipant } from "livekit-client";
import { useProctoringSignals } from "./use-proctoring-signals";
import { useTranscriptCapture } from "./use-transcript-capture";
import { useYjsLiveKitProvider } from "./use-yjs-livekit-provider";
import { CollabEditor } from "./collab-editor";

type JoinState =
  | { phase: "idle" }
  | { phase: "requesting-media" }
  | { phase: "media-denied"; message: string }
  | { phase: "joining" }
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
 * Camera+mic are REQUIRED to join, not optional — getUserMedia runs before create/join is even
 * attempted. Real LiveKit connection: connects, publishes local tracks, renders a local preview
 * AND the recruiter's remote video/audio (Meet-style two-tile layout). Proctoring signals
 * (fullscreen/tab/camera/monitor) run only while phase === "connected".
 */
export function JoinRoomPanel({ scheduleId }: { scheduleId: string }) {
  const [state, setState] = useState<JoinState>({ phase: "idle" });
  const [room, setRoom] = useState<Room | null>(null);
  const [remoteName, setRemoteName] = useState<string | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const roomRef = useRef<Room | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // Set right before WE call room.disconnect() ourselves, so the Disconnected listener below can
  // tell "we chose to leave/end" apart from "the connection dropped out from under us".
  const intentionalDisconnectRef = useRef(false);

  useProctoringSignals({ scheduleId, room, active: state.phase === "connected" });
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
    function onDisconnected() {
      if (intentionalDisconnectRef.current) {
        intentionalDisconnectRef.current = false;
        return;
      }
      setState({ phase: "disconnected" });
    }
    room.on(RoomEvent.TrackSubscribed, onTrackSubscribed);
    room.on(RoomEvent.TrackUnsubscribed, onTrackUnsubscribed);
    room.on(RoomEvent.ParticipantDisconnected, onParticipantDisconnected);
    room.on(RoomEvent.Disconnected, onDisconnected);
    return () => {
      room.off(RoomEvent.TrackSubscribed, onTrackSubscribed);
      room.off(RoomEvent.TrackUnsubscribed, onTrackUnsubscribed);
      room.off(RoomEvent.ParticipantDisconnected, onParticipantDisconnected);
      room.off(RoomEvent.Disconnected, onDisconnected);
    };
  }, [room]);

  useEffect(() => {
    return () => {
      roomRef.current?.disconnect();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function handleJoin() {
    setState({ phase: "requesting-media" });
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } catch {
      setState({
        phase: "media-denied",
        message: "Camera and microphone access is required to join this interview. Please allow access and try again.",
      });
      return;
    }
    streamRef.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;

    setState({ phase: "joining" });
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
      // Publish the already-acquired tracks — never request media twice.
      for (const track of stream.getTracks()) {
        await newRoom.localParticipant.publishTrack(track);
      }
      setRoom(newRoom);
      setState({ phase: "connected", roomName: createData.roomName });
    } catch {
      setState({ phase: "error", message: "Couldn't connect to the interview room. Try again." });
    }
  }

  /** Soft leave — accidental-drop-equivalent. Room stays alive; rejoin is offered. */
  function handleLeave() {
    intentionalDisconnectRef.current = true;
    roomRef.current?.disconnect();
    setState({ phase: "left" });
  }

  const showLocalVideo =
    state.phase === "requesting-media" || state.phase === "joining" || state.phase === "connected";

  if (state.phase === "interview-ended") {
    return <p className="text-[12.5px] text-muted">This interview has ended.</p>;
  }

  const connected = state.phase === "connected";

  return (
    <div>
      {/* Same two <video> nodes render across every phase — only visibility/layout changes — so
          the local preview's srcObject (set once in handleJoin) never gets dropped by a remount. */}
      <div className={`mb-3 grid gap-3 ${connected ? "grid-cols-2" : "grid-cols-1"} ${showLocalVideo ? "" : "hidden"}`}>
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
            onClick={handleJoin}
            className="rounded-xl bg-cyan px-4 py-2.5 text-[13.5px] font-semibold text-on-accent transition-transform active:scale-[0.97]"
          >
            Rejoin
          </button>
        </div>
      ) : (
        <button
          onClick={handleJoin}
          disabled={state.phase === "requesting-media" || state.phase === "joining"}
          className="rounded-xl bg-cyan px-4 py-2.5 text-[13.5px] font-semibold text-on-accent transition-transform active:scale-[0.97] disabled:opacity-60"
        >
          {state.phase === "requesting-media" ? "Requesting camera…" : state.phase === "joining" ? "Joining…" : "Join interview"}
        </button>
      )}
      {(state.phase === "media-denied" || state.phase === "unavailable" || state.phase === "error") && (
        <p className="mt-2 text-[12.5px] text-muted">{state.message}</p>
      )}
      {state.phase === "connected" && <CollabEditor ydoc={ydoc} scheduleId={scheduleId} showRun />}
    </div>
  );
}

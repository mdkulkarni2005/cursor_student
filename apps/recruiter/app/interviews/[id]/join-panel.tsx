"use client";

import { useEffect, useRef, useState } from "react";
import { Room, RoomEvent, RemoteTrack, RemoteTrackPublication, RemoteParticipant } from "livekit-client";
import { useTranscriptCapture } from "@/components/use-transcript-capture";
import { useYjsLiveKitProvider } from "@/components/use-yjs-livekit-provider";
import { CollabEditor } from "@/components/collab-editor";

type JoinState =
  | { phase: "idle" }
  | { phase: "requesting-media" }
  | { phase: "media-denied"; message: string }
  | { phase: "joining" }
  | { phase: "connected" }
  // Accidental drop — the room is still alive; rejoin just mints a fresh token into it.
  | { phase: "disconnected" }
  // Recruiter clicked "Leave call" (soft) — same as disconnected, still rejoinable.
  | { phase: "left" }
  // Recruiter clicked "End interview" — the hard terminator. Room is gone for good.
  | { phase: "interview-ended" }
  | { phase: "waiting"; message: string }
  | { phase: "error"; message: string };

/**
 * Recruiter's twin of apps/web's JoinRoomPanel — media gate + real LiveKit connect + Meet-style
 * local+remote video tiles + shared code editor + transcript capture. Deliberately NO proctoring
 * signals (that's a candidate-only concept). "Leave call" is soft (rejoinable); "End interview" is
 * the only hard terminator — it expires the room for both sides and triggers the AI judgment.
 */
export function JoinPanel({ scheduleId }: { scheduleId: string }) {
  const [state, setState] = useState<JoinState>({ phase: "idle" });
  const [room, setRoom] = useState<Room | null>(null);
  const [remoteName, setRemoteName] = useState<string | null>(null);
  const [ending, setEnding] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const roomRef = useRef<Room | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intentionalDisconnectRef = useRef(false);

  useTranscriptCapture({ scheduleId, active: state.phase === "connected" });
  const ydoc = useYjsLiveKitProvider(state.phase === "connected" ? room : null);

  useEffect(() => {
    if (!room) return;
    function attach(track: RemoteTrack) {
      if ((track.kind === "video" || track.kind === "audio") && remoteVideoRef.current) track.attach(remoteVideoRef.current);
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
      setState({ phase: "media-denied", message: "Camera and microphone access is required to join." });
      return;
    }
    streamRef.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;

    setState({ phase: "joining" });
    try {
      const res = await fetch("/api/interview-room/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduleId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setState({ phase: "error", message: data.error ?? "Couldn't join." });
        return;
      }
      if (data.ended) {
        setState({ phase: "interview-ended" });
        return;
      }
      if (data.waiting) {
        setState({ phase: "waiting", message: "Waiting for the candidate to open the interview page first." });
        return;
      }

      const newRoom = new Room();
      roomRef.current = newRoom;
      await newRoom.connect(data.wsUrl, data.token);
      for (const track of stream.getTracks()) {
        await newRoom.localParticipant.publishTrack(track);
      }
      setRoom(newRoom);
      setState({ phase: "connected" });
    } catch {
      setState({ phase: "error", message: "Couldn't connect. Try again." });
    }
  }

  /** Soft leave — the interview stays open; rejoin is offered. */
  function handleLeave() {
    intentionalDisconnectRef.current = true;
    roomRef.current?.disconnect();
    setState({ phase: "left" });
  }

  /** Hard terminator — expires the room for both sides and kicks off the AI judgment. */
  async function handleEndInterview() {
    setEnding(true);
    const finalCode = ydoc?.getText("code").toString();
    intentionalDisconnectRef.current = true;
    roomRef.current?.disconnect();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    try {
      await fetch("/api/interview-room/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduleId, finalCode }),
      });
    } catch {
      // Best-effort — the recruiter still sees the interview as ended locally either way.
    }
    setEnding(false);
    setState({ phase: "interview-ended" });
  }

  if (state.phase === "interview-ended") {
    return <p className="text-[12.5px] text-muted">Interview ended. The AI summary will appear below shortly.</p>;
  }

  const showVideo = state.phase === "requesting-media" || state.phase === "joining" || state.phase === "connected";
  const connected = state.phase === "connected";

  return (
    <div className="mb-6">
      {/* Same two <video> nodes render across every phase — only visibility/layout changes — so
          the local preview's srcObject (set once in handleJoin) never gets dropped by a remount. */}
      <div className={`mb-3 grid gap-3 ${connected ? "max-w-[560px] grid-cols-2" : "max-w-[420px] grid-cols-1"} ${showVideo ? "" : "hidden"}`}>
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
            {remoteName ?? "Waiting for candidate…"}
          </span>
        </div>
      </div>

      {state.phase === "connected" ? (
        <div className="flex gap-2">
          <button
            onClick={handleLeave}
            className="rounded-xl border border-line-strong bg-surface px-4 py-2.5 text-[13.5px] font-semibold text-ink"
          >
            Leave call
          </button>
          <button
            onClick={handleEndInterview}
            disabled={ending}
            className="rounded-xl bg-danger px-4 py-2.5 text-[13.5px] font-semibold text-white disabled:opacity-60"
          >
            {ending ? "Ending…" : "End interview"}
          </button>
        </div>
      ) : state.phase === "disconnected" || state.phase === "left" ? (
        <div>
          <p className="mb-2 text-[12.5px] text-muted">
            {state.phase === "disconnected" ? "Connection dropped." : "You left the call."} The interview is still open.
          </p>
          <button onClick={handleJoin} className="rounded-xl bg-cyan px-4 py-2.5 text-[13.5px] font-semibold text-on-accent">
            Rejoin
          </button>
        </div>
      ) : (
        <button
          onClick={handleJoin}
          disabled={state.phase === "requesting-media" || state.phase === "joining"}
          className="rounded-xl bg-cyan px-4 py-2.5 text-[13.5px] font-semibold text-on-accent disabled:opacity-60"
        >
          {state.phase === "requesting-media" ? "Requesting camera…" : state.phase === "joining" ? "Joining…" : "Join call"}
        </button>
      )}
      {(state.phase === "media-denied" || state.phase === "waiting" || state.phase === "error") && (
        <p className="mt-2 text-[12.5px] text-muted">{state.message}</p>
      )}
      {state.phase === "connected" && <CollabEditor ydoc={ydoc} />}
    </div>
  );
}

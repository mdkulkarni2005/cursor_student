"use client";

import { useEffect, useRef, useState } from "react";
import { Room } from "livekit-client";
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
  | { phase: "unavailable"; message: string }
  | { phase: "error"; message: string }
  | { phase: "ended" };

/**
 * Camera+mic are REQUIRED to join, not optional — getUserMedia runs before create/join is even
 * attempted. Real LiveKit connection (not a token-display scaffold): connects, publishes the
 * already-acquired local tracks (never re-requests media), and renders a local preview.
 * Proctoring signals (fullscreen/tab/camera/monitor) run only while phase === "connected".
 */
export function JoinRoomPanel({ scheduleId }: { scheduleId: string }) {
  const [state, setState] = useState<JoinState>({ phase: "idle" });
  const [room, setRoom] = useState<Room | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const roomRef = useRef<Room | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useProctoringSignals({ scheduleId, room, active: state.phase === "connected" });
  useTranscriptCapture({ scheduleId, speaker: "candidate", active: state.phase === "connected" });
  const ydoc = useYjsLiveKitProvider(state.phase === "connected" ? room : null);

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
    if (videoRef.current) videoRef.current.srcObject = stream;

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

  function handleEnd() {
    roomRef.current?.disconnect();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    void fetch("/api/interview-room/end", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduleId }),
    }).catch(() => {});
    setState({ phase: "ended" });
  }

  if (state.phase === "ended") {
    return <p className="text-[12.5px] text-muted">Interview ended.</p>;
  }

  const showVideo = state.phase === "requesting-media" || state.phase === "joining" || state.phase === "connected";

  return (
    <div>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className={`mb-3 aspect-video w-full rounded-xl bg-black object-cover ${showVideo ? "block" : "hidden"}`}
      />
      {state.phase === "connected" ? (
        <button
          onClick={handleEnd}
          className="rounded-xl border border-line-strong bg-surface px-4 py-2.5 text-[13.5px] font-semibold text-ink transition-transform active:scale-[0.97]"
        >
          End interview
        </button>
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

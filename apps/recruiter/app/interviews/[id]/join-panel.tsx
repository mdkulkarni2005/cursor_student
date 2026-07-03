"use client";

import { useEffect, useRef, useState } from "react";
import { Room } from "livekit-client";
import { useTranscriptCapture } from "@/components/use-transcript-capture";
import { useYjsLiveKitProvider } from "@/components/use-yjs-livekit-provider";
import { CollabEditor } from "@/components/collab-editor";

type JoinState =
  | { phase: "idle" }
  | { phase: "requesting-media" }
  | { phase: "media-denied"; message: string }
  | { phase: "joining" }
  | { phase: "connected" }
  | { phase: "waiting"; message: string }
  | { phase: "error"; message: string }
  | { phase: "ended" };

/**
 * Recruiter's twin of apps/web's JoinRoomPanel — media gate + real LiveKit connect + local video
 * preview + transcript capture. Deliberately NO proctoring signals (that's a candidate-only concept).
 */
export function JoinPanel({ scheduleId }: { scheduleId: string }) {
  const [state, setState] = useState<JoinState>({ phase: "idle" });
  const [room, setRoom] = useState<Room | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const roomRef = useRef<Room | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useTranscriptCapture({ scheduleId, active: state.phase === "connected" });
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
      setState({ phase: "media-denied", message: "Camera and microphone access is required to join." });
      return;
    }
    streamRef.current = stream;
    if (videoRef.current) videoRef.current.srcObject = stream;

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

  function handleEnd() {
    roomRef.current?.disconnect();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setState({ phase: "ended" });
  }

  if (state.phase === "ended") {
    return <p className="text-[12.5px] text-muted">Left the call.</p>;
  }

  const showVideo = state.phase === "requesting-media" || state.phase === "joining" || state.phase === "connected";

  return (
    <div className="mb-6">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className={`mb-3 aspect-video w-full max-w-[420px] rounded-xl bg-black object-cover ${showVideo ? "block" : "hidden"}`}
      />
      {state.phase === "connected" ? (
        <button
          onClick={handleEnd}
          className="rounded-xl border border-line-strong bg-surface px-4 py-2.5 text-[13.5px] font-semibold text-ink"
        >
          Leave call
        </button>
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

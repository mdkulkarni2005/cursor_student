"use client";

import { useEffect, useState } from "react";
import * as Y from "yjs";
import { Room, RoomEvent, type DataPacket_Kind } from "livekit-client";

const TOPIC_UPDATE = "yjs-update";
const TOPIC_SYNC_REQUEST = "yjs-sync-request";
const TOPIC_SYNC_RESPONSE = "yjs-sync-response";

/**
 * Recruiter-side twin of apps/web's use-yjs-livekit-provider.ts — see that file for the full
 * rationale (hand-rolled, no official LiveKit↔Yjs provider, reliable data channel, late-joiner
 * sync-request/response handshake). UNVERIFIED IN THIS ENVIRONMENT — needs a live two-person test.
 */
export function useYjsLiveKitProvider(room: Room | null): Y.Doc | null {
  const [doc, setDoc] = useState<Y.Doc | null>(null);

  useEffect(() => {
    if (!room) {
      // Synchronizing local state with the external `room` prop, not a stale re-render — the
      // Y.Doc must be torn down/nulled whenever the LiveKit room changes or disconnects.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDoc(null);
      return;
    }

    const ydoc = new Y.Doc();
    setDoc(ydoc);

    function publish(topic: string, payload: Uint8Array) {
      void room?.localParticipant.publishData(payload, { reliable: true, topic });
    }

    function onLocalUpdate(update: Uint8Array, origin: unknown) {
      if (origin === "remote") return;
      publish(TOPIC_UPDATE, update);
    }
    ydoc.on("update", onLocalUpdate);

    function onDataReceived(payload: Uint8Array, _participant: unknown, _kind: DataPacket_Kind | undefined, topic?: string) {
      if (topic === TOPIC_UPDATE) {
        Y.applyUpdate(ydoc, payload, "remote");
      } else if (topic === TOPIC_SYNC_REQUEST) {
        publish(TOPIC_SYNC_RESPONSE, Y.encodeStateAsUpdate(ydoc));
      } else if (topic === TOPIC_SYNC_RESPONSE) {
        Y.applyUpdate(ydoc, payload, "remote");
      }
    }
    room.on(RoomEvent.DataReceived, onDataReceived);

    publish(TOPIC_SYNC_REQUEST, new Uint8Array());

    return () => {
      ydoc.off("update", onLocalUpdate);
      room.off(RoomEvent.DataReceived, onDataReceived);
      ydoc.destroy();
    };
  }, [room]);

  return doc;
}

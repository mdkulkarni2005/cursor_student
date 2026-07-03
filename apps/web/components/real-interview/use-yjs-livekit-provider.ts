"use client";

import { useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import { Room, RoomEvent, type DataPacket_Kind } from "livekit-client";

const TOPIC_UPDATE = "yjs-update";
const TOPIC_SYNC_REQUEST = "yjs-sync-request";
const TOPIC_SYNC_RESPONSE = "yjs-sync-response";

/**
 * Hand-rolled Yjs↔LiveKit sync — no official provider exists for this pairing. Uses LiveKit's
 * reliable data channel (Yjs updates are commutative/idempotent under Y.applyUpdate, so
 * out-of-order or duplicate delivery is safe; DROPPED delivery isn't, hence reliable:true).
 * Awareness (shared cursor) is intentionally skipped for v1 — content sync only.
 *
 * UNVERIFIED IN THIS ENVIRONMENT — no browser, no way to run two simultaneous clients. Needs a
 * real two-person click-through before trusting it.
 */
export function useYjsLiveKitProvider(room: Room | null): Y.Doc | null {
  const docRef = useRef<Y.Doc | null>(null);
  const [doc, setDoc] = useState<Y.Doc | null>(null);

  useEffect(() => {
    if (!room) {
      docRef.current = null;
      setDoc(null);
      return;
    }

    const ydoc = new Y.Doc();
    docRef.current = ydoc;
    setDoc(ydoc);

    function publish(topic: string, payload: Uint8Array) {
      void room?.localParticipant.publishData(payload, { reliable: true, topic });
    }

    function onLocalUpdate(update: Uint8Array, origin: unknown) {
      // Don't re-broadcast updates that came from a remote peer — avoids feedback loops.
      if (origin === "remote") return;
      publish(TOPIC_UPDATE, update);
    }
    ydoc.on("update", onLocalUpdate);

    function onDataReceived(payload: Uint8Array, _participant: unknown, _kind: DataPacket_Kind | undefined, topic?: string) {
      if (topic === TOPIC_UPDATE) {
        Y.applyUpdate(ydoc, payload, "remote");
      } else if (topic === TOPIC_SYNC_REQUEST) {
        // A peer just joined — send them our full current state once.
        publish(TOPIC_SYNC_RESPONSE, Y.encodeStateAsUpdate(ydoc));
      } else if (topic === TOPIC_SYNC_RESPONSE) {
        Y.applyUpdate(ydoc, payload, "remote");
      }
    }
    room.on(RoomEvent.DataReceived, onDataReceived);

    // Ask whoever's already in the room for their current state.
    publish(TOPIC_SYNC_REQUEST, new Uint8Array());

    return () => {
      ydoc.off("update", onLocalUpdate);
      room.off(RoomEvent.DataReceived, onDataReceived);
      ydoc.destroy();
    };
  }, [room]);

  return doc;
}

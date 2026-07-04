/**
 * LiveKit client (https://livekit.io) for the recruiter-led real interview room/token layer.
 * Provider-abstracted behind these three functions so a future swap is a change here only.
 *
 * FAIL CLOSED: any unreachable server, unconfigured keys, or transport error returns an
 * `unavailable` result. Never a fabricated room or token.
 *
 * Three modes via `LIVEKIT_DRIVER`:
 *  - "off"  — hard-disabled; every call reports unavailable immediately.
 *  - "stub" — deterministic fake room/token, no network call. Lets E0/E1 be built and manually
 *             tested end-to-end before a real LiveKit account exists.
 *  - (default) — real LiveKit via LIVEKIT_URL/LIVEKIT_API_KEY/LIVEKIT_API_SECRET.
 */
import { RoomServiceClient, AccessToken } from "livekit-server-sdk";
import {
  type ParticipantRole,
  type RoomResult,
  type TokenResult,
  unavailableRoom,
  unavailableToken,
} from "./types";

export function liveKitEnabled(): boolean {
  return process.env.LIVEKIT_DRIVER !== "off";
}

function useStub(): boolean {
  return process.env.LIVEKIT_DRIVER === "stub";
}

function config(): { url: string; apiKey: string; apiSecret: string } | null {
  const url = process.env.LIVEKIT_URL;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!url || !apiKey || !apiSecret) return null;
  return { url, apiKey, apiSecret };
}

function roomNameFor(scheduleId: string): string {
  return `interview-${scheduleId}`;
}

/** Idempotent room create-or-get, keyed by scheduleId — one room per InterviewSchedule. */
export async function ensureRoom(scheduleId: string): Promise<RoomResult> {
  if (!liveKitEnabled()) return unavailableRoom("live interview disabled (LIVEKIT_DRIVER=off)");
  const roomName = roomNameFor(scheduleId);
  if (useStub()) return { status: "ok", roomName, unavailable: false };

  const cfg = config();
  if (!cfg) return unavailableRoom("LiveKit not configured (missing LIVEKIT_URL/API_KEY/API_SECRET)");
  try {
    const svc = new RoomServiceClient(cfg.url, cfg.apiKey, cfg.apiSecret);
    // createRoom is idempotent per LiveKit semantics (existing room of the same name is returned).
    await svc.createRoom({ name: roomName, emptyTimeout: 60 * 30 });
    return { status: "ok", roomName, unavailable: false };
  } catch (err) {
    return unavailableRoom(err instanceof Error ? err.message : String(err));
  }
}

/** Mint a short-lived join token for either side of the call. */
export async function mintToken(opts: {
  roomName: string;
  identity: string;
  role: ParticipantRole;
  ttlSeconds?: number;
  /** Shown as the participant's display name on the other side's video tile — falls back to the
   *  bare identity (a cuid) if omitted, which reads as a raw ID rather than a person. */
  name?: string;
}): Promise<TokenResult> {
  if (!liveKitEnabled()) return unavailableToken("live interview disabled (LIVEKIT_DRIVER=off)");
  if (useStub()) {
    return {
      status: "ok",
      token: `stub-token.${opts.role}.${opts.identity}`,
      wsUrl: "ws://stub.local",
      unavailable: false,
    };
  }

  const cfg = config();
  if (!cfg) return unavailableToken("LiveKit not configured (missing LIVEKIT_URL/API_KEY/API_SECRET)");
  try {
    const at = new AccessToken(cfg.apiKey, cfg.apiSecret, {
      identity: opts.identity,
      name: opts.name,
      ttl: opts.ttlSeconds ?? 60 * 60,
    });
    at.addGrant({
      roomJoin: true,
      room: opts.roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });
    return { status: "ok", token: await at.toJwt(), wsUrl: cfg.url, unavailable: false };
  } catch (err) {
    return unavailableToken(err instanceof Error ? err.message : String(err));
  }
}

export async function endRoom(roomName: string): Promise<RoomResult> {
  if (!liveKitEnabled() || useStub()) return { status: "ok", roomName, unavailable: false };
  const cfg = config();
  if (!cfg) return unavailableRoom("LiveKit not configured (missing LIVEKIT_URL/API_KEY/API_SECRET)");
  try {
    const svc = new RoomServiceClient(cfg.url, cfg.apiKey, cfg.apiSecret);
    await svc.deleteRoom(roomName);
    return { status: "ok", roomName, unavailable: false };
  } catch (err) {
    return unavailableRoom(err instanceof Error ? err.message : String(err));
  }
}

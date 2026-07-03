/** Who is joining the room. Role-parameterized from the start so the recruiter-side join
 *  (built later, behind apps/recruiter) reuses these same functions unchanged. */
export type ParticipantRole = "candidate" | "recruiter";

export type RoomStatus = "ok" | "unavailable";

/**
 * The result of a room create/end call. `unavailable` is the critical field: when LiveKit is
 * unreachable, unconfigured, or hard-disabled, callers MUST NOT treat this as a working room —
 * that would let a candidate believe they're in a proctored session when they aren't.
 */
export type RoomResult = {
  status: RoomStatus;
  roomName?: string;
  unavailable: boolean;
  reason?: string;
};

export function unavailableRoom(reason: string): RoomResult {
  return { status: "unavailable", unavailable: true, reason };
}

export type TokenResult = {
  status: RoomStatus;
  token?: string;
  wsUrl?: string;
  unavailable: boolean;
  reason?: string;
};

export function unavailableToken(reason: string): TokenResult {
  return { status: "unavailable", unavailable: true, reason };
}

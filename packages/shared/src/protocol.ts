/** Versioned message contracts shared by the browser client and game server. */
export const GAME_PROTOCOL_VERSION = 1 as const;

export type Vector3Data = {
  x: number;
  y: number;
  z: number;
};

export type PlayerInput = {
  sequence: number;
  moveX: number;
  moveZ: number;
  lookYaw: number;
  jump: boolean;
  sprint: boolean;
};

export type PlayerTransform = {
  position: Vector3Data;
  rotationY: number;
};

export type PublicPlayerProfile = {
  playerId: string;
  displayName: string;
};

export type ClientMessage =
  | { type: "room:join"; protocolVersion: number; displayName: string }
  | { type: "player:input"; input: PlayerInput }
  | { type: "chat:send"; message: string }
  | { type: "room:leave" };

export type ServerMessage =
  | { type: "room:joined"; roomId: string; self: PublicPlayerProfile }
  | { type: "room:rejected"; reason: "version_mismatch" | "invalid_name" | "room_unavailable" }
  | { type: "player:joined"; player: PublicPlayerProfile; transform: PlayerTransform }
  | { type: "player:left"; playerId: string }
  | { type: "world:snapshot"; serverTick: number; players: Array<PublicPlayerProfile & PlayerTransform> }
  | { type: "chat:received"; playerId: string; displayName: string; message: string; sentAt: number }
  | { type: "server:error"; code: "invalid_message" | "rate_limited" | "not_authorized" };

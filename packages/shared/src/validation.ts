import type { PlayerInput, Vector3Data } from "./protocol";

export const MAX_DISPLAY_NAME_LENGTH = 20;
export const MAX_CHAT_MESSAGE_LENGTH = 240;
export const MAX_INPUT_SEQUENCE = 2_147_483_647;

/** Basic shape checks only; trusted server code must still enforce rate limits and authority. */
export function isFiniteVector3(value: unknown): value is Vector3Data {
  if (!value || typeof value !== "object") return false;
  const vector = value as Partial<Vector3Data>;
  return Number.isFinite(vector.x) && Number.isFinite(vector.y) && Number.isFinite(vector.z);
}

export function isValidDisplayName(value: unknown): value is string {
  return typeof value === "string" &&
    value.trim().length > 0 &&
    value.trim().length <= MAX_DISPLAY_NAME_LENGTH &&
    !/[\u0000-\u001f\u007f]/.test(value);
}

export function isValidChatMessage(value: unknown): value is string {
  return typeof value === "string" &&
    value.trim().length > 0 &&
    value.trim().length <= MAX_CHAT_MESSAGE_LENGTH &&
    !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value);
}

export function isValidPlayerInput(value: unknown): value is PlayerInput {
  if (!value || typeof value !== "object") return false;
  const input = value as Partial<PlayerInput>;
  return Number.isInteger(input.sequence) &&
    (input.sequence as number) >= 0 &&
    (input.sequence as number) <= MAX_INPUT_SEQUENCE &&
    Number.isFinite(input.moveX) && Math.abs(input.moveX as number) <= 1 &&
    Number.isFinite(input.moveZ) && Math.abs(input.moveZ as number) <= 1 &&
    Number.isFinite(input.lookYaw) &&
    typeof input.jump === "boolean" &&
    typeof input.sprint === "boolean";
}

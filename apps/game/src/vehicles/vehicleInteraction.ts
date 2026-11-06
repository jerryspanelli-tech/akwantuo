export type VehicleSeatRole = "driver" | "passenger";
export type VehicleInteractionState =
  | { mode: "on_foot" }
  | { mode: "inside_vehicle"; vehicleId: string; seatRole: VehicleSeatRole };

export type VehicleInteractionTarget = Readonly<{
  id: string;
  enabled: boolean;
  speedMps: number;
  distanceToEntryM: number;
  driverSeatAvailable: boolean;
  passengerSeatsAvailable: number;
  safeExitAvailable: boolean;
}>;

export type VehicleInteractionResult =
  | { ok: true; state: VehicleInteractionState }
  | { ok: false; reason: "already_inside" | "not_inside" | "vehicle_unavailable" | "too_far" | "seat_unavailable" | "vehicle_moving" | "unsafe_exit" };

export const VEHICLE_ENTRY_DISTANCE_M = 2.5;
export const VEHICLE_SAFE_EXIT_SPEED_MPS = 0.5;

export function enterVehicle(
  state: VehicleInteractionState,
  vehicle: VehicleInteractionTarget,
  role: VehicleSeatRole
): VehicleInteractionResult {
  if (state.mode !== "on_foot") return { ok: false, reason: "already_inside" };
  if (!vehicle.id.trim() || !vehicle.enabled) return { ok: false, reason: "vehicle_unavailable" };
  if (!Number.isFinite(vehicle.distanceToEntryM) || vehicle.distanceToEntryM < 0 ||
      vehicle.distanceToEntryM > VEHICLE_ENTRY_DISTANCE_M) return { ok: false, reason: "too_far" };
  const available = role === "driver" ? vehicle.driverSeatAvailable : vehicle.passengerSeatsAvailable > 0;
  if (!available) return { ok: false, reason: "seat_unavailable" };
  return { ok: true, state: { mode: "inside_vehicle", vehicleId: vehicle.id, seatRole: role } };
}

export function exitVehicle(
  state: VehicleInteractionState,
  vehicle: VehicleInteractionTarget
): VehicleInteractionResult {
  if (state.mode !== "inside_vehicle") return { ok: false, reason: "not_inside" };
  if (state.vehicleId !== vehicle.id || !vehicle.enabled) return { ok: false, reason: "vehicle_unavailable" };
  if (!Number.isFinite(vehicle.speedMps) || Math.abs(vehicle.speedMps) > VEHICLE_SAFE_EXIT_SPEED_MPS) {
    return { ok: false, reason: "vehicle_moving" };
  }
  if (!vehicle.safeExitAvailable) return { ok: false, reason: "unsafe_exit" };
  return { ok: true, state: { mode: "on_foot" } };
}

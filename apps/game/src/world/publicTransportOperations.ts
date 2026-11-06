export type PublicTransportPassengerState =
  | { mode: "not_riding"; balancePesewas: number }
  | { mode: "riding"; vehicleId: string; routeId: string; boardedAtStopId: string; balancePesewas: number; farePaidPesewas: number };

export type PublicTransportStopState = Readonly<{
  id: string;
  vehicleStopped: boolean;
  boardingOpen: boolean;
  alightingOpen: boolean;
  remainingSeats: number;
}>;

export type PublicTransportFare = Readonly<{
  baseFarePesewas: number;
  perKilometrePesewas: number;
}>;

export type PublicTransportOperationResult =
  | { ok: true; state: PublicTransportPassengerState }
  | { ok: false; reason: "already_riding" | "not_riding" | "invalid_trip" | "vehicle_not_stopped" | "boarding_closed" | "no_seats" | "insufficient_funds" | "wrong_vehicle" | "alighting_closed" };

export function quotePublicTransportFare(
  distanceKm: number,
  fare: PublicTransportFare
): number {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0 ||
      !Number.isSafeInteger(fare.baseFarePesewas) || fare.baseFarePesewas < 0 ||
      !Number.isSafeInteger(fare.perKilometrePesewas) || fare.perKilometrePesewas < 0) {
    throw new Error("Invalid public transport fare inputs.");
  }
  return Math.ceil(fare.baseFarePesewas + distanceKm * fare.perKilometrePesewas);
}

export function boardPublicTransport(
  state: PublicTransportPassengerState,
  stop: PublicTransportStopState,
  vehicleId: string,
  routeId: string,
  distanceKm: number,
  fare: PublicTransportFare
): PublicTransportOperationResult {
  if (state.mode === "riding") return { ok: false, reason: "already_riding" };
  if (!vehicleId.trim() || !routeId.trim() || !stop.id.trim() ||
      !Number.isInteger(state.balancePesewas) || state.balancePesewas < 0 ||
      !Number.isInteger(stop.remainingSeats) || stop.remainingSeats < 0) {
    return { ok: false, reason: "invalid_trip" };
  }
  if (!stop.vehicleStopped) return { ok: false, reason: "vehicle_not_stopped" };
  if (!stop.boardingOpen) return { ok: false, reason: "boarding_closed" };
  if (stop.remainingSeats < 1) return { ok: false, reason: "no_seats" };
  let fareDue: number;
  try { fareDue = quotePublicTransportFare(distanceKm, fare); }
  catch { return { ok: false, reason: "invalid_trip" }; }
  if (state.balancePesewas < fareDue) return { ok: false, reason: "insufficient_funds" };
  return {
    ok: true,
    state: {
      mode: "riding", vehicleId, routeId, boardedAtStopId: stop.id,
      balancePesewas: state.balancePesewas - fareDue, farePaidPesewas: fareDue
    }
  };
}

export function alightPublicTransport(
  state: PublicTransportPassengerState,
  stop: PublicTransportStopState,
  vehicleId: string
): PublicTransportOperationResult {
  if (state.mode !== "riding") return { ok: false, reason: "not_riding" };
  if (state.vehicleId !== vehicleId) return { ok: false, reason: "wrong_vehicle" };
  if (!stop.vehicleStopped) return { ok: false, reason: "vehicle_not_stopped" };
  if (!stop.alightingOpen) return { ok: false, reason: "alighting_closed" };
  return { ok: true, state: { mode: "not_riding", balancePesewas: state.balancePesewas } };
}

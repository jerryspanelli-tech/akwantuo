export type VehicleFootprint = Readonly<{
  x: number;
  z: number;
  radiusM: number;
}>;

function distanceToSegment(point: Readonly<{ x: number; z: number }>, start: Readonly<{ x: number; z: number }>, end: Readonly<{ x: number; z: number }>): number {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const lengthSquared = dx * dx + dz * dz;
  if (lengthSquared <= 1e-9) return Math.hypot(point.x - start.x, point.z - start.z);
  const amount = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.z - start.z) * dz) / lengthSquared));
  const nearestX = start.x + dx * amount;
  const nearestZ = start.z + dz * amount;
  return Math.hypot(point.x - nearestX, point.z - nearestZ);
}

export function isVehicleFootprintValid(value: VehicleFootprint): boolean {
  return [value.x, value.z, value.radiusM].every(Number.isFinite) && value.radiusM > 0;
}

/**
 * Conservative circular footprint test for the prototype vehicle collision
 * layer. The moving vehicle is swept along its proposed frame segment so a
 * low frame rate cannot skip through another vehicle.
 */
export function isVehiclePathClear(
  movingFrom: VehicleFootprint,
  movingTo: VehicleFootprint,
  stationary: VehicleFootprint
): boolean {
  if (![movingFrom, movingTo, stationary].every(isVehicleFootprintValid)) {
    throw new Error("Invalid vehicle footprint supplied to collision test.");
  }
  const requiredClearance = movingTo.radiusM + stationary.radiusM;
  return distanceToSegment(stationary, movingFrom, movingTo) >= requiredClearance;
}

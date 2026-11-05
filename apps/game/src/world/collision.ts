export type SolidArea = {
  x: number;
  z: number;
  halfWidth: number;
  halfDepth: number;
};

/** Circle-vs-axis-aligned-rectangle test for the current prototype buildings. */
export function isBlocked(
  x: number,
  z: number,
  solidAreas: readonly SolidArea[],
  radius: number
): boolean {
  return solidAreas.some((area) => {
    const nearestX = Math.max(area.x - area.halfWidth, Math.min(x, area.x + area.halfWidth));
    const nearestZ = Math.max(area.z - area.halfDepth, Math.min(z, area.z + area.halfDepth));
    return (x - nearestX) ** 2 + (z - nearestZ) ** 2 < radius ** 2;
  });
}

export function clampToWorld(
  x: number,
  z: number,
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number }
): { x: number; z: number } {
  return {
    x: Math.max(bounds.minX, Math.min(bounds.maxX, x)),
    z: Math.max(bounds.minZ, Math.min(bounds.maxZ, z))
  };
}

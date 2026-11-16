import { getMapRoadPath, GREATER_ACCRA_ROAD_PATHS } from "./greaterAccraLayout";
import { getRoadCrossSectionProfile, GREATER_ACCRA_ROAD_DESIGNS } from "./roadDesign";

/** Road ribbons are authored 5 cm above the ground plane. */
const ROAD_SURFACE_Y = 0.05;

type RoadProjection = Readonly<{ distanceM: number; lateralM: number }>;

/** Projects a world position onto a finite centreline segment. */
function projectToSegment(
  x: number,
  z: number,
  ax: number,
  az: number,
  bx: number,
  bz: number
): RoadProjection {
  const dx = bx - ax;
  const dz = bz - az;
  const lengthSquared = dx * dx + dz * dz;
  const t = lengthSquared > 0
    ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / lengthSquared))
    : 0;
  const nearestX = ax + dx * t;
  const nearestZ = az + dz * t;
  const cross = dx * (z - nearestZ) - dz * (x - nearestX);
  return {
    distanceM: Math.hypot(x - nearestX, z - nearestZ),
    lateralM: Math.sign(cross) * Math.hypot(x - nearestX, z - nearestZ)
  };
}

/**
 * Returns the authored asphalt deck height when a position lies inside a
 * first-release carriageway. This is a height sampler, not a road-boundary
 * collision system; junction and elevated-deck routing remain separate.
 *
 * Divided roads deliberately exclude their physical median. The Circle ramp
 * sampler must take precedence for its grade-separated approaches.
 */
export function getRoadSurfaceHeightAtPosition(x: number, z: number): number | null {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return null;

  let closestRoadDistance = Number.POSITIVE_INFINITY;
  let onRoad = false;

  for (const road of GREATER_ACCRA_ROAD_PATHS) {
    if (!road.playableInFirstRelease) continue;
    const design = GREATER_ACCRA_ROAD_DESIGNS.find(
      (item) => item.roadSegmentId === road.roadSegmentId
    );
    const profile = design && getRoadCrossSectionProfile(design.crossSectionProfileId);
    const path = getMapRoadPath(road.roadSegmentId);
    if (!profile || !path || path.points.length < 2) continue;

    const carriagewayHalfWidth = profile.lanesPerDirection * profile.laneWidthM;
    const medianHalfWidth = profile.medianWidthM / 2;
    for (let index = 1; index < path.points.length; index += 1) {
      const start = path.points[index - 1];
      const end = path.points[index];
      const projection = projectToSegment(x, z, start.x, start.z, end.x, end.z);
      if (projection.distanceM >= closestRoadDistance) continue;

      const lateral = Math.abs(projection.lateralM);
      const insideCarriageway = profile.medianWidthM > 0
        ? lateral >= medianHalfWidth && lateral <= medianHalfWidth + carriagewayHalfWidth
        : lateral <= carriagewayHalfWidth;
      if (!insideCarriageway) continue;

      closestRoadDistance = projection.distanceM;
      onRoad = true;
    }
  }

  return onRoad ? ROAD_SURFACE_Y : null;
}

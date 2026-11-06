import {
  getMapRoadPath,
  GREATER_ACCRA_ROAD_PATHS,
  type MapPoint
} from "./greaterAccraLayout";
import { getRoadCrossSectionProfile, getRoadDesignWidth, GREATER_ACCRA_ROAD_DESIGNS } from "./roadDesign";

export type RoadProjectionOptions = Readonly<{
  maxDistanceM?: number;
  includeFutureExpansion?: boolean;
}>;

export type RoadProjection = Readonly<{
  roadSegmentId: string;
  point: MapPoint;
  distanceM: number;
  lateralOffsetM: number;
  headingRadians: number;
  roadWidthM: number;
  routeDistanceM: number;
  playableInFirstRelease: boolean;
}>;

function finitePoint(x: number, z: number): boolean {
  return Number.isFinite(x) && Number.isFinite(z);
}

/**
 * Projects a world point onto the nearest authored road centreline.
 * Road paths and widths are provisional game-planning data, not surveyed GIS.
 */
export function findNearestRoadProjection(
  x: number,
  z: number,
  options: RoadProjectionOptions = {}
): RoadProjection | null {
  if (!finitePoint(x, z)) throw new Error("Road projection coordinates must be finite.");
  const maxDistance = options.maxDistanceM ?? 500;
  if (!Number.isFinite(maxDistance) || maxDistance < 0 || maxDistance > 50000) {
    throw new RangeError("Road projection maximum distance must be between 0 and 50000 metres.");
  }

  let nearest: RoadProjection | null = null;
  let nearestDistance = maxDistance;

  for (const road of GREATER_ACCRA_ROAD_PATHS) {
    if (!road.playableInFirstRelease && !options.includeFutureExpansion) continue;
    const path = getMapRoadPath(road.roadSegmentId);
    const roadWidth = getRoadDesignWidth(road.roadSegmentId);
    if (!path || path.points.length < 2 || roadWidth === undefined) continue;

    let routeDistance = 0;
    for (let index = 1; index < path.points.length; index += 1) {
      const start = path.points[index - 1];
      const end = path.points[index];
      const dx = end.x - start.x;
      const dz = end.z - start.z;
      const lengthSquared = dx * dx + dz * dz;
      const length = Math.sqrt(lengthSquared);
      if (length <= 0) continue;

      const t = Math.max(0, Math.min(1, ((x - start.x) * dx + (z - start.z) * dz) / lengthSquared));
      const projected = { x: start.x + dx * t, z: start.z + dz * t };
      const offsetX = x - projected.x;
      const offsetZ = z - projected.z;
      const distance = Math.hypot(offsetX, offsetZ);

      if (distance < nearestDistance) {
        const normalX = dz / length;
        const normalZ = -dx / length;
        nearestDistance = distance;
        nearest = {
          roadSegmentId: road.roadSegmentId,
          point: projected,
          distanceM: distance,
          lateralOffsetM: offsetX * normalX + offsetZ * normalZ,
          headingRadians: Math.atan2(dx, dz),
          roadWidthM: roadWidth,
          routeDistanceM: routeDistance + length * t,
          playableInFirstRelease: road.playableInFirstRelease
        };
      }
      routeDistance += length;
    }
  }

  return nearest;
}

export function isRoadProjectionValid(projection: RoadProjection): boolean {
  return !!projection.roadSegmentId.trim() &&
    finitePoint(projection.point.x, projection.point.z) &&
    Number.isFinite(projection.distanceM) && projection.distanceM >= 0 &&
    Number.isFinite(projection.lateralOffsetM) &&
    Number.isFinite(projection.headingRadians) &&
    Number.isFinite(projection.roadWidthM) && projection.roadWidthM > 0 &&
    Number.isFinite(projection.routeDistanceM) && projection.routeDistanceM >= 0 &&
    typeof projection.playableInFirstRelease === "boolean";
}

/** Tests whether a point lies inside the nearest road's complete corridor width. */
export function isPointOnRoadNetwork(
  x: number,
  z: number,
  options: RoadProjectionOptions = {}
): boolean {
  const projection = findNearestRoadProjection(x, z, options);
  if (!projection) return false;
  const design = GREATER_ACCRA_ROAD_DESIGNS.find((item) => item.roadSegmentId === projection.roadSegmentId);
  const profile = design && getRoadCrossSectionProfile(design.crossSectionProfileId);
  if (!profile) return false;
  const offset = Math.abs(projection.lateralOffsetM);
  const innerEdge = profile.medianWidthM / 2;
  const outerEdge = innerEdge + profile.lanesPerDirection * profile.laneWidthM + profile.shoulderWidthM;
  return offset >= innerEdge && offset <= outerEdge;
}

/** Signed lane-centre offset from the authored road centreline. */
export function getRoadLaneCenterOffset(
  roadSegmentId: string,
  direction: "forward" | "reverse",
  laneIndex: number
): number {
  const design = GREATER_ACCRA_ROAD_DESIGNS.find((item) => item.roadSegmentId === roadSegmentId);
  const profile = design && getRoadCrossSectionProfile(design.crossSectionProfileId);
  if (!profile) throw new Error("Unknown road segment or missing cross-section profile: " + roadSegmentId);
  if (!Number.isInteger(laneIndex) || laneIndex < 0 || laneIndex >= profile.lanesPerDirection) {
    throw new RangeError("Lane index is outside the road's lane count.");
  }
  if (direction !== "forward" && direction !== "reverse") {
    throw new Error("Road direction must be forward or reverse.");
  }
  const offset = profile.medianWidthM / 2 + (laneIndex + 0.5) * profile.laneWidthM;
  return direction === "forward" ? offset : -offset;
}

/** Computes a lane centre in world coordinates from a road projection. */
export function getRoadLaneCenterPoint(
  projection: RoadProjection,
  direction: "forward" | "reverse",
  laneIndex: number
): MapPoint {
  if (!isRoadProjectionValid(projection)) throw new Error("Cannot compute a lane from an invalid road projection.");
  const offset = getRoadLaneCenterOffset(projection.roadSegmentId, direction, laneIndex);
  const normalX = Math.cos(projection.headingRadians);
  const normalZ = -Math.sin(projection.headingRadians);
  return {
    x: projection.point.x + normalX * offset,
    z: projection.point.z + normalZ * offset
  };
}

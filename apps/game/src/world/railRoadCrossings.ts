import {
  GREATER_ACCRA_RAIL_ROUTES
} from "./railNetwork";
import {
  GREATER_ACCRA_ROAD_PATHS,
  type MapPoint
} from "./greaterAccraLayout";

export type RailRoadCrossingCandidate = Readonly<{
  id: string;
  roadSegmentId: string;
  railRouteId: string;
  position: MapPoint;
  roadHeadingRadians: number;
  railHeadingRadians: number;
  crossingAngleDegrees: number;
  railDistanceM: number;
  status: "review_required";
}>;

export type RailCrossingSafetyInput = Readonly<{
  /** Signed distance from the train front to the crossing along the rail route. */
  trainFrontDistanceM: number | null;
  trainLengthM: number;
  clearanceM: number;
  warningDistanceM: number;
  systemHealthy: boolean;
}>;

export type RailCrossingSafetyState = Readonly<{
  phase: "open" | "warning" | "closed";
  barriersDown: boolean;
  warningActive: boolean;
  roadTrafficMayProceed: boolean;
  reason: "clear" | "train_approaching" | "train_occupying" | "system_fault";
}>;

const GRADE_SEPARATED_JUNCTIONS: readonly MapPoint[] = [
  { x: -450, z: 450 },   // Circle interchange
  { x: -1750, z: 2100 }  // Achimota rail/road junction
];
const GRADE_SEPARATED_EXCLUSION_RADIUS_M = 220;

type Intersection = Readonly<{
  position: MapPoint;
  roadHeadingRadians: number;
  railHeadingRadians: number;
  railDistanceM: number;
}>;

function segmentIntersection(
  a: MapPoint,
  b: MapPoint,
  c: MapPoint,
  d: MapPoint
): { position: MapPoint; roadT: number; railT: number } | null {
  const rx = b.x - a.x;
  const rz = b.z - a.z;
  const sx = d.x - c.x;
  const sz = d.z - c.z;
  const denominator = rx * sz - rz * sx;
  if (Math.abs(denominator) < 1e-8) return null;
  const qx = c.x - a.x;
  const qz = c.z - a.z;
  const roadT = (qx * sz - qz * sx) / denominator;
  const railT = (qx * rz - qz * rx) / denominator;
  if (roadT < -1e-8 || roadT > 1 + 1e-8 || railT < -1e-8 || railT > 1 + 1e-8) return null;
  return {
    position: { x: a.x + roadT * rx, z: a.z + roadT * rz },
    roadT,
    railT
  };
}

function distance(a: MapPoint, b: MapPoint): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function routeIntersections(
  roadPoints: readonly MapPoint[],
  railPoints: readonly MapPoint[]
): Intersection[] {
  const found: Intersection[] = [];
  let railDistanceBeforeSegment = 0;
  for (let railIndex = 1; railIndex < railPoints.length; railIndex += 1) {
    const railA = railPoints[railIndex - 1];
    const railB = railPoints[railIndex];
    const railLength = distance(railA, railB);
    if (railLength <= 1e-6) continue;
    const railHeadingRadians = Math.atan2(railB.x - railA.x, railB.z - railA.z);
    for (let roadIndex = 1; roadIndex < roadPoints.length; roadIndex += 1) {
      const roadA = roadPoints[roadIndex - 1];
      const roadB = roadPoints[roadIndex];
      const hit = segmentIntersection(roadA, roadB, railA, railB);
      if (!hit) continue;
      const roadHeadingRadians = Math.atan2(roadB.x - roadA.x, roadB.z - roadA.z);
      const angle = Math.abs(roadHeadingRadians - railHeadingRadians);
      const crossingAngleDegrees = Math.min(
        angle % Math.PI,
        Math.PI - (angle % Math.PI)
      ) * 180 / Math.PI;
      if (crossingAngleDegrees < 15) continue;
      found.push({
        position: hit.position,
        roadHeadingRadians,
        railHeadingRadians,
        crossingAngleDegrees,
        railDistanceM: railDistanceBeforeSegment + hit.railT * railLength
      });
    }
    railDistanceBeforeSegment += railLength;
  }
  return found;
}

/**
 * Finds geometric road/rail intersections from the authored schematic centre
 * lines. Intersections close to Circle and Achimota are excluded because those
 * are reserved grade-separated junctions. Every returned location remains a
 * review candidate, not an approved real-world level crossing.
 */
export function deriveRailRoadCrossingCandidates(): readonly RailRoadCrossingCandidate[] {
  const candidates: RailRoadCrossingCandidate[] = [];
  for (const railRoute of GREATER_ACCRA_RAIL_ROUTES.filter((route) => route.firstRelease)) {
    for (const road of GREATER_ACCRA_ROAD_PATHS.filter((path) => path.playableInFirstRelease)) {
      const intersections = routeIntersections(road.points, railRoute.points);
      for (const intersection of intersections) {
        if (GRADE_SEPARATED_JUNCTIONS.some((junction) =>
          distance(intersection.position, junction) <= GRADE_SEPARATED_EXCLUSION_RADIUS_M
        )) continue;
        const duplicate = candidates.some((candidate) =>
          candidate.roadSegmentId === road.roadSegmentId &&
          candidate.railRouteId === railRoute.id &&
          distance(candidate.position, intersection.position) < 2
        );
        if (duplicate) continue;
        candidates.push({
          id: `rail-crossing-${road.roadSegmentId}-${railRoute.id}`,
          roadSegmentId: road.roadSegmentId,
          railRouteId: railRoute.id,
          position: intersection.position,
          roadHeadingRadians: intersection.roadHeadingRadians,
          railHeadingRadians: intersection.railHeadingRadians,
          crossingAngleDegrees: intersection.crossingAngleDegrees,
          railDistanceM: intersection.railDistanceM,
          status: "review_required"
        });
      }
    }
  }
  return candidates.sort((a, b) =>
    a.railRouteId.localeCompare(b.railRouteId) ||
    a.railDistanceM - b.railDistanceM ||
    a.roadSegmentId.localeCompare(b.roadSegmentId)
  );
}

export function isRailRoadCrossingCandidateValid(value: unknown): value is RailRoadCrossingCandidate {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<RailRoadCrossingCandidate>;
  return typeof candidate.id === "string" && candidate.id.trim().length > 0 &&
    typeof candidate.roadSegmentId === "string" && GREATER_ACCRA_ROAD_PATHS.some((road) =>
      road.roadSegmentId === candidate.roadSegmentId && road.playableInFirstRelease
    ) &&
    typeof candidate.railRouteId === "string" && GREATER_ACCRA_RAIL_ROUTES.some((route) =>
      route.id === candidate.railRouteId && route.firstRelease
    ) &&
    !!candidate.position && Number.isFinite(candidate.position.x) && Number.isFinite(candidate.position.z) &&
    Number.isFinite(candidate.roadHeadingRadians) &&
    Number.isFinite(candidate.railHeadingRadians) &&
    Number.isFinite(candidate.crossingAngleDegrees) &&
    candidate.crossingAngleDegrees! >= 15 && candidate.crossingAngleDegrees! <= 90 &&
    Number.isFinite(candidate.railDistanceM) && candidate.railDistanceM! >= 0 &&
    candidate.status === "review_required";
}

/**
 * Fail-safe crossing interlock. The train-front distance is measured along its
 * route: positive before the crossing and negative after the front passes it.
 * Barriers remain down until the train rear plus clearance has passed. A system
 * fault always closes the road. This helper is not a certified railway system.
 */
export function evaluateRailCrossingSafety(
  input: RailCrossingSafetyInput
): RailCrossingSafetyState {
  if (![input.trainLengthM, input.clearanceM, input.warningDistanceM]
    .every(Number.isFinite) ||
    input.trainLengthM <= 0 || input.clearanceM < 0 ||
    input.warningDistanceM <= input.trainLengthM + input.clearanceM ||
    !(input.trainFrontDistanceM === null || Number.isFinite(input.trainFrontDistanceM)) ||
    typeof input.systemHealthy !== "boolean") {
    throw new Error("Invalid rail crossing safety input.");
  }

  if (!input.systemHealthy) {
    return {
      phase: "closed", barriersDown: true, warningActive: true,
      roadTrafficMayProceed: false, reason: "system_fault"
    };
  }
  if (input.trainFrontDistanceM === null ||
      input.trainFrontDistanceM > input.warningDistanceM) {
    return {
      phase: "open", barriersDown: false, warningActive: false,
      roadTrafficMayProceed: true, reason: "clear"
    };
  }
  if (input.trainFrontDistanceM > 0) {
    return {
      phase: "warning", barriersDown: false, warningActive: true,
      roadTrafficMayProceed: false, reason: "train_approaching"
    };
  }
  if (input.trainFrontDistanceM >= -(input.trainLengthM + input.clearanceM)) {
    return {
      phase: "closed", barriersDown: true, warningActive: true,
      roadTrafficMayProceed: false, reason: "train_occupying"
    };
  }
  return {
    phase: "open", barriersDown: false, warningActive: false,
    roadTrafficMayProceed: true, reason: "clear"
  };
}

export function isRailRoadCrossingCatalogueValid(): boolean {
  const candidates = deriveRailRoadCrossingCandidates();
  const ids = new Set(candidates.map((candidate) => candidate.id));
  return candidates.length >= 2 &&
    ids.size === candidates.length &&
    candidates.every(isRailRoadCrossingCandidateValid) &&
    candidates.every((candidate) => !GRADE_SEPARATED_JUNCTIONS.some((junction) =>
      distance(candidate.position, junction) <= GRADE_SEPARATED_EXCLUSION_RADIUS_M
    ));
}

import type { RoadCrossSectionProfile } from "@akwantuo/shared";
import { GREATER_ACCRA_JUNCTIONS } from "./junctions";
import { GREATER_ACCRA_JUNCTION_LAYOUTS } from "./junctionLayouts";
import { getMapNodePosition, getMapRoadPath } from "./greaterAccraLayout";
import { getRoadCrossSectionProfile, GREATER_ACCRA_ROAD_DESIGNS } from "./roadDesign";
import { GREATER_ACCRA_ROAD_NETWORK } from "./roadNetwork";

export type JunctionApproach = Readonly<{
  id: string;
  junctionId: string;
  nodeId: string;
  roadSegmentId: string;
  /** Unit vector pointing away from the junction along the connected road. */
  outwardDirection: Readonly<{ x: number; z: number }>;
  /** Width is inherited from the assigned road cross-section profile. */
  roadWidthM: number;
  roadProfileId: string;
  /** Whether this approach belongs to a first-release drivable corridor. */
  playableInFirstRelease: boolean;
  /** The junction's final lane control and turning movements are not yet designed. */
  controlDesign: "grade_separated" | "awaiting_junction_design";
}>;

function getProfileForSegment(segmentId: string): RoadCrossSectionProfile | undefined {
  const assignment = GREATER_ACCRA_ROAD_DESIGNS.find((item) => item.roadSegmentId === segmentId);
  return assignment ? getRoadCrossSectionProfile(assignment.crossSectionProfileId) : undefined;
}

function createApproach(junctionId: string, nodeId: string, segmentId: string): JunctionApproach | undefined {
  const segment = GREATER_ACCRA_ROAD_NETWORK.segments.find((item) => item.id === segmentId);
  const path = getMapRoadPath(segmentId);
  const node = getMapNodePosition(nodeId);
  const profile = getProfileForSegment(segmentId);
  if (!segment || !path || !node || !profile || path.points.length < 2) return undefined;

  const nodeIsStart = segment.fromNodeId === nodeId;
  const nodeIsEnd = segment.toNodeId === nodeId;
  if (nodeIsStart === nodeIsEnd) return undefined;

  const adjacent = nodeIsStart ? path.points[1] : path.points[path.points.length - 2];
  const dx = adjacent.x - node.x;
  const dz = adjacent.z - node.z;
  const magnitude = Math.hypot(dx, dz);
  if (!Number.isFinite(magnitude) || magnitude <= 0) return undefined;

  const junction = GREATER_ACCRA_JUNCTIONS.find((item) => item.id === junctionId);
  if (!junction) return undefined;

  return {
    id: `${junctionId}--${segmentId}`,
    junctionId,
    nodeId,
    roadSegmentId: segmentId,
    outwardDirection: { x: dx / magnitude, z: dz / magnitude },
    roadWidthM: profile.lanesPerDirection * 2 * profile.laneWidthM +
      profile.shoulderWidthM * 2 + profile.medianWidthM +
      profile.sidewalkWidthM * 2 + profile.drainageWidthM * 2,
    roadProfileId: profile.id,
    playableInFirstRelease: !segment.futureExpansion,
    controlDesign: junction.design === "grade_separated_interchange"
      ? "grade_separated"
      : "awaiting_junction_design"
  };
}

/**
 * Derives one approach arm for each connected road at every planned junction.
 * This is a topology/layout hand-off, not a final lane, ramp or signal design.
 */
export const GREATER_ACCRA_JUNCTION_APPROACHES: readonly JunctionApproach[] =
  GREATER_ACCRA_JUNCTIONS.flatMap((junction) =>
    junction.connectedSegmentIds
      .map((segmentId) => createApproach(junction.id, junction.nodeId, segmentId))
      .filter((approach): approach is JunctionApproach => approach !== undefined)
  );

export function getJunctionApproaches(junctionId: string): readonly JunctionApproach[] {
  return GREATER_ACCRA_JUNCTION_APPROACHES.filter((approach) => approach.junctionId === junctionId);
}

export function isGreaterAccraJunctionApproachCatalogueValid(): boolean {
  const ids = new Set(GREATER_ACCRA_JUNCTION_APPROACHES.map((approach) => approach.id));
  const expectedCount = GREATER_ACCRA_JUNCTIONS.reduce(
    (total, junction) => total + junction.connectedSegmentIds.length, 0
  );
  return ids.size === GREATER_ACCRA_JUNCTION_APPROACHES.length &&
    GREATER_ACCRA_JUNCTION_APPROACHES.length === expectedCount &&
    GREATER_ACCRA_JUNCTION_APPROACHES.every((approach) => {
      const junction = GREATER_ACCRA_JUNCTIONS.find((item) => item.id === approach.junctionId);
      const layout = GREATER_ACCRA_JUNCTION_LAYOUTS.find((item) => item.junctionId === approach.junctionId);
      const segment = GREATER_ACCRA_ROAD_NETWORK.segments.find((item) => item.id === approach.roadSegmentId);
      const magnitude = Math.hypot(approach.outwardDirection.x, approach.outwardDirection.z);
      return !!junction && !!layout && !!segment &&
        junction.nodeId === approach.nodeId &&
        junction.connectedSegmentIds.includes(approach.roadSegmentId) &&
        (segment.fromNodeId === approach.nodeId || segment.toNodeId === approach.nodeId) &&
        !!getProfileForSegment(approach.roadSegmentId) &&
        Number.isFinite(approach.roadWidthM) && approach.roadWidthM > 0 &&
        Number.isFinite(magnitude) && Math.abs(magnitude - 1) < 1e-6 &&
        approach.playableInFirstRelease === !segment.futureExpansion &&
        approach.controlDesign === (junction.design === "grade_separated_interchange"
          ? "grade_separated"
          : "awaiting_junction_design");
    });
}

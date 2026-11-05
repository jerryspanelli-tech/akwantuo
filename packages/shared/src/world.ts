import type { Vector3Data } from "./protocol";

export type WorldRegionKind = "country" | "metropolitan_area" | "district" | "neighbourhood" | "town";
export type WorldContentStatus = "planned" | "prototype" | "implemented";
export type WorldLocationKind =
  | "landmark"
  | "transport_hub"
  | "business_area"
  | "residential_area"
  | "public_service"
  | "beach"
  | "market"
  | "road_junction";
export type RoadClass = "motorway" | "major_road" | "urban_road" | "local_road";

export type WorldRegion = {
  id: string;
  name: string;
  kind: WorldRegionKind;
  parentId: string | null;
  status: WorldContentStatus;
};

export type WorldLocation = {
  id: string;
  name: string;
  kind: WorldLocationKind;
  regionId: string;
  status: WorldContentStatus;
  /** World-space position is deliberately optional until map layout is approved. */
  position?: Vector3Data;
};

export type WorldRoad = {
  id: string;
  name: string;
  roadClass: RoadClass;
  regionIds: string[];
  status: WorldContentStatus;
  /** Geometry is added only when the road network is laid out. */
  path?: Vector3Data[];
};

const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidWorldRegion(value: unknown): value is WorldRegion {
  if (!value || typeof value !== "object") return false;
  const region = value as Partial<WorldRegion>;
  return typeof region.id === "string" && ID_PATTERN.test(region.id) &&
    typeof region.name === "string" && region.name.trim().length > 0 &&
    ["country", "metropolitan_area", "district", "neighbourhood", "town"].includes(String(region.kind)) &&
    (region.parentId === null || (typeof region.parentId === "string" && ID_PATTERN.test(region.parentId))) &&
    ["planned", "prototype", "implemented"].includes(String(region.status));
}

export function isValidWorldLocation(value: unknown): value is WorldLocation {
  if (!value || typeof value !== "object") return false;
  const location = value as Partial<WorldLocation>;
  if (typeof location.id !== "string" || !ID_PATTERN.test(location.id) ||
      typeof location.name !== "string" || !location.name.trim() ||
      typeof location.regionId !== "string" || !ID_PATTERN.test(location.regionId) ||
      !["landmark", "transport_hub", "business_area", "residential_area", "public_service", "beach", "market", "road_junction"].includes(String(location.kind)) ||
      !["planned", "prototype", "implemented"].includes(String(location.status))) return false;
  if (location.position !== undefined) {
    const point = location.position;
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y) || !Number.isFinite(point.z)) return false;
  }
  return true;
}

export function isValidWorldRoad(value: unknown): value is WorldRoad {
  if (!value || typeof value !== "object") return false;
  const road = value as Partial<WorldRoad>;
  if (typeof road.id !== "string" || !ID_PATTERN.test(road.id) ||
      typeof road.name !== "string" || !road.name.trim() ||
      !["motorway", "major_road", "urban_road", "local_road"].includes(String(road.roadClass)) ||
      !Array.isArray(road.regionIds) ||
      !road.regionIds.every((id) => typeof id === "string" && ID_PATTERN.test(id)) ||
      !["planned", "prototype", "implemented"].includes(String(road.status))) return false;
  return road.path === undefined || (
    Array.isArray(road.path) &&
    road.path.length >= 2 &&
    road.path.every((point) => point && Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.z))
  );
}

/** Cross-reference checks for static world catalogues during development. */
export function hasValidWorldReferences(
  regions: readonly WorldRegion[],
  locations: readonly WorldLocation[],
  roads: readonly WorldRoad[]
): boolean {
  const regionIds = new Set(regions.map((region) => region.id));
  if (regionIds.size !== regions.length) return false;
  if (locations.some((location) => !regionIds.has(location.regionId))) return false;
  if (roads.some((road) => road.regionIds.some((regionId) => !regionIds.has(regionId)))) return false;
  return regions.every((region) => region.parentId === null || regionIds.has(region.parentId));
}

export type RoadNetworkNodeKind = "junction" | "interchange" | "area_anchor" | "gateway" | "future_gateway";

export type RoadNetworkNode = {
  id: string;
  name: string;
  kind: RoadNetworkNodeKind;
  regionId: string | null;
  status: WorldContentStatus;
};

export type RoadNetworkSegment = {
  id: string;
  name: string;
  roadClass: RoadClass;
  fromNodeId: string;
  toNodeId: string;
  regionIds: string[];
  status: WorldContentStatus;
  /** True when this segment leads beyond the first playable-world boundary. */
  futureExpansion?: boolean;
};

export type RoadNetwork = {
  id: string;
  name: string;
  version: number;
  nodes: readonly RoadNetworkNode[];
  segments: readonly RoadNetworkSegment[];
};

/** Checks network topology and all region/node references without requiring map coordinates. */
export function isValidRoadNetwork(
  network: RoadNetwork,
  regions: readonly WorldRegion[]
): boolean {
  if (!network.id || !ID_PATTERN.test(network.id) ||
      !network.name.trim() || !Number.isInteger(network.version) || network.version < 1) return false;

  const regionIds = new Set(regions.map((region) => region.id));
  const nodeIds = new Set(network.nodes.map((node) => node.id));
  if (nodeIds.size !== network.nodes.length) return false;
  if (network.nodes.some((node) =>
    !ID_PATTERN.test(node.id) ||
    !node.name.trim() ||
    !["junction", "interchange", "area_anchor", "gateway", "future_gateway"].includes(node.kind) ||
    (node.regionId !== null && !regionIds.has(node.regionId)) ||
    !["planned", "prototype", "implemented"].includes(node.status)
  )) return false;

  const segmentIds = new Set(network.segments.map((segment) => segment.id));
  if (segmentIds.size !== network.segments.length) return false;
  return network.segments.every((segment) =>
    ID_PATTERN.test(segment.id) &&
    segment.name.trim().length > 0 &&
    ["motorway", "major_road", "urban_road", "local_road"].includes(segment.roadClass) &&
    segment.fromNodeId !== segment.toNodeId &&
    nodeIds.has(segment.fromNodeId) &&
    nodeIds.has(segment.toNodeId) &&
    segment.regionIds.length > 0 &&
    segment.regionIds.every((regionId) => regionIds.has(regionId)) &&
    ["planned", "prototype", "implemented"].includes(segment.status) &&
    (segment.futureExpansion !== true ||
      network.nodes.some((node) =>
        node.id === segment.toNodeId && node.kind === "future_gateway"
      ))
  );
}

export type JunctionDesign =
  | "roundabout"
  | "signal_controlled"
  | "priority_controlled"
  | "grade_separated_interchange"
  | "merge_diverge"
  | "to_be_designed";

export type RoadJunction = {
  id: string;
  name: string;
  nodeId: string;
  regionId: string;
  design: JunctionDesign;
  connectedSegmentIds: string[];
  status: WorldContentStatus;
  /** Design note only; does not assert the current real-world junction layout. */
  planningNote?: string;
};

export type RoadStructureKind = "bridge" | "overpass" | "underpass" | "tunnel";

export type RoadStructure = {
  id: string;
  name: string;
  kind: RoadStructureKind;
  roadSegmentId: string;
  status: WorldContentStatus;
  /** Optional crossing road segment; populated after surveyed layout is approved. */
  crossingSegmentId?: string;
};

export function isValidRoadJunction(
  junction: RoadJunction,
  network: RoadNetwork,
  regions: readonly WorldRegion[]
): boolean {
  const node = network.nodes.find((item) => item.id === junction.nodeId);
  const regionIds = new Set(regions.map((region) => region.id));
  const segmentIds = new Set(network.segments.map((segment) => segment.id));
  if (!ID_PATTERN.test(junction.id) || !junction.name.trim() ||
      !node || !regionIds.has(junction.regionId) ||
      (node.regionId !== null && node.regionId !== junction.regionId) ||
      !["roundabout", "signal_controlled", "priority_controlled", "grade_separated_interchange", "merge_diverge", "to_be_designed"].includes(junction.design) ||
      !["planned", "prototype", "implemented"].includes(junction.status) ||
      junction.connectedSegmentIds.length < 2) return false;
  if (new Set(junction.connectedSegmentIds).size !== junction.connectedSegmentIds.length) return false;
  return junction.connectedSegmentIds.every((segmentId) => {
    if (!segmentIds.has(segmentId)) return false;
    const segment = network.segments.find((item) => item.id === segmentId);
    return segment !== undefined &&
      (segment.fromNodeId === junction.nodeId || segment.toNodeId === junction.nodeId);
  });
}

export function isValidRoadStructure(
  structure: RoadStructure,
  network: RoadNetwork
): boolean {
  const segmentIds = new Set(network.segments.map((segment) => segment.id));
  return ID_PATTERN.test(structure.id) &&
    structure.name.trim().length > 0 &&
    ["bridge", "overpass", "underpass", "tunnel"].includes(structure.kind) &&
    segmentIds.has(structure.roadSegmentId) &&
    (structure.crossingSegmentId === undefined ||
      (segmentIds.has(structure.crossingSegmentId) &&
        structure.crossingSegmentId !== structure.roadSegmentId)) &&
    ["planned", "prototype", "implemented"].includes(structure.status);
}

export type RoadSurface = "asphalt" | "concrete" | "compacted_earth" | "paving_blocks";

export type RoadCrossSectionProfile = {
  id: string;
  name: string;
  surface: RoadSurface;
  lanesPerDirection: number;
  laneWidthM: number;
  shoulderWidthM: number;
  medianWidthM: number;
  sidewalkWidthM: number;
  drainageWidthM: number;
  /** Design guidance only; dimensions are game-world targets, not surveyed measurements. */
  designNote: string;
};

export type RoadSegmentDesign = {
  roadSegmentId: string;
  crossSectionProfileId: string;
  status: WorldContentStatus;
};

export function getRoadCrossSectionWidth(profile: RoadCrossSectionProfile): number {
  return (
    profile.lanesPerDirection * 2 * profile.laneWidthM +
    profile.shoulderWidthM * 2 +
    profile.medianWidthM +
    profile.sidewalkWidthM * 2 +
    profile.drainageWidthM * 2
  );
}

export function isValidRoadCrossSectionProfile(value: unknown): value is RoadCrossSectionProfile {
  if (!value || typeof value !== "object") return false;
  const profile = value as Partial<RoadCrossSectionProfile>;
  const dimensions = [
    profile.laneWidthM,
    profile.shoulderWidthM,
    profile.medianWidthM,
    profile.sidewalkWidthM,
    profile.drainageWidthM
  ];
  return typeof profile.id === "string" && ID_PATTERN.test(profile.id) &&
    typeof profile.name === "string" && profile.name.trim().length > 0 &&
    ["asphalt", "concrete", "compacted_earth", "paving_blocks"].includes(String(profile.surface)) &&
    Number.isInteger(profile.lanesPerDirection) && (profile.lanesPerDirection ?? 0) >= 1 &&
    dimensions.every((dimension) => typeof dimension === "number" && Number.isFinite(dimension) && dimension >= 0) &&
    typeof profile.laneWidthM === "number" && profile.laneWidthM >= 2.5 && profile.laneWidthM <= 4.5 &&
    typeof profile.designNote === "string" && profile.designNote.trim().length > 0;
}

export function isValidRoadSegmentDesign(
  design: RoadSegmentDesign,
  network: RoadNetwork,
  profiles: readonly RoadCrossSectionProfile[]
): boolean {
  return network.segments.some((segment) => segment.id === design.roadSegmentId) &&
    profiles.some((profile) => profile.id === design.crossSectionProfileId) &&
    ["planned", "prototype", "implemented"].includes(design.status);
}

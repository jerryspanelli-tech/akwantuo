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

export type RoadDrainageStyle = "open_channel" | "covered_channel" | "edge_drain";
export type RoadCrossSectionProfile = {
  id: string;
  name: string;
  surface: RoadSurface;
  sidewalkSurface: "concrete" | "paving_blocks";
  drainageStyle: RoadDrainageStyle;
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
    ["concrete", "paving_blocks"].includes(String(profile.sidewalkSurface)) &&
    ["open_channel", "covered_channel", "edge_drain"].includes(String(profile.drainageStyle)) &&
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

export type RoadMarkingKind =
  | "lane_dashed"
  | "lane_solid"
  | "lane_double_solid"
  | "road_edge"
  | "stop_line"
  | "give_way_line"
  | "zebra_crossing"
  | "direction_arrow"
  | "box_junction"
  | "parking_bay";

export type RoadMarkingSpec = {
  id: string;
  kind: RoadMarkingKind;
  colour: "white" | "yellow";
  widthM: number;
  repeatLengthM?: number;
  status: WorldContentStatus;
};

export type TrafficSignalKind = "vehicle_three_aspect" | "pedestrian_two_aspect" | "arrow";
export type TrafficSignalSpec = {
  id: string;
  kind: TrafficSignalKind;
  status: WorldContentStatus;
  /** Timing is deliberately not specified until traffic simulation is designed. */
};

export type RoadSignCategory = "regulatory" | "warning" | "directional" | "information";
export type RoadSignSpec = {
  id: string;
  category: RoadSignCategory;
  name: string;
  status: WorldContentStatus;
};

export type StreetFurnitureKind = "streetlight" | "pedestrian_barrier" | "vehicle_barrier" | "bollard";
export type StreetFurnitureSpec = {
  id: string;
  kind: StreetFurnitureKind;
  status: WorldContentStatus;
};

export function isValidRoadMarkingSpec(value: unknown): value is RoadMarkingSpec {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<RoadMarkingSpec>;
  return typeof item.id === "string" && ID_PATTERN.test(item.id) &&
    ["lane_dashed", "lane_solid", "lane_double_solid", "road_edge", "stop_line", "give_way_line", "zebra_crossing", "direction_arrow", "box_junction", "parking_bay"].includes(String(item.kind)) &&
    ["white", "yellow"].includes(String(item.colour)) &&
    typeof item.widthM === "number" && Number.isFinite(item.widthM) && item.widthM > 0 && item.widthM <= 1 &&
    (item.repeatLengthM === undefined || (Number.isFinite(item.repeatLengthM) && item.repeatLengthM > 0)) &&
    ["planned", "prototype", "implemented"].includes(String(item.status));
}

export function isValidTrafficSignalSpec(value: unknown): value is TrafficSignalSpec {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<TrafficSignalSpec>;
  return typeof item.id === "string" && ID_PATTERN.test(item.id) &&
    ["vehicle_three_aspect", "pedestrian_two_aspect", "arrow"].includes(String(item.kind)) &&
    ["planned", "prototype", "implemented"].includes(String(item.status));
}

export function isValidRoadSignSpec(value: unknown): value is RoadSignSpec {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<RoadSignSpec>;
  return typeof item.id === "string" && ID_PATTERN.test(item.id) &&
    ["regulatory", "warning", "directional", "information"].includes(String(item.category)) &&
    typeof item.name === "string" && item.name.trim().length > 0 &&
    ["planned", "prototype", "implemented"].includes(String(item.status));
}

export function isValidStreetFurnitureSpec(value: unknown): value is StreetFurnitureSpec {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<StreetFurnitureSpec>;
  return typeof item.id === "string" && ID_PATTERN.test(item.id) &&
    ["streetlight", "pedestrian_barrier", "vehicle_barrier", "bollard"].includes(String(item.kind)) &&
    ["planned", "prototype", "implemented"].includes(String(item.status));
}

export type RoadsideFeatureKind =
  | "pavement"
  | "kerb"
  | "open_drain"
  | "covered_drain"
  | "culvert"
  | "bus_stop"
  | "trotro_stop"
  | "taxi_rank"
  | "vendor_stall"
  | "street_vending_zone"
  | "pedestrian_shelter"
  | "roadside_tree"
  | "utility_pole";

export type RoadsideFeatureSpec = {
  id: string;
  kind: RoadsideFeatureKind;
  name: string;
  status: WorldContentStatus;
  /** Optional design dimensions in metres; placement and dimensions are map-stage decisions. */
  widthM?: number;
  lengthM?: number;
  designNote: string;
};

export type RoadsideActivityKind =
  | "bus_boarding"
  | "trotro_boarding"
  | "taxi_pickup"
  | "informal_vending"
  | "pedestrian_waiting";

export type RoadsideActivityZone = {
  id: string;
  name: string;
  kind: RoadsideActivityKind;
  status: WorldContentStatus;
  /** Must be attached to a mapped road segment in the later placement catalogue. */
  roadSegmentId: string;
  designNote: string;
};

export function isValidRoadsideFeatureSpec(value: unknown): value is RoadsideFeatureSpec {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<RoadsideFeatureSpec>;
  return typeof item.id === "string" && ID_PATTERN.test(item.id) &&
    typeof item.name === "string" && item.name.trim().length > 0 &&
    ["pavement", "kerb", "open_drain", "covered_drain", "culvert", "bus_stop", "trotro_stop", "taxi_rank", "vendor_stall", "street_vending_zone", "pedestrian_shelter", "roadside_tree", "utility_pole"].includes(String(item.kind)) &&
    ["planned", "prototype", "implemented"].includes(String(item.status)) &&
    (item.widthM === undefined || (Number.isFinite(item.widthM) && item.widthM > 0)) &&
    (item.lengthM === undefined || (Number.isFinite(item.lengthM) && item.lengthM > 0)) &&
    typeof item.designNote === "string" && item.designNote.trim().length > 0;
}

export function isValidRoadsideActivityZone(
  value: unknown,
  network: RoadNetwork
): value is RoadsideActivityZone {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<RoadsideActivityZone>;
  return typeof item.id === "string" && ID_PATTERN.test(item.id) &&
    typeof item.name === "string" && item.name.trim().length > 0 &&
    ["bus_boarding", "trotro_boarding", "taxi_pickup", "informal_vending", "pedestrian_waiting"].includes(String(item.kind)) &&
    ["planned", "prototype", "implemented"].includes(String(item.status)) &&
    typeof item.roadSegmentId === "string" &&
    network.segments.some((segment) => segment.id === item.roadSegmentId) &&
    typeof item.designNote === "string" && item.designNote.trim().length > 0;
}

export type PublicTransportVehicleKind = "trotro" | "city_bus" | "coach" | "taxi";
export type PassengerCameraMode = "interior_window" | "interior_free_look" | "exterior_follow";
export type PassengerRideExperience = {
  availableCameraModes: PassengerCameraMode[];
  defaultCameraMode: PassengerCameraMode;
  allowLookAround: boolean;
  showWorldThroughWindows: boolean;
  status: WorldContentStatus;
};

export type PublicTransportVehicleProfile = {
  id: string;
  name: string;
  kind: PublicTransportVehicleKind;
  passengerRide: PassengerRideExperience;
  hasDriver: boolean;
  hasConductor: boolean;
  status: WorldContentStatus;
  designNote: string;
};

export type PublicTransportStop = {
  id: string;
  name: string;
  locationId: string;
  status: WorldContentStatus;
};

export type PublicTransportRoute = {
  id: string;
  name: string;
  vehicleProfileId: string;
  stopIds: string[];
  status: WorldContentStatus;
  /** Fares and travel times are configured only after routes and economy are designed. */
};

export function isValidPassengerRideExperience(value: unknown): value is PassengerRideExperience {
  if (!value || typeof value !== "object") return false;
  const ride = value as Partial<PassengerRideExperience>;
  const modes = ["interior_window", "interior_free_look", "exterior_follow"];
  return Array.isArray(ride.availableCameraModes) &&
    ride.availableCameraModes.length > 0 &&
    ride.availableCameraModes.every((mode) => modes.includes(String(mode))) &&
    new Set(ride.availableCameraModes).size === ride.availableCameraModes.length &&
    modes.includes(String(ride.defaultCameraMode)) &&
    ride.availableCameraModes.includes(ride.defaultCameraMode as PassengerCameraMode) &&
    typeof ride.allowLookAround === "boolean" &&
    typeof ride.showWorldThroughWindows === "boolean" &&
    ["planned", "prototype", "implemented"].includes(String(ride.status));
}

export function isValidPublicTransportVehicleProfile(value: unknown): value is PublicTransportVehicleProfile {
  if (!value || typeof value !== "object") return false;
  const vehicle = value as Partial<PublicTransportVehicleProfile>;
  return typeof vehicle.id === "string" && ID_PATTERN.test(vehicle.id) &&
    typeof vehicle.name === "string" && vehicle.name.trim().length > 0 &&
    ["trotro", "city_bus", "coach", "taxi"].includes(String(vehicle.kind)) &&
    isValidPassengerRideExperience(vehicle.passengerRide) &&
    typeof vehicle.hasDriver === "boolean" &&
    typeof vehicle.hasConductor === "boolean" &&
    ["planned", "prototype", "implemented"].includes(String(vehicle.status)) &&
    typeof vehicle.designNote === "string" && vehicle.designNote.trim().length > 0;
}

export function isValidPublicTransportStop(value: unknown): value is PublicTransportStop {
  if (!value || typeof value !== "object") return false;
  const stop = value as Partial<PublicTransportStop>;
  return typeof stop.id === "string" && ID_PATTERN.test(stop.id) &&
    typeof stop.name === "string" && stop.name.trim().length > 0 &&
    typeof stop.locationId === "string" && ID_PATTERN.test(stop.locationId) &&
    ["planned", "prototype", "implemented"].includes(String(stop.status));
}

export function isValidPublicTransportRoute(
  value: unknown,
  vehicles: readonly PublicTransportVehicleProfile[],
  stops: readonly PublicTransportStop[]
): value is PublicTransportRoute {
  if (!value || typeof value !== "object") return false;
  const route = value as Partial<PublicTransportRoute>;
  const vehicleIds = new Set(vehicles.map((vehicle) => vehicle.id));
  const stopIds = new Set(stops.map((stop) => stop.id));
  return typeof route.id === "string" && ID_PATTERN.test(route.id) &&
    typeof route.name === "string" && route.name.trim().length > 0 &&
    typeof route.vehicleProfileId === "string" && vehicleIds.has(route.vehicleProfileId) &&
    Array.isArray(route.stopIds) && route.stopIds.length >= 2 &&
    route.stopIds.every((stopId) => stopIds.has(stopId)) &&
    ["planned", "prototype", "implemented"].includes(String(route.status));
}

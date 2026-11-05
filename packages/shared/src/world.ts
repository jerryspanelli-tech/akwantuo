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

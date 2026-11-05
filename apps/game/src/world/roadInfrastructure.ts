import {
  isValidRoadMarkingSpec,
  isValidRoadSignSpec,
  isValidStreetFurnitureSpec,
  isValidTrafficSignalSpec,
  type RoadMarkingSpec,
  type RoadSignSpec,
  type StreetFurnitureSpec,
  type TrafficSignalSpec
} from "@akwantuo/shared";

/**
 * Reusable visual specifications for the future road-building stage.
 * These are catalogue entries, not placed objects or a claim of legal sign dimensions.
 */
export const ROAD_MARKING_CATALOGUE: readonly RoadMarkingSpec[] = [
  { id: "lane-dashed-white", kind: "lane_dashed", colour: "white", widthM: 0.10, repeatLengthM: 6, status: "planned" },
  { id: "lane-solid-white", kind: "lane_solid", colour: "white", widthM: 0.10, status: "planned" },
  { id: "lane-double-yellow", kind: "lane_double_solid", colour: "yellow", widthM: 0.10, status: "planned" },
  { id: "road-edge-white", kind: "road_edge", colour: "white", widthM: 0.12, status: "planned" },
  { id: "stop-line-white", kind: "stop_line", colour: "white", widthM: 0.40, status: "planned" },
  { id: "give-way-line-white", kind: "give_way_line", colour: "white", widthM: 0.30, status: "planned" },
  { id: "zebra-crossing-white", kind: "zebra_crossing", colour: "white", widthM: 0.50, status: "planned" },
  { id: "direction-arrow-white", kind: "direction_arrow", colour: "white", widthM: 0.60, status: "planned" },
  { id: "box-junction-yellow", kind: "box_junction", colour: "yellow", widthM: 0.10, status: "planned" },
  { id: "parking-bay-white", kind: "parking_bay", colour: "white", widthM: 0.10, status: "planned" }
] as const;

export const TRAFFIC_SIGNAL_CATALOGUE: readonly TrafficSignalSpec[] = [
  { id: "vehicle-three-aspect", kind: "vehicle_three_aspect", status: "planned" },
  { id: "pedestrian-two-aspect", kind: "pedestrian_two_aspect", status: "planned" },
  { id: "directional-arrow-signal", kind: "arrow", status: "planned" }
] as const;

export const ROAD_SIGN_CATALOGUE: readonly RoadSignSpec[] = [
  { id: "keep-left", category: "regulatory", name: "Keep left", status: "planned" },
  { id: "stop", category: "regulatory", name: "Stop", status: "planned" },
  { id: "give-way", category: "regulatory", name: "Give way", status: "planned" },
  { id: "speed-limit", category: "regulatory", name: "Speed limit", status: "planned" },
  { id: "no-entry", category: "regulatory", name: "No entry", status: "planned" },
  { id: "pedestrian-crossing-warning", category: "warning", name: "Pedestrian crossing ahead", status: "planned" },
  { id: "traffic-signal-warning", category: "warning", name: "Traffic signals ahead", status: "planned" },
  { id: "roundabout-warning", category: "warning", name: "Roundabout ahead", status: "planned" },
  { id: "junction-warning", category: "warning", name: "Junction ahead", status: "planned" },
  { id: "directional-district-sign", category: "directional", name: "District and destination direction", status: "planned" },
  { id: "motorway-direction-sign", category: "directional", name: "Motorway direction and route number", status: "planned" },
  { id: "street-name-sign", category: "information", name: "Street name", status: "planned" },
  { id: "bus-stop-sign", category: "information", name: "Bus stop", status: "planned" },
  { id: "parking-sign", category: "information", name: "Parking", status: "planned" }
] as const;

export const STREET_FURNITURE_CATALOGUE: readonly StreetFurnitureSpec[] = [
  { id: "urban-streetlight", kind: "streetlight", status: "planned" },
  { id: "pedestrian-guardrail", kind: "pedestrian_barrier", status: "planned" },
  { id: "vehicle-safety-barrier", kind: "vehicle_barrier", status: "planned" },
  { id: "roadside-bollard", kind: "bollard", status: "planned" }
] as const;

export function isRoadInfrastructureCatalogueValid(): boolean {
  const unique = (ids: readonly string[]) => new Set(ids).size === ids.length;
  return ROAD_MARKING_CATALOGUE.every(isValidRoadMarkingSpec) &&
    TRAFFIC_SIGNAL_CATALOGUE.every(isValidTrafficSignalSpec) &&
    ROAD_SIGN_CATALOGUE.every(isValidRoadSignSpec) &&
    STREET_FURNITURE_CATALOGUE.every(isValidStreetFurnitureSpec) &&
    unique(ROAD_MARKING_CATALOGUE.map((item) => item.id)) &&
    unique(TRAFFIC_SIGNAL_CATALOGUE.map((item) => item.id)) &&
    unique(ROAD_SIGN_CATALOGUE.map((item) => item.id)) &&
    unique(STREET_FURNITURE_CATALOGUE.map((item) => item.id));
}

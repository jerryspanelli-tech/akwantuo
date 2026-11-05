import {
  isValidRoadsideFeatureSpec,
  isValidRoadsideActivityZone,
  type RoadsideFeatureSpec,
  type RoadsideActivityZone
} from "@akwantuo/shared";
import { GREATER_ACCRA_ROAD_NETWORK } from "./roadNetwork";

/**
 * Reusable Ghana-inspired roadside assets and service-place archetypes.
 * These definitions are not placed at real-world coordinates yet.
 */
export const ROADSIDE_FEATURE_CATALOGUE: readonly RoadsideFeatureSpec[] = [
  {
    id: "paved-pedestrian-walkway",
    kind: "pavement",
    name: "Paved pedestrian walkway",
    status: "planned",
    widthM: 1.8,
    designNote: "Continuous pedestrian route where road reserve and frontage allow; avoid forcing pedestrians into open drains or traffic."
  },
  {
    id: "raised-road-kerb",
    kind: "kerb",
    name: "Raised concrete road kerb",
    status: "planned",
    designNote: "Separates carriageway from pavement and helps define drainage edges; kerb profile varies by street."
  },
  {
    id: "open-side-drain",
    kind: "open_drain",
    name: "Open roadside drainage channel",
    status: "planned",
    widthM: 0.45,
    designNote: "Visible concrete side drain used selectively on local streets and settlement roads; crossings require safe covers or culverts."
  },
  {
    id: "covered-side-drain",
    kind: "covered_drain",
    name: "Covered roadside drainage channel",
    status: "planned",
    widthM: 0.5,
    designNote: "Covered channel for busier pedestrian frontages; access covers and maintenance points remain visible."
  },
  {
    id: "roadside-culvert",
    kind: "culvert",
    name: "Roadside culvert crossing",
    status: "planned",
    designNote: "Allows driveway, side-street or pedestrian crossing over a drain without blocking water flow."
  },
  {
    id: "simple-bus-stop",
    kind: "bus_stop",
    name: "Public bus stop",
    status: "planned",
    designNote: "Marked boarding point with stop sign and optional shelter; only place where a safe stopping bay can be designed."
  },
  {
    id: "trotro-boarding-point",
    kind: "trotro_stop",
    name: "Trotro boarding and alighting point",
    status: "planned",
    designNote: "Recognisable shared-minibus stop with passenger waiting space; route and stopping rules are configured later."
  },
  {
    id: "taxi-rank",
    kind: "taxi_rank",
    name: "Taxi rank",
    status: "planned",
    designNote: "Designated taxi waiting and pickup area away from through lanes, with capacity and queue logic added later."
  },
  {
    id: "street-vendor-stall",
    kind: "vendor_stall",
    name: "Street vendor stall",
    status: "planned",
    designNote: "Small removable stall for selected market streets and busy frontages; keep accessible pedestrian paths and junction sightlines clear."
  },
  {
    id: "informal-vending-strip",
    kind: "street_vending_zone",
    name: "Street vending frontage",
    status: "planned",
    designNote: "A controlled frontage zone for hawkers and small traders in suitable commercial areas, not a blanket obstruction on every pavement."
  },
  {
    id: "bus-stop-shelter",
    kind: "pedestrian_shelter",
    name: "Passenger waiting shelter",
    status: "planned",
    designNote: "Weather cover for selected high-use boarding points; design varies between formal stops and informal roadside waiting areas."
  },
  {
    id: "tropical-roadside-tree",
    kind: "roadside_tree",
    name: "Tropical roadside shade tree",
    status: "planned",
    designNote: "Locally plausible shade planting with adequate clearance from signs, utilities, lighting and pedestrian movement."
  },
  {
    id: "electricity-utility-pole",
    kind: "utility_pole",
    name: "Electricity and communications pole",
    status: "planned",
    designNote: "Roadside utility infrastructure with cables routed safely above the road reserve; exact pole runs follow map and utility layout."
  }
] as const;

/**
 * No stop, rank or vendor location is assigned to a real road segment yet.
 * Add zone instances only after the road map and safe stopping locations are reviewed.
 */
export const GREATER_ACCRA_ROADSIDE_ACTIVITY_ZONES: readonly RoadsideActivityZone[] = [];

export function isRoadsideEnvironmentCatalogueValid(): boolean {
  const ids = ROADSIDE_FEATURE_CATALOGUE.map((item) => item.id);
  return ROADSIDE_FEATURE_CATALOGUE.every(isValidRoadsideFeatureSpec) &&
    new Set(ids).size === ids.length &&
    GREATER_ACCRA_ROADSIDE_ACTIVITY_ZONES.every((zone) =>
      isValidRoadsideActivityZone(zone, GREATER_ACCRA_ROAD_NETWORK)
    ) &&
    new Set(GREATER_ACCRA_ROADSIDE_ACTIVITY_ZONES.map((zone) => zone.id)).size ===
      GREATER_ACCRA_ROADSIDE_ACTIVITY_ZONES.length;
}

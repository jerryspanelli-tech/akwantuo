import { GREATER_ACCRA_RAIL_NODES } from "./railNetwork";

export type RailStationStatus = "planned" | "candidate";
export type RailStationRole = "city_terminal" | "interchange_station" | "regional_station" | "urban_stop";
export type RailPlatformArrangement = "side_platforms" | "island_platform" | "to_be_confirmed";

export type RailStationDesign = Readonly<{
  id: string;
  name: string;
  railNodeId: string;
  role: RailStationRole;
  status: RailStationStatus;
  firstRelease: boolean;
  architecture: "ultra_modern_ghanaian";
  platformArrangement: RailPlatformArrangement;
  platformCount: number | null;
  designPrinciples: readonly string[];
  facilities: readonly string[];
  passengerZones: readonly string[];
  designNote: string;
}>;

/**
 * AKWANTUO station design standard: contemporary, spacious and recognisably
 * Ghanaian. This is a design brief/catalogue, not built station geometry.
 * Platform counts, track arrangements and exact footprints remain subject
 * to verified site plans and railway operating requirements.
 */
const COMMON_DESIGN_PRINCIPLES = [
  "Contemporary Ghanaian identity with a distinctive station silhouette",
  "Clean modern façade combining glass, durable local materials and shaded public edges",
  "Large naturally lit concourse with clear sightlines and intuitive wayfinding",
  "Deep weather-protective platform canopies and rainwater management",
  "Step-free access with lifts or ramps, tactile guidance and accessible facilities",
  "Bright, energy-efficient lighting and safe, well-observed public spaces",
  "Digital passenger information with clear audio announcements",
  "Climate-responsive shading and ventilation suited to Accra's heat and rain"
] as const;

const COMMON_FACILITIES = [
  "staffed ticketing and customer service",
  "self-service ticket kiosks and future-ready fare gates",
  "live digital departure and arrival boards",
  "CCTV-monitored security and staffed assistance point",
  "accessible toilets and baby-care room",
  "first-aid room",
  "retail and food concessions",
  "drinking-water points and seating",
  "secure bicycle parking",
  "taxi, ride-hailing and public-transport interchange",
  "clear pedestrian drop-off and pick-up area"
] as const;

const COMMON_PASSENGER_ZONES = [
  "station forecourt",
  "main entrance and security transition",
  "ticketing and customer-service hall",
  "central passenger concourse",
  "vertical circulation and accessible routes",
  "platform waiting areas",
  "boarding and alighting zone",
  "staff and operations rooms"
] as const;

export const GREATER_ACCRA_RAIL_STATIONS: readonly RailStationDesign[] = [
  {
    id: "accra-central-modern-station",
    name: "Accra Central Railway Station",
    railNodeId: "accra-central-rail-station",
    role: "city_terminal",
    status: "planned",
    firstRelease: true,
    architecture: "ultra_modern_ghanaian",
    platformArrangement: "to_be_confirmed",
    platformCount: null,
    designPrinciples: COMMON_DESIGN_PRINCIPLES,
    facilities: [
      ...COMMON_FACILITIES,
      "large intercity-ready passenger hall",
      "premium waiting lounge",
      "visitor information and tourism desk",
      "generous forecourt with organised public-transport interchange"
    ],
    passengerZones: [
      ...COMMON_PASSENGER_ZONES,
      "intercity passenger waiting lounge",
      "tourism and visitor information area"
    ],
    designNote: "Flagship city-terminal design. Retain a strong civic presence and spacious passenger circulation; exact station site, footprint and platform configuration must be verified."
  },
  {
    id: "achimota-modern-station",
    name: "Achimota Railway Station",
    railNodeId: "achimota-rail-junction",
    role: "interchange_station",
    status: "planned",
    firstRelease: true,
    architecture: "ultra_modern_ghanaian",
    platformArrangement: "to_be_confirmed",
    platformCount: null,
    designPrinciples: COMMON_DESIGN_PRINCIPLES,
    facilities: [
      ...COMMON_FACILITIES,
      "clear interchange concourse for connecting services",
      "large route and platform direction displays",
      "protected transfer paths between platforms",
      "organised bus and trotro interchange"
    ],
    passengerZones: [
      ...COMMON_PASSENGER_ZONES,
      "connecting-service interchange zone",
      "bus and trotro transfer forecourt"
    ],
    designNote: "Major interchange identity for the Tema branch and northbound Eastern Line corridor. Do not finalise track/platform geometry until the real branch arrangement is verified."
  },
  {
    id: "tema-modern-station",
    name: "Tema Railway Station",
    railNodeId: "tema-rail-station",
    role: "regional_station",
    status: "planned",
    firstRelease: true,
    architecture: "ultra_modern_ghanaian",
    platformArrangement: "to_be_confirmed",
    platformCount: null,
    designPrinciples: COMMON_DESIGN_PRINCIPLES,
    facilities: [
      ...COMMON_FACILITIES,
      "regional passenger waiting hall",
      "organised connection to Tema local transport",
      "weather-protected passenger forecourt"
    ],
    passengerZones: [
      ...COMMON_PASSENGER_ZONES,
      "regional passenger waiting area",
      "local transport interchange forecourt"
    ],
    designNote: "Modern regional station serving the Tema corridor. The final location, station approach and relationship to surrounding roads require map and site review."
  },
  {
    id: "odaw-circle-candidate-stop",
    name: "Circle / Odaw Candidate Rail Stop",
    railNodeId: "odaw-rail-stop",
    role: "urban_stop",
    status: "candidate",
    firstRelease: true,
    architecture: "ultra_modern_ghanaian",
    platformArrangement: "to_be_confirmed",
    platformCount: null,
    designPrinciples: COMMON_DESIGN_PRINCIPLES,
    facilities: [
      "compact ticketing and customer-service point",
      "live digital passenger information",
      "CCTV-monitored security and staffed assistance point",
      "accessible toilets",
      "weather-protected waiting areas",
      "safe pedestrian links to nearby public transport"
    ],
    passengerZones: [
      "station entrance",
      "ticketing and waiting area",
      "accessible passenger route",
      "platform waiting and boarding zone",
      "public-transport connection"
    ],
    designNote: "Candidate only. The rail corridor marker does not prove an operating station exists at this exact location. Do not build or label it as a confirmed station until site status is verified."
  }
] as const;

export function getRailStation(stationId: string): RailStationDesign | undefined {
  return GREATER_ACCRA_RAIL_STATIONS.find((station) => station.id === stationId);
}

export function getRailStationsForNode(railNodeId: string): readonly RailStationDesign[] {
  return GREATER_ACCRA_RAIL_STATIONS.filter((station) => station.railNodeId === railNodeId);
}

export function isGreaterAccraRailStationCatalogueValid(): boolean {
  const stationIds = new Set(GREATER_ACCRA_RAIL_STATIONS.map((station) => station.id));
  const nodeIds = new Set(GREATER_ACCRA_RAIL_NODES.map((node) => node.id));
  return stationIds.size === GREATER_ACCRA_RAIL_STATIONS.length &&
    GREATER_ACCRA_RAIL_STATIONS.every((station) =>
      station.id.length > 0 &&
      station.name.trim().length > 0 &&
      nodeIds.has(station.railNodeId) &&
      station.architecture === "ultra_modern_ghanaian" &&
      ["city_terminal", "interchange_station", "regional_station", "urban_stop"].includes(station.role) &&
      ["planned", "candidate"].includes(station.status) &&
      (station.status !== "candidate" || station.platformArrangement === "to_be_confirmed") &&
      (station.platformCount === null || (Number.isInteger(station.platformCount) && station.platformCount > 0)) &&
      station.designPrinciples.length >= 5 &&
      station.facilities.length >= 5 &&
      station.passengerZones.length >= 4 &&
      station.designNote.trim().length > 0
    );
}

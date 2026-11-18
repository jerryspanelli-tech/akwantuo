import type { RoadNetworkSegment } from "@akwantuo/shared";
import { GREATER_ACCRA_ROAD_NETWORK } from "./roadNetwork";
import { GREATER_ACCRA_REGIONS } from "./regions";

/**
 * First spatial layout for Greater Accra and the N6 Accra–Kumasi corridor.
 *
 * Local map coordinates are metres: +X east, +Z north, Y elevation.
 * The layout is intentionally compressed and stylised for gameplay. It is
 * not a GPS survey, official boundary dataset or engineering alignment.
 */
export type MapPoint = Readonly<{ x: number; z: number }>;
export type MapNodePosition = Readonly<MapPoint & { nodeId: string }>;
export type MapRegionAnchor = Readonly<MapPoint & { regionId: string }>;
export type CoastlinePoint = Readonly<MapPoint & { order: number }>;
export type MapRoadPath = Readonly<{
  roadSegmentId: string;
  points: readonly MapPoint[];
  playableInFirstRelease: boolean;
  designNote: string;
}>;

export const GREATER_ACCRA_MAP_EXTENT = {
  minX: -8000,
  maxX: 13000,
  minZ: -5000,
  maxZ: 32500,
  widthM: 21000,
  depthM: 37500,
  coordinateUnit: "metres",
  orientation: { east: "+X", north: "+Z", south: "coastline / Gulf of Guinea" }
} as const;

/** Approximate district and intercity town anchors for streets and landmarks. */
export const GREATER_ACCRA_REGION_ANCHORS: readonly MapRegionAnchor[] = [
  { regionId: "greater-accra", x: 2200, z: 900 },
  { regionId: "airport-city", x: 1100, z: 350 },
  { regionId: "east-legon", x: 3900, z: 2100 },
  { regionId: "legon", x: 3300, z: 3400 },
  { regionId: "madina-adenta", x: 5700, z: 1700 },
  { regionId: "achimota", x: -1800, z: 2200 },
  { regionId: "accra-central-makola", x: -500, z: 350 },
  { regionId: "osu", x: 1100, z: -1250 },
  { regionId: "labadi", x: 2550, z: -1950 },
  { regionId: "dansoman", x: -5100, z: -850 },
  { regionId: "kaneshie", x: -2800, z: -250 },
  { regionId: "spintex", x: 5400, z: -1200 },
  { regionId: "tema", x: 8700, z: -850 },
  { regionId: "pokuase", x: -2300, z: 5000 },
  { regionId: "amasaman", x: -2450, z: 6100 },
  { regionId: "nsawam", x: -2550, z: 7200 },
  { regionId: "suhum", x: -3200, z: 10500 },
  { regionId: "bunso", x: -3800, z: 14200 },
  { regionId: "anyinam", x: -4300, z: 17100 },
  { regionId: "nkawkaw", x: -4900, z: 20500 },
  { regionId: "konongo", x: -5550, z: 25000 },
  { regionId: "ejisu", x: -6100, z: 28500 },
  { regionId: "kumasi", x: -6650, z: 31500 }
] as const;

/** Major road-network nodes positioned in the same local coordinate system. */
export const GREATER_ACCRA_MAP_NODES: readonly MapNodePosition[] = [
  { nodeId: "mallam-junction", x: -6100, z: -700 },
  { nodeId: "kaneshie-interchange", x: -2850, z: -250 },
  { nodeId: "circle-junction", x: -450, z: 450 },
  { nodeId: "caprice-junction", x: -650, z: 900 },
  { nodeId: "alajo-junction", x: -1000, z: 1250 },
  { nodeId: "apenkwa-junction", x: -1400, z: 1700 },
  { nodeId: "37-junction", x: 1250, z: -350 },
  { nodeId: "airport-city-anchor", x: 1050, z: 850 },
  { nodeId: "tetteh-quarshie-interchange", x: 3650, z: 1750 },
  { nodeId: "achimota-interchange", x: -1750, z: 2100 },
  { nodeId: "ofankor-junction", x: -2150, z: 3950 },
  { nodeId: "pokuase-junction", x: -2300, z: 5000 },
  { nodeId: "amasaman-junction", x: -2450, z: 6100 },
  { nodeId: "nsawam-junction", x: -2550, z: 7200 },
  { nodeId: "suhum-junction", x: -3200, z: 10500 },
  { nodeId: "bunso-junction", x: -3800, z: 14200 },
  { nodeId: "anyinam-junction", x: -4300, z: 17100 },
  { nodeId: "nkawkaw-junction", x: -4900, z: 20500 },
  { nodeId: "konongo-junction", x: -5550, z: 25000 },
  { nodeId: "ejisu-junction", x: -6100, z: 28500 },
  { nodeId: "kumasi-gateway", x: -6650, z: 31500 },
  { nodeId: "madina-junction", x: 5000, z: 1750 },
  { nodeId: "adenta-gateway", x: 6550, z: 950 },
  { nodeId: "osu-junction", x: 1450, z: -1350 },
  { nodeId: "labadi-anchor", x: 2750, z: -2100 },
  { nodeId: "spintex-junction", x: 5600, z: -1150 },
  { nodeId: "tema-motorway-junction", x: 9000, z: -750 },
  { nodeId: "prampram-expansion-gateway", x: 12200, z: -350 }
] as const;

/**
 * Stylised southern shoreline. It is a coastline guide for terrain shaping,
 * not a claim about exact shoreline coordinates or tidal conditions.
 */
export const GREATER_ACCRA_COASTLINE: readonly CoastlinePoint[] = [
  { order: 0, x: -8000, z: -3050 },
  { order: 1, x: -6500, z: -2850 },
  { order: 2, x: -5000, z: -3150 },
  { order: 3, x: -3600, z: -2900 },
  { order: 4, x: -2200, z: -3250 },
  { order: 5, x: -700, z: -3000 },
  { order: 6, x: 900, z: -3350 },
  { order: 7, x: 2500, z: -3150 },
  { order: 8, x: 4100, z: -3450 },
  { order: 9, x: 5700, z: -3200 },
  { order: 10, x: 7400, z: -3500 },
  { order: 11, x: 9200, z: -3250 },
  { order: 12, x: 10800, z: -3550 },
  { order: 13, x: 13000, z: -3350 }
] as const;

/** Road centreline guide paths, connecting exactly to their network nodes. */
export const GREATER_ACCRA_ROAD_PATHS: readonly MapRoadPath[] = [
  {
    roadSegmentId: "n1-west-approach",
    points: [{ x: -6100, z: -700 }, { x: -4700, z: -500 }, { x: -3550, z: -350 }, { x: -2850, z: -250 }],
    playableInFirstRelease: true,
    designNote: "Western approach from Mallam toward Kaneshie; reserve frontage roads and local access."
  },
  {
    roadSegmentId: "n1-central-approach",
    points: [{ x: -2850, z: -250 }, { x: -1900, z: 0 }, { x: -1050, z: 250 }, { x: -450, z: 450 }],
    playableInFirstRelease: true,
    designNote: "Central approach into the Circle interchange; detailed ramps and local links remain to be designed."
  },
  {
    roadSegmentId: "n1-tema-corridor",
    points: [{ x: -450, z: 450 }, { x: 1600, z: 250 }, { x: 3650, z: 50 }, { x: 5900, z: -250 }, { x: 7600, z: -550 }, { x: 9000, z: -750 }],
    playableInFirstRelease: true,
    designNote: "Eastern corridor toward Tema; local geometry must distinguish highway carriageways from urban frontage."
  },
  {
    roadSegmentId: "n6-circle-caprice",
    points: [{ x: -450, z: 450 }, { x: -520, z: 620 }, { x: -650, z: 900 }],
    playableInFirstRelease: true,
    designNote: "N6 north-west approach from Circle toward Caprice; schematic centreline pending detailed junction survey."
  },
  {
    roadSegmentId: "n6-caprice-alajo",
    points: [{ x: -650, z: 900 }, { x: -790, z: 1060 }, { x: -1000, z: 1250 }],
    playableInFirstRelease: true,
    designNote: "N6 continuation from Caprice through the Alajo corridor; schematic centreline pending detailed junction survey."
  },
  {
    roadSegmentId: "n6-alajo-apenkwa",
    points: [{ x: -1000, z: 1250 }, { x: -1180, z: 1450 }, { x: -1400, z: 1700 }],
    playableInFirstRelease: true,
    designNote: "N6 continuation through Alajo toward Apenkwa; schematic centreline pending detailed junction survey."
  },
  {
    roadSegmentId: "n6-apenkwa-achimota",
    points: [{ x: -1400, z: 1700 }, { x: -1560, z: 1880 }, { x: -1750, z: 2100 }],
    playableInFirstRelease: true,
    designNote: "N6 connection from Apenkwa to Achimota Interchange; schematic centreline pending detailed junction survey."
  },
  {
    roadSegmentId: "n6-achimota-ofankor",
    points: [{ x: -1750, z: 2100 }, { x: -1900, z: 2750 }, { x: -2050, z: 3400 }, { x: -2150, z: 3950 }],
    playableInFirstRelease: true,
    designNote: "Northbound Achimota–Ofankor corridor."
  },
  {
    roadSegmentId: "n6-ofankor-pokuase",
    points: [{ x: -2150, z: 3950 }, { x: -2200, z: 4400 }, { x: -2250, z: 4700 }, { x: -2300, z: 5000 }],
    playableInFirstRelease: true,
    designNote: "N6 continues north from Ofankor through Pokuase; compressed game-scale alignment, not surveyed."
  },
  {
    roadSegmentId: "n6-pokuase-amasaman",
    points: [{ x: -2300, z: 5000 }, { x: -2360, z: 5400 }, { x: -2410, z: 5800 }, { x: -2450, z: 6100 }],
    playableInFirstRelease: true,
    designNote: "N6 Pokuase–Amasaman corridor; compressed game-scale alignment, not surveyed."
  },
  {
    roadSegmentId: "n6-amasaman-nsawam",
    points: [{ x: -2450, z: 6100 }, { x: -2480, z: 6450 }, { x: -2520, z: 6850 }, { x: -2550, z: 7200 }],
    playableInFirstRelease: true,
    designNote: "N6 Amasaman–Nsawam approach; compressed game-scale alignment, not surveyed."
  },
  {
    roadSegmentId: "n6-nsawam-suhum",
    points: [{ x: -2550, z: 7200 }, { x: -2700, z: 8000 }, { x: -2850, z: 8750 }, { x: -3000, z: 9500 }, { x: -3120, z: 10100 }, { x: -3200, z: 10500 }],
    playableInFirstRelease: true,
    designNote: "N6 leaves Nsawam toward Suhum through the Eastern Region; compressed intercity corridor, not surveyed."
  },
  {
    roadSegmentId: "n6-suhum-bunso",
    points: [{ x: -3200, z: 10500 }, { x: -3400, z: 11200 }, { x: -3550, z: 12100 }, { x: -3650, z: 13200 }, { x: -3800, z: 14200 }],
    playableInFirstRelease: true,
    designNote: "N6 Suhum–Bunso corridor; compressed intercity alignment, not surveyed."
  },
  {
    roadSegmentId: "n6-bunso-anyinam",
    points: [{ x: -3800, z: 14200 }, { x: -3950, z: 15000 }, { x: -4100, z: 15900 }, { x: -4200, z: 16500 }, { x: -4300, z: 17100 }],
    playableInFirstRelease: true,
    designNote: "N6 Bunso–Anyinam corridor; compressed intercity alignment, not surveyed."
  },
  {
    roadSegmentId: "n6-anyinam-nkawkaw",
    points: [{ x: -4300, z: 17100 }, { x: -4450, z: 17800 }, { x: -4600, z: 18700 }, { x: -4750, z: 19600 }, { x: -4900, z: 20500 }],
    playableInFirstRelease: true,
    designNote: "N6 Anyinam–Nkawkaw corridor approaching the Kwahu area; compressed alignment, not surveyed."
  },
  {
    roadSegmentId: "n6-nkawkaw-konongo",
    points: [{ x: -4900, z: 20500 }, { x: -5050, z: 21500 }, { x: -5200, z: 22500 }, { x: -5350, z: 23800 }, { x: -5550, z: 25000 }],
    playableInFirstRelease: true,
    designNote: "N6 Nkawkaw–Konongo corridor; compressed intercity alignment, not surveyed."
  },
  {
    roadSegmentId: "n6-konongo-ejisu",
    points: [{ x: -5550, z: 25000 }, { x: -5700, z: 26000 }, { x: -5850, z: 27000 }, { x: -6000, z: 28000 }, { x: -6100, z: 28500 }],
    playableInFirstRelease: true,
    designNote: "N6 Konongo–Ejisu corridor into Ashanti Region; compressed alignment, not surveyed."
  },
  {
    roadSegmentId: "n6-ejisu-kumasi",
    points: [{ x: -6100, z: 28500 }, { x: -6250, z: 29200 }, { x: -6400, z: 30000 }, { x: -6500, z: 30800 }, { x: -6650, z: 31500 }],
    playableInFirstRelease: true,
    designNote: "N6 Ejisu–Kumasi approach and city gateway; compressed alignment, not surveyed."
  },
  {
    roadSegmentId: "n4-madina-approach",
    points: [{ x: 3650, z: 1750 }, { x: 4150, z: 1800 }, { x: 4600, z: 1775 }, { x: 5000, z: 1750 }],
    playableInFirstRelease: true,
    designNote: "N4 approach from Tetteh Quarshie toward Madina."
  },
  {
    roadSegmentId: "n4-adenta-corridor",
    points: [{ x: 5000, z: 1750 }, { x: 5550, z: 1550 }, { x: 6100, z: 1250 }, { x: 6550, z: 950 }],
    playableInFirstRelease: true,
    designNote: "Eastern N4 corridor toward Adenta."
  },
  {
    roadSegmentId: "liberation-road",
    points: [{ x: 1050, z: 850 }, { x: 1150, z: 450 }, { x: 1250, z: -350 }],
    playableInFirstRelease: true,
    designNote: "Airport City connection to the 37 / Ridge junction."
  },
  {
    roadSegmentId: "ring-road-central",
    points: [{ x: -450, z: 450 }, { x: 150, z: 200 }, { x: 750, z: -50 }, { x: 1250, z: -350 }],
    playableInFirstRelease: true,
    designNote: "Central Ring Road connection; detailed urban turns and intersections are separate layout work."
  },
  {
    roadSegmentId: "ring-road-coastal",
    points: [{ x: 1250, z: -350 }, { x: 1450, z: -700 }, { x: 1450, z: -1050 }, { x: 1450, z: -1350 }],
    playableInFirstRelease: true,
    designNote: "Coastal-side connection from 37 / Ridge toward Osu."
  },
  {
    roadSegmentId: "la-beach-road",
    points: [{ x: 1450, z: -1350 }, { x: 1850, z: -1650 }, { x: 2300, z: -1900 }, { x: 2750, z: -2100 }],
    playableInFirstRelease: true,
    designNote: "Osu–Labadi coastal urban connector."
  },
  {
    roadSegmentId: "spintex-road",
    points: [{ x: 3650, z: 1750 }, { x: 4150, z: 1050 }, { x: 4750, z: 100 }, { x: 5600, z: -1150 }],
    playableInFirstRelease: true,
    designNote: "South-east corridor from Tetteh Quarshie toward Spintex."
  },
  {
    roadSegmentId: "spintex-tema-connection",
    points: [{ x: 5600, z: -1150 }, { x: 6800, z: -1000 }, { x: 7900, z: -900 }, { x: 9000, z: -750 }],
    playableInFirstRelease: true,
    designNote: "Spintex–Tema connection; final junction and coastal access geometry remains open."
  },
  {
    roadSegmentId: "n2-prampram-expansion",
    points: [{ x: 9000, z: -750 }, { x: 10300, z: -600 }, { x: 11200, z: -450 }, { x: 12200, z: -350 }],
    playableInFirstRelease: false,
    designNote: "Future eastern expansion toward Prampram; keep beyond the first-release playable boundary."
  }
] as const;

export function getMapNodePosition(nodeId: string): MapNodePosition | undefined {
  return GREATER_ACCRA_MAP_NODES.find((node) => node.nodeId === nodeId);
}

export function getMapRoadPath(roadSegmentId: string): MapRoadPath | undefined {
  return GREATER_ACCRA_ROAD_PATHS.find((path) => path.roadSegmentId === roadSegmentId);
}

/** Guards coordinate coverage, map bounds, graph references and path endpoints. */
export function isGreaterAccraMapLayoutValid(): boolean {
  const regionIds = new Set(GREATER_ACCRA_REGIONS.map((region) => region.id));
  const networkNodeIds = new Set(GREATER_ACCRA_ROAD_NETWORK.nodes.map((node) => node.id));
  const networkSegmentIds = new Set(GREATER_ACCRA_ROAD_NETWORK.segments.map((segment) => segment.id));
  const nodeIds = new Set(GREATER_ACCRA_MAP_NODES.map((node) => node.nodeId));
  const regionAnchorIds = new Set(GREATER_ACCRA_REGION_ANCHORS.map((anchor) => anchor.regionId));
  const pathIds = new Set(GREATER_ACCRA_ROAD_PATHS.map((path) => path.roadSegmentId));

  if (nodeIds.size !== GREATER_ACCRA_MAP_NODES.length ||
      regionAnchorIds.size !== GREATER_ACCRA_REGION_ANCHORS.length ||
      pathIds.size !== GREATER_ACCRA_ROAD_PATHS.length ||
      pathIds.size !== GREATER_ACCRA_ROAD_NETWORK.segments.length) return false;

  if (GREATER_ACCRA_COASTLINE.length < 2 ||
      GREATER_ACCRA_COASTLINE.some((point, index) =>
        point.order !== index || !Number.isFinite(point.x) || !Number.isFinite(point.z) ||
        point.x < GREATER_ACCRA_MAP_EXTENT.minX || point.x > GREATER_ACCRA_MAP_EXTENT.maxX ||
        point.z < GREATER_ACCRA_MAP_EXTENT.minZ || point.z > GREATER_ACCRA_MAP_EXTENT.maxZ
      )) return false;

  if (GREATER_ACCRA_MAP_NODES.some((node) =>
    !networkNodeIds.has(node.nodeId) ||
    !Number.isFinite(node.x) || !Number.isFinite(node.z) ||
    node.x < GREATER_ACCRA_MAP_EXTENT.minX || node.x > GREATER_ACCRA_MAP_EXTENT.maxX ||
    node.z < GREATER_ACCRA_MAP_EXTENT.minZ || node.z > GREATER_ACCRA_MAP_EXTENT.maxZ
  )) return false;

  if (GREATER_ACCRA_MAP_NODES.length !== GREATER_ACCRA_ROAD_NETWORK.nodes.length) return false;

  if (GREATER_ACCRA_REGION_ANCHORS.some((anchor) =>
    !regionIds.has(anchor.regionId) || !Number.isFinite(anchor.x) || !Number.isFinite(anchor.z)
  )) return false;
  if (GREATER_ACCRA_REGION_ANCHORS.length !== GREATER_ACCRA_REGIONS.length) return false;

  return GREATER_ACCRA_ROAD_PATHS.every((path) => {
    if (!networkSegmentIds.has(path.roadSegmentId) || path.points.length < 2) return false;
    const segment = GREATER_ACCRA_ROAD_NETWORK.segments.find((item: RoadNetworkSegment) => item.id === path.roadSegmentId);
    if (!segment) return false;
    const from = getMapNodePosition(segment.fromNodeId);
    const to = getMapNodePosition(segment.toNodeId);
    const first = path.points[0];
    const last = path.points[path.points.length - 1];
    return !!from && !!to &&
      first.x === from.x && first.z === from.z &&
      last.x === to.x && last.z === to.z &&
      path.points.every((point) =>
        Number.isFinite(point.x) && Number.isFinite(point.z) &&
        point.x >= GREATER_ACCRA_MAP_EXTENT.minX && point.x <= GREATER_ACCRA_MAP_EXTENT.maxX &&
        point.z >= GREATER_ACCRA_MAP_EXTENT.minZ && point.z <= GREATER_ACCRA_MAP_EXTENT.maxZ
      ) &&
      path.playableInFirstRelease === !segment.futureExpansion;
  });
}

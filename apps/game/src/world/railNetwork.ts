import { GREATER_ACCRA_MAP_EXTENT, GREATER_ACCRA_MAP_NODES, type MapPoint } from "./greaterAccraLayout";

export type RailNodeKind = "station" | "junction" | "future_gateway";
export type RailLineStatus = "prototype" | "planned";

export type RailNetworkNode = Readonly<{
  id: string;
  name: string;
  kind: RailNodeKind;
  position: MapPoint;
  firstRelease: boolean;
  designNote: string;
}>;

export type RailNetworkRoute = Readonly<{
  id: string;
  name: string;
  fromNodeId: string;
  toNodeId: string;
  gaugeMm: 1067;
  firstRelease: boolean;
  points: readonly MapPoint[];
  designNote: string;
}>;

/**
 * Greater Accra rail topology reference. The official Eastern Railway Line
 * branches at Achimota: the main corridor continues toward Nsawam/Kumasi and
 * the branch runs to Tema. Odaw is represented as a provisional Circle-area
 * stop/corridor reference, not a surveyed station location.
 */
export const GREATER_ACCRA_RAIL_NODES: readonly RailNetworkNode[] = [
  {
    id: "accra-central-rail-station",
    name: "Accra Central Railway Station",
    kind: "station",
    position: { x: -250, z: 150 },
    firstRelease: true,
    designNote: "Approximate game anchor in Accra Central; verify station footprint and exact entrance against current mapping."
  },
  {
    id: "odaw-rail-stop",
    name: "Odaw / Circle rail corridor",
    kind: "station",
    position: { x: -450, z: 450 },
    firstRelease: true,
    designNote: "Provisional Circle-area rail stop/corridor marker. Do not treat this as confirmation of an operating station or exact platform position."
  },
  {
    id: "achimota-rail-junction",
    name: "Achimota Railway Junction",
    kind: "junction",
    position: { x: -1750, z: 2100 },
    firstRelease: true,
    designNote: "Branch point for the Tema line and the northbound Eastern Line; game anchor aligned with the Achimota district reference."
  },
  {
    id: "tema-rail-station",
    name: "Tema Railway Station",
    kind: "station",
    position: { x: 8700, z: -850 },
    firstRelease: true,
    designNote: "Approximate Tema district rail destination anchor; station footprint and branch alignment require site review."
  },
  {
    id: "nsawam-rail-gateway",
    name: "Nsawam Railway Corridor Gateway",
    kind: "future_gateway",
    position: { x: -2550, z: 7200 },
    firstRelease: false,
    designNote: "Expansion gateway only. Keep the beyond-Ofankor rail corridor outside first-release playable space."
  }
] as const;

/**
 * The branch point is Achimota, not Odaw/Circle. Routes are schematic centreline
 * guides in the shared Greater Accra coordinate system, not surveyed track data.
 */
export const GREATER_ACCRA_RAIL_ROUTES: readonly RailNetworkRoute[] = [
  {
    id: "accra-odaw-achimota",
    name: "Accra Central–Odaw–Achimota",
    fromNodeId: "accra-central-rail-station",
    toNodeId: "achimota-rail-junction",
    gaugeMm: 1067,
    firstRelease: true,
    points: [
      { x: -250, z: 150 },
      { x: -450, z: 450 },
      { x: -760, z: 820 },
      { x: -1120, z: 1280 },
      { x: -1480, z: 1740 },
      { x: -1750, z: 2100 }
    ],
    designNote: "Provisional Accra–Odaw–Achimota trunk alignment. The Odaw marker is a corridor reference, not a verified station."
  },
  {
    id: "achimota-to-tema",
    name: "Achimota–Tema branch",
    fromNodeId: "achimota-rail-junction",
    toNodeId: "tema-rail-station",
    gaugeMm: 1067,
    firstRelease: true,
    points: [
      { x: -1750, z: 2100 },
      { x: -950, z: 1450 },
      { x: 250, z: 650 },
      { x: 1750, z: 0 },
      { x: 3650, z: -650 },
      { x: 5600, z: -1000 },
      { x: 7300, z: -900 },
      { x: 8700, z: -850 }
    ],
    designNote: "Schematic branch from Achimota toward Tema. Intermediate bends are game-layout placeholders, not surveyed track alignment."
  },
  {
    id: "achimota-to-nsawam",
    name: "Achimota–Nsawam Eastern Line",
    fromNodeId: "achimota-rail-junction",
    toNodeId: "nsawam-rail-gateway",
    gaugeMm: 1067,
    firstRelease: false,
    points: [
      { x: -1750, z: 2100 },
      { x: -1880, z: 3050 },
      { x: -2120, z: 4100 },
      { x: -2300, z: 5400 },
      { x: -2550, z: 7200 }
    ],
    designNote: "Northbound corridor reference to the Nsawam gateway. It is excluded from first-release play and must be refined with verified track mapping."
  }
] as const;

export function getRailRoute(routeId: string): RailNetworkRoute | undefined {
  return GREATER_ACCRA_RAIL_ROUTES.find((route) => route.id === routeId);
}

export function getRailRoutesFrom(nodeId: string): readonly RailNetworkRoute[] {
  return GREATER_ACCRA_RAIL_ROUTES.filter((route) => route.fromNodeId === nodeId);
}

export function isGreaterAccraRailNetworkValid(): boolean {
  const nodeIds = new Set(GREATER_ACCRA_RAIL_NODES.map((node) => node.id));
  const mapNodeIds = new Set(GREATER_ACCRA_MAP_NODES.map((node) => node.nodeId));
  const routeIds = new Set(GREATER_ACCRA_RAIL_ROUTES.map((route) => route.id));
  if (nodeIds.size !== GREATER_ACCRA_RAIL_NODES.length ||
      routeIds.size !== GREATER_ACCRA_RAIL_ROUTES.length) return false;

  const nodesValid = GREATER_ACCRA_RAIL_NODES.every((node) =>
    node.id.length > 0 &&
    node.name.length > 0 &&
    Number.isFinite(node.position.x) &&
    Number.isFinite(node.position.z) &&
    node.position.x >= GREATER_ACCRA_MAP_EXTENT.minX &&
    node.position.x <= GREATER_ACCRA_MAP_EXTENT.maxX &&
    node.position.z >= GREATER_ACCRA_MAP_EXTENT.minZ &&
    node.position.z <= GREATER_ACCRA_MAP_EXTENT.maxZ &&
    (node.kind !== "future_gateway" || !node.firstRelease) &&
    (node.id !== "achimota-rail-junction" || mapNodeIds.has("achimota-interchange"))
  );
  if (!nodesValid) return false;

  return GREATER_ACCRA_RAIL_ROUTES.every((route) => {
    const from = GREATER_ACCRA_RAIL_NODES.find((node) => node.id === route.fromNodeId);
    const to = GREATER_ACCRA_RAIL_NODES.find((node) => node.id === route.toNodeId);
    const first = route.points[0];
    const last = route.points[route.points.length - 1];
    return !!from && !!to &&
      route.points.length >= 2 &&
      first.x === from.position.x && first.z === from.position.z &&
      last.x === to.position.x && last.z === to.position.z &&
      route.gaugeMm === 1067 &&
      route.firstRelease === (from.firstRelease && to.firstRelease) &&
      route.points.every((point) =>
        Number.isFinite(point.x) && Number.isFinite(point.z) &&
        point.x >= GREATER_ACCRA_MAP_EXTENT.minX &&
        point.x <= GREATER_ACCRA_MAP_EXTENT.maxX &&
        point.z >= GREATER_ACCRA_MAP_EXTENT.minZ &&
        point.z <= GREATER_ACCRA_MAP_EXTENT.maxZ
      );
  });
}

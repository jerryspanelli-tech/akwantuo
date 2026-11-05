import { GREATER_ACCRA_JUNCTIONS } from "./junctions";
import { GREATER_ACCRA_ROAD_NETWORK } from "./roadNetwork";
import { getMapNodePosition, GREATER_ACCRA_MAP_EXTENT } from "./greaterAccraLayout";

export type JunctionLayout = Readonly<{
  junctionId: string;
  nodeId: string;
  centre: Readonly<{ x: number; z: number }>;
  /** Reserved concept envelope in metres, not an engineering footprint. */
  reserveWidthM: number;
  reserveDepthM: number;
  designNote: string;
}>;

/**
 * Spatial reservations for the first major junctions.
 * Envelopes are provisional game-layout allowances; ramps, levels, lanes,
 * traffic phases and exact real-world geometry are not defined here.
 */
export const GREATER_ACCRA_JUNCTION_LAYOUTS: readonly JunctionLayout[] = [
  {
    junctionId: "kaneshie-interchange-junction",
    nodeId: "kaneshie-interchange",
    centre: { x: -2850, z: -250 },
    reserveWidthM: 1100,
    reserveDepthM: 850,
    designNote: "Reserve a multi-level interchange area and room for local distributor roads; keep detailed ramp paths separate."
  },
  {
    junctionId: "circle-interchange-junction",
    nodeId: "circle-junction",
    centre: { x: -450, z: 450 },
    reserveWidthM: 1350,
    reserveDepthM: 1100,
    designNote: "Largest central interchange reservation; allow separated through movements and safe pedestrian connections."
  },
  {
    junctionId: "37-ridge-junction",
    nodeId: "37-junction",
    centre: { x: 1250, z: -350 },
    reserveWidthM: 700,
    reserveDepthM: 650,
    designNote: "Urban multi-approach junction reservation; final signal control and turning lanes await detailed design."
  },
  {
    junctionId: "tetteh-quarshie-interchange-junction",
    nodeId: "tetteh-quarshie-interchange",
    centre: { x: 3650, z: 1750 },
    reserveWidthM: 1250,
    reserveDepthM: 900,
    designNote: "Reserve a grade-separated interchange envelope with space for N4 and Spintex movements."
  },
  {
    junctionId: "madina-junction",
    nodeId: "madina-junction",
    centre: { x: 5000, z: 1750 },
    reserveWidthM: 650,
    reserveDepthM: 550,
    designNote: "Busy urban junction reservation with pedestrian crossing space and controlled public-transport stopping nearby."
  },
  {
    junctionId: "osu-connection-junction",
    nodeId: "osu-junction",
    centre: { x: 1450, z: -1350 },
    reserveWidthM: 550,
    reserveDepthM: 450,
    designNote: "Compact coastal urban connection; preserve pedestrian movement and frontage access."
  },
  {
    junctionId: "spintex-road-junction",
    nodeId: "spintex-junction",
    centre: { x: 5600, z: -1150 },
    reserveWidthM: 700,
    reserveDepthM: 550,
    designNote: "Commercial-corridor junction reservation with space for turning lanes and safe roadside activity."
  },
  {
    junctionId: "tema-motorway-junction",
    nodeId: "tema-motorway-junction",
    centre: { x: 9000, z: -750 },
    reserveWidthM: 1000,
    reserveDepthM: 800,
    designNote: "Eastern network decision point; retain room for motorway approaches and the future Prampram gateway."
  }
] as const;

export function isGreaterAccraJunctionLayoutValid(): boolean {
  const junctionIds = new Set(GREATER_ACCRA_JUNCTIONS.map((junction) => junction.id));
  const layoutIds = new Set(GREATER_ACCRA_JUNCTION_LAYOUTS.map((layout) => layout.junctionId));
  const nodeIds = new Set(GREATER_ACCRA_ROAD_NETWORK.nodes.map((node) => node.id));

  return layoutIds.size === GREATER_ACCRA_JUNCTION_LAYOUTS.length &&
    layoutIds.size === GREATER_ACCRA_JUNCTIONS.length &&
    GREATER_ACCRA_JUNCTION_LAYOUTS.every((layout) => {
      const junction = GREATER_ACCRA_JUNCTIONS.find((item) => item.id === layout.junctionId);
      const nodePosition = getMapNodePosition(layout.nodeId);
      return junctionIds.has(layout.junctionId) &&
        !!junction && junction.nodeId === layout.nodeId &&
        nodeIds.has(layout.nodeId) && !!nodePosition &&
        layout.centre.x === nodePosition.x && layout.centre.z === nodePosition.z &&
        Number.isFinite(layout.reserveWidthM) && layout.reserveWidthM > 0 &&
        Number.isFinite(layout.reserveDepthM) && layout.reserveDepthM > 0 &&
        layout.centre.x - layout.reserveWidthM / 2 >= GREATER_ACCRA_MAP_EXTENT.minX &&
        layout.centre.x + layout.reserveWidthM / 2 <= GREATER_ACCRA_MAP_EXTENT.maxX &&
        layout.centre.z - layout.reserveDepthM / 2 >= GREATER_ACCRA_MAP_EXTENT.minZ &&
        layout.centre.z + layout.reserveDepthM / 2 <= GREATER_ACCRA_MAP_EXTENT.maxZ;
    });
}

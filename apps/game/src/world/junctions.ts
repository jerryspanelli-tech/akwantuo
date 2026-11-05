import {
  isValidRoadJunction,
  isValidRoadStructure,
  type RoadJunction,
  type RoadStructure
} from "@akwantuo/shared";
import { GREATER_ACCRA_REGIONS } from "./regions";
import { GREATER_ACCRA_ROAD_NETWORK } from "./roadNetwork";

/**
 * Concept-level junction catalogue.
 * Design values are planning archetypes, not a claim about current on-site layouts.
 */
export const GREATER_ACCRA_JUNCTIONS: readonly RoadJunction[] = [
  {
    id: "kaneshie-interchange-junction",
    name: "Kaneshie Interchange",
    nodeId: "kaneshie-interchange",
    regionId: "kaneshie",
    design: "grade_separated_interchange",
    connectedSegmentIds: ["n1-west-approach", "n1-central-approach"],
    status: "planned",
    planningNote: "Reserve space for separated traffic movements; exact ramps and local connections await map design."
  },
  {
    id: "circle-interchange-junction",
    name: "Kwame Nkrumah Circle",
    nodeId: "circle-junction",
    regionId: "accra-central-makola",
    design: "grade_separated_interchange",
    connectedSegmentIds: ["n1-central-approach", "n1-tema-corridor", "ring-road-central"],
    status: "planned",
    planningNote: "Model as a major multi-level interchange; detailed ramp topology and surrounding streets await map design."
  },
  {
    id: "37-ridge-junction",
    name: "37 / Ridge Junction",
    nodeId: "37-junction",
    regionId: "airport-city",
    design: "to_be_designed",
    connectedSegmentIds: ["liberation-road", "ring-road-central", "ring-road-coastal"],
    status: "planned",
    planningNote: "Keep multiple approaches available; choose signal control, turning lanes and pedestrian phases during layout."
  },
  {
    id: "tetteh-quarshie-interchange-junction",
    name: "Tetteh Quarshie Interchange",
    nodeId: "tetteh-quarshie-interchange",
    regionId: "east-legon",
    design: "grade_separated_interchange",
    connectedSegmentIds: ["n4-madina-approach", "spintex-road"],
    status: "planned",
    planningNote: "Reserve a grade-separated interchange footprint; verify all approaches and ramps during geography review."
  },
  {
    id: "madina-junction",
    name: "Madina Junction",
    nodeId: "madina-junction",
    regionId: "madina-adenta",
    design: "to_be_designed",
    connectedSegmentIds: ["n4-madina-approach", "n4-adenta-corridor"],
    status: "planned",
    planningNote: "Allow for busy urban traffic, pedestrian crossings and public-transport stopping areas."
  },
  {
    id: "osu-connection-junction",
    name: "Osu Connection",
    nodeId: "osu-junction",
    regionId: "osu",
    design: "to_be_designed",
    connectedSegmentIds: ["ring-road-coastal", "la-beach-road"],
    status: "planned"
  },
  {
    id: "spintex-road-junction",
    name: "Spintex Road Connection",
    nodeId: "spintex-junction",
    regionId: "spintex",
    design: "to_be_designed",
    connectedSegmentIds: ["spintex-road", "spintex-tema-connection"],
    status: "planned",
    planningNote: "Allow for signalised access and local commercial-road connections where required."
  },
  {
    id: "tema-motorway-junction",
    name: "Tema Motorway Connection",
    nodeId: "tema-motorway-junction",
    regionId: "tema",
    design: "to_be_designed",
    connectedSegmentIds: ["n1-tema-corridor", "spintex-tema-connection", "n2-prampram-expansion"],
    status: "planned",
    planningNote: "Treat as a major eastern network decision point; retain the future eastern expansion stub."
  }
] as const;

/**
 * Structure types are ready, but no specific bridge/overpass is placed yet.
 * Actual crossings must be confirmed when the road geometry is laid out.
 */
export const GREATER_ACCRA_ROAD_STRUCTURES: readonly RoadStructure[] = [];

export function isGreaterAccraJunctionCatalogueValid(): boolean {
  return GREATER_ACCRA_JUNCTIONS.every((junction) =>
    isValidRoadJunction(junction, GREATER_ACCRA_ROAD_NETWORK, GREATER_ACCRA_REGIONS)
  );
}

export function isGreaterAccraRoadStructureCatalogueValid(): boolean {
  return GREATER_ACCRA_ROAD_STRUCTURES.every((structure) =>
    isValidRoadStructure(structure, GREATER_ACCRA_ROAD_NETWORK)
  );
}

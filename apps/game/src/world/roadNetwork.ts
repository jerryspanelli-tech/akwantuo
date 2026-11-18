import { isValidRoadNetwork, type RoadNetwork } from "@akwantuo/shared";
import { GREATER_ACCRA_REGIONS } from "./regions";

/**
 * Topology-only road plan for Greater Accra and the N6 Accra–Kumasi corridor.
 * Node order expresses intended connectivity, not surveyed geometry or distance.
 * Coordinates, lanes, carriageways, turn restrictions and exact alignments come later.
 */
export const GREATER_ACCRA_ROAD_NETWORK: RoadNetwork = {
  id: "greater-accra-primary-roads",
  name: "Greater Accra and Accra–Kumasi Primary Road Network",
  version: 2,
  nodes: [
    { id: "mallam-junction", name: "Mallam Junction", kind: "junction", regionId: "dansoman", status: "planned" },
    { id: "kaneshie-interchange", name: "Kaneshie Interchange", kind: "interchange", regionId: "kaneshie", status: "planned" },
    { id: "circle-junction", name: "Kwame Nkrumah Circle", kind: "interchange", regionId: "accra-central-makola", status: "planned" },
    { id: "caprice-junction", name: "Caprice Junction", kind: "junction", regionId: "accra-central-makola", status: "planned" },
    { id: "alajo-junction", name: "Alajo Junction", kind: "junction", regionId: "accra-central-makola", status: "planned" },
    { id: "apenkwa-junction", name: "Apenkwa Junction", kind: "junction", regionId: "achimota", status: "planned" },
    { id: "37-junction", name: "37 / Ridge Junction", kind: "junction", regionId: "airport-city", status: "planned" },
    { id: "airport-city-anchor", name: "Airport City Connection", kind: "area_anchor", regionId: "airport-city", status: "planned" },
    { id: "tetteh-quarshie-interchange", name: "Tetteh Quarshie Interchange", kind: "interchange", regionId: "east-legon", status: "planned" },
    { id: "achimota-interchange", name: "Achimota Interchange", kind: "interchange", regionId: "achimota", status: "planned" },
    { id: "ofankor-junction", name: "Ofankor Junction", kind: "junction", regionId: "achimota", status: "planned" },
    { id: "pokuase-junction", name: "Pokuase Interchange", kind: "interchange", regionId: "pokuase", status: "planned" },
    { id: "amasaman-junction", name: "Amasaman Junction", kind: "junction", regionId: "amasaman", status: "planned" },
    { id: "nsawam-junction", name: "Nsawam Junction", kind: "junction", regionId: "nsawam", status: "planned" },
    { id: "suhum-junction", name: "Suhum Junction", kind: "junction", regionId: "suhum", status: "planned" },
    { id: "bunso-junction", name: "Bunso Junction", kind: "junction", regionId: "bunso", status: "planned" },
    { id: "anyinam-junction", name: "Anyinam Junction", kind: "junction", regionId: "anyinam", status: "planned" },
    { id: "nkawkaw-junction", name: "Nkawkaw Junction", kind: "junction", regionId: "nkawkaw", status: "planned" },
    { id: "konongo-junction", name: "Konongo Junction", kind: "junction", regionId: "konongo", status: "planned" },
    { id: "ejisu-junction", name: "Ejisu Junction", kind: "junction", regionId: "ejisu", status: "planned" },
    { id: "kumasi-gateway", name: "Kumasi City Gateway", kind: "gateway", regionId: "kumasi", status: "planned" },
    { id: "madina-junction", name: "Madina Junction", kind: "junction", regionId: "madina-adenta", status: "planned" },
    { id: "adenta-gateway", name: "Adenta Connection", kind: "gateway", regionId: "madina-adenta", status: "planned" },
    { id: "osu-junction", name: "Osu Connection", kind: "junction", regionId: "osu", status: "planned" },
    { id: "labadi-anchor", name: "Labadi Connection", kind: "area_anchor", regionId: "labadi", status: "planned" },
    { id: "spintex-junction", name: "Spintex Road Connection", kind: "junction", regionId: "spintex", status: "planned" },
    { id: "tema-motorway-junction", name: "Tema Motorway Connection", kind: "interchange", regionId: "tema", status: "planned" },
    { id: "prampram-expansion-gateway", name: "Prampram Expansion Gateway", kind: "future_gateway", regionId: null, status: "planned" }
  ],
  segments: [
    {
      id: "n1-west-approach",
      name: "N1 Western Approach",
      roadClass: "major_road",
      fromNodeId: "mallam-junction",
      toNodeId: "kaneshie-interchange",
      regionIds: ["greater-accra", "dansoman", "kaneshie"],
      status: "planned"
    },
    {
      id: "n1-central-approach",
      name: "N1 Central Accra Corridor",
      roadClass: "major_road",
      fromNodeId: "kaneshie-interchange",
      toNodeId: "circle-junction",
      regionIds: ["greater-accra", "kaneshie", "accra-central-makola"],
      status: "planned"
    },
    {
      id: "n1-tema-corridor",
      name: "N1 Eastern Accra–Tema Corridor",
      roadClass: "major_road",
      fromNodeId: "circle-junction",
      toNodeId: "tema-motorway-junction",
      regionIds: ["greater-accra", "accra-central-makola", "tema"],
      status: "planned"
    },
    {
      id: "n6-circle-caprice",
      name: "N6 Circle–Caprice Corridor",
      roadClass: "major_road",
      fromNodeId: "circle-junction",
      toNodeId: "caprice-junction",
      regionIds: ["greater-accra", "accra-central-makola"],
      status: "planned"
    },
    {
      id: "n6-caprice-alajo",
      name: "N6 Caprice–Alajo Corridor",
      roadClass: "major_road",
      fromNodeId: "caprice-junction",
      toNodeId: "alajo-junction",
      regionIds: ["greater-accra", "accra-central-makola"],
      status: "planned"
    },
    {
      id: "n6-alajo-apenkwa",
      name: "N6 Alajo–Apenkwa Corridor",
      roadClass: "major_road",
      fromNodeId: "alajo-junction",
      toNodeId: "apenkwa-junction",
      regionIds: ["greater-accra", "accra-central-makola", "achimota"],
      status: "planned"
    },
    {
      id: "n6-apenkwa-achimota",
      name: "N6 Apenkwa–Achimota Corridor",
      roadClass: "major_road",
      fromNodeId: "apenkwa-junction",
      toNodeId: "achimota-interchange",
      regionIds: ["greater-accra", "achimota"],
      status: "planned"
    },
    {
      id: "n6-achimota-ofankor",
      name: "N6 Achimota–Ofankor Corridor",
      roadClass: "major_road",
      fromNodeId: "achimota-interchange",
      toNodeId: "ofankor-junction",
      regionIds: ["greater-accra", "achimota"],
      status: "planned"
    },
    {
      id: "n6-ofankor-pokuase",
      name: "N6 Ofankor–Pokuase Corridor",
      roadClass: "major_road",
      fromNodeId: "ofankor-junction",
      toNodeId: "pokuase-junction",
      regionIds: ["greater-accra", "pokuase"],
      status: "planned"
    },
    {
      id: "n6-pokuase-amasaman",
      name: "N6 Pokuase–Amasaman Corridor",
      roadClass: "major_road",
      fromNodeId: "pokuase-junction",
      toNodeId: "amasaman-junction",
      regionIds: ["pokuase", "amasaman"],
      status: "planned"
    },
    {
      id: "n6-amasaman-nsawam",
      name: "N6 Amasaman–Nsawam Corridor",
      roadClass: "major_road",
      fromNodeId: "amasaman-junction",
      toNodeId: "nsawam-junction",
      regionIds: ["amasaman", "nsawam"],
      status: "planned"
    },
    {
      id: "n6-nsawam-suhum",
      name: "N6 Nsawam–Suhum Corridor",
      roadClass: "major_road",
      fromNodeId: "nsawam-junction",
      toNodeId: "suhum-junction",
      regionIds: ["nsawam", "suhum"],
      status: "planned"
    },
    {
      id: "n6-suhum-bunso",
      name: "N6 Suhum–Bunso Corridor",
      roadClass: "major_road",
      fromNodeId: "suhum-junction",
      toNodeId: "bunso-junction",
      regionIds: ["suhum", "bunso"],
      status: "planned"
    },
    {
      id: "n6-bunso-anyinam",
      name: "N6 Bunso–Anyinam Corridor",
      roadClass: "major_road",
      fromNodeId: "bunso-junction",
      toNodeId: "anyinam-junction",
      regionIds: ["bunso", "anyinam"],
      status: "planned"
    },
    {
      id: "n6-anyinam-nkawkaw",
      name: "N6 Anyinam–Nkawkaw Corridor",
      roadClass: "major_road",
      fromNodeId: "anyinam-junction",
      toNodeId: "nkawkaw-junction",
      regionIds: ["anyinam", "nkawkaw"],
      status: "planned"
    },
    {
      id: "n6-nkawkaw-konongo",
      name: "N6 Nkawkaw–Konongo Corridor",
      roadClass: "major_road",
      fromNodeId: "nkawkaw-junction",
      toNodeId: "konongo-junction",
      regionIds: ["nkawkaw", "konongo"],
      status: "planned"
    },
    {
      id: "n6-konongo-ejisu",
      name: "N6 Konongo–Ejisu Corridor",
      roadClass: "major_road",
      fromNodeId: "konongo-junction",
      toNodeId: "ejisu-junction",
      regionIds: ["konongo", "ejisu"],
      status: "planned"
    },
    {
      id: "n6-ejisu-kumasi",
      name: "N6 Ejisu–Kumasi Corridor",
      roadClass: "major_road",
      fromNodeId: "ejisu-junction",
      toNodeId: "kumasi-gateway",
      regionIds: ["ejisu", "kumasi"],
      status: "planned"
    },
    {
      id: "n4-madina-approach",
      name: "N4 Madina Approach",
      roadClass: "major_road",
      fromNodeId: "tetteh-quarshie-interchange",
      toNodeId: "madina-junction",
      regionIds: ["greater-accra", "east-legon", "madina-adenta"],
      status: "planned"
    },
    {
      id: "n4-adenta-corridor",
      name: "N4 Adenta Corridor",
      roadClass: "major_road",
      fromNodeId: "madina-junction",
      toNodeId: "adenta-gateway",
      regionIds: ["greater-accra", "madina-adenta"],
      status: "planned"
    },
    {
      id: "liberation-road",
      name: "Liberation Road",
      roadClass: "urban_road",
      fromNodeId: "airport-city-anchor",
      toNodeId: "37-junction",
      regionIds: ["greater-accra", "airport-city"],
      status: "planned"
    },
    {
      id: "ring-road-central",
      name: "Ring Road Central",
      roadClass: "urban_road",
      fromNodeId: "circle-junction",
      toNodeId: "37-junction",
      regionIds: ["greater-accra", "accra-central-makola", "airport-city"],
      status: "planned"
    },
    {
      id: "ring-road-coastal",
      name: "Ring Road Coastal Connection",
      roadClass: "urban_road",
      fromNodeId: "37-junction",
      toNodeId: "osu-junction",
      regionIds: ["greater-accra", "airport-city", "osu"],
      status: "planned"
    },
    {
      id: "la-beach-road",
      name: "La Beach Road",
      roadClass: "urban_road",
      fromNodeId: "osu-junction",
      toNodeId: "labadi-anchor",
      regionIds: ["greater-accra", "osu", "labadi"],
      status: "planned"
    },
    {
      id: "spintex-road",
      name: "Spintex Road",
      roadClass: "major_road",
      fromNodeId: "tetteh-quarshie-interchange",
      toNodeId: "spintex-junction",
      regionIds: ["greater-accra", "east-legon", "spintex"],
      status: "planned"
    },
    {
      id: "spintex-tema-connection",
      name: "Spintex–Tema Connection",
      roadClass: "major_road",
      fromNodeId: "spintex-junction",
      toNodeId: "tema-motorway-junction",
      regionIds: ["greater-accra", "spintex", "tema"],
      status: "planned"
    },
    {
      id: "n2-prampram-expansion",
      name: "N2 Future Eastern Expansion",
      roadClass: "major_road",
      fromNodeId: "tema-motorway-junction",
      toNodeId: "prampram-expansion-gateway",
      regionIds: ["greater-accra", "tema"],
      status: "planned",
      futureExpansion: true
    }
  ]
};

export function getRoadSegmentsFrom(nodeId: string): RoadNetwork["segments"][number][] {
  return GREATER_ACCRA_ROAD_NETWORK.segments.filter((segment) => segment.fromNodeId === nodeId);
}

export function getRoadSegmentsAt(nodeId: string): RoadNetwork["segments"][number][] {
  return GREATER_ACCRA_ROAD_NETWORK.segments.filter(
    (segment) => segment.fromNodeId === nodeId || segment.toNodeId === nodeId
  );
}

export function getRoadNode(nodeId: string): RoadNetwork["nodes"][number] | undefined {
  return GREATER_ACCRA_ROAD_NETWORK.nodes.find((node) => node.id === nodeId);
}

/** Development-time catalogue check; geometry and real-world accuracy are reviewed separately. */
export function isGreaterAccraRoadNetworkValid(): boolean {
  return isValidRoadNetwork(GREATER_ACCRA_ROAD_NETWORK, GREATER_ACCRA_REGIONS);
}

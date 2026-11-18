import type { WorldRegion } from "@akwantuo/shared";

/**
 * Approved first-world scope. This is a planning catalogue, not a map:
 * no coordinates, boundaries, road geometry or travel distances are implied.
 */
export const GREATER_ACCRA_REGIONS: readonly WorldRegion[] = [
  {
    id: "greater-accra",
    name: "Greater Accra",
    kind: "metropolitan_area",
    parentId: null,
    status: "planned"
  },
  {
    id: "airport-city",
    name: "Airport / Airport City",
    kind: "neighbourhood",
    parentId: "greater-accra",
    status: "planned"
  },
  {
    id: "east-legon",
    name: "East Legon",
    kind: "neighbourhood",
    parentId: "greater-accra",
    status: "planned"
  },
  {
    id: "legon",
    name: "Legon",
    kind: "neighbourhood",
    parentId: "greater-accra",
    status: "planned"
  },
  {
    id: "madina-adenta",
    name: "Madina / Adenta",
    kind: "district",
    parentId: "greater-accra",
    status: "planned"
  },
  {
    id: "achimota",
    name: "Achimota",
    kind: "neighbourhood",
    parentId: "greater-accra",
    status: "planned"
  },
  {
    id: "accra-central-makola",
    name: "Accra Central / Makola",
    kind: "district",
    parentId: "greater-accra",
    status: "planned"
  },
  {
    id: "osu",
    name: "Osu",
    kind: "neighbourhood",
    parentId: "greater-accra",
    status: "planned"
  },
  {
    id: "labadi",
    name: "Labadi",
    kind: "neighbourhood",
    parentId: "greater-accra",
    status: "planned"
  },
  {
    id: "dansoman",
    name: "Dansoman",
    kind: "neighbourhood",
    parentId: "greater-accra",
    status: "planned"
  },
  {
    id: "kaneshie",
    name: "Kaneshie",
    kind: "neighbourhood",
    parentId: "greater-accra",
    status: "planned"
  },
  {
    id: "spintex",
    name: "Spintex",
    kind: "neighbourhood",
    parentId: "greater-accra",
    status: "planned"
  },
  {
    id: "tema",
    name: "Tema",
    kind: "town",
    parentId: "greater-accra",
    status: "planned"
  },
  { id: "pokuase", name: "Pokuase", kind: "town", parentId: "greater-accra", status: "planned" },
  { id: "amasaman", name: "Amasaman", kind: "town", parentId: "greater-accra", status: "planned" },
  { id: "nsawam", name: "Nsawam", kind: "town", parentId: null, status: "planned" },
  { id: "suhum", name: "Suhum", kind: "town", parentId: null, status: "planned" },
  { id: "bunso", name: "Bunso", kind: "town", parentId: null, status: "planned" },
  { id: "anyinam", name: "Anyinam", kind: "town", parentId: null, status: "planned" },
  { id: "nkawkaw", name: "Nkawkaw", kind: "town", parentId: null, status: "planned" },
  { id: "konongo", name: "Konongo", kind: "town", parentId: null, status: "planned" },
  { id: "ejisu", name: "Ejisu", kind: "town", parentId: null, status: "planned" },
  { id: "kumasi", name: "Kumasi", kind: "town", parentId: null, status: "planned" }
] as const;

export const GREATER_ACCRA_REGION_IDS = GREATER_ACCRA_REGIONS.map((region) => region.id);

export function getWorldRegion(regionId: string): WorldRegion | undefined {
  return GREATER_ACCRA_REGIONS.find((region) => region.id === regionId);
}

export function getChildRegions(parentId: string): WorldRegion[] {
  return GREATER_ACCRA_REGIONS.filter((region) => region.parentId === parentId);
}

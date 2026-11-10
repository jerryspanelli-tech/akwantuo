import type { SpatialFootprint } from "../spatialIntersection";

export interface LandmarkFootprint extends SpatialFootprint {
  readonly id: string;
  readonly label: string;
  readonly minX: number;
  readonly maxX: number;
  readonly minZ: number;
  readonly maxZ: number;
}

/** World-space bounds measured from the existing landmark builder coordinates. */
export const GREATER_ACCRA_LANDMARK_FOOTPRINTS: readonly LandmarkFootprint[] = [
  {
    "id": "villaggio-vista",
    "label": "Villaggio Vista",
    "x": 650,
    "z": 1770,
    "minX": 580,
    "maxX": 720,
    "minZ": 1710,
    "maxZ": 1830
  },
  {
    "id": "the-signature",
    "label": "The Signature",
    "x": 3750,
    "z": 2260,
    "minX": 3680,
    "maxX": 3820,
    "minZ": 2190,
    "maxZ": 2340
  },
  {
    "id": "accra-mall",
    "label": "Accra Mall",
    "x": 3290,
    "z": 2240,
    "minX": 3190,
    "maxX": 3390,
    "minZ": 2140,
    "maxZ": 2340
  },
  {
    "id": "kotoka-airport",
    "label": "Kotoka Airport",
    "x": 1700,
    "z": 950,
    "minX": 1580,
    "maxX": 2130,
    "minZ": 900,
    "maxZ": 1090
  },
  {
    "id": "accra-sports-stadium",
    "label": "Accra Sports Stadium",
    "x": -150,
    "z": -820,
    "minX": -260,
    "maxX": -40,
    "minZ": -920,
    "maxZ": -720
  },
  {
    "id": "university-of-ghana",
    "label": "University of Ghana",
    "x": 3350,
    "z": 3550,
    "minX": 3280,
    "maxX": 3540,
    "minZ": 3480,
    "maxZ": 3620
  },
  {
    "id": "kwame-nkrumah-memorial",
    "label": "Kwame Nkrumah Memorial Park",
    "x": -760,
    "z": 300,
    "minX": -820,
    "maxX": -700,
    "minZ": 240,
    "maxZ": 360
  },
  {
    "id": "national-theatre",
    "label": "National Theatre",
    "x": -80,
    "z": -420,
    "minX": -150,
    "maxX": -10,
    "minZ": -490,
    "maxZ": -350
  }
];

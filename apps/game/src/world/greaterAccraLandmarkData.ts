export interface LandmarkFootprint {
  readonly x: number;
  readonly z: number;
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
    "label": "University of Ghana – Legon Campus",
    "x": 3350,
    "z": 3550,
    "minX": 2700,
    "maxX": 4300,
    "minZ": 2100,
    "maxZ": 5050
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
  ,{
    "id": "black-star-square",
    "label": "Black Star Square / Independence Square",
    "x": -250,
    "z": -1550,
    "minX": -390,
    "maxX": -110,
    "minZ": -1710,
    "maxZ": -1390
  },
  {
    "id": "jamestown-lighthouse",
    "label": "Jamestown Lighthouse",
    "x": -2300,
    "z": -1850,
    "minX": -2335,
    "maxX": -2265,
    "minZ": -1885,
    "maxZ": -1815
  },
  {
    "id": "osu-castle",
    "label": "Osu Castle (Christiansborg Castle)",
    "x": 1150,
    "z": -2100,
    "minX": 1070,
    "maxX": 1230,
    "minZ": -2160,
    "maxZ": -2040
  },
  {
    "id": "accra-arts-centre",
    "label": "Accra Arts Centre",
    "x": -1250,
    "z": 250,
    "minX": -1340,
    "maxX": -1160,
    "minZ": 170,
    "maxZ": 330
  }
];
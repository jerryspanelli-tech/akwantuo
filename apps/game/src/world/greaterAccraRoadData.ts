import type { RoadPoint } from "./roadClipping";

export interface LocalRoadDefinition {
  readonly id: string;
  readonly width: number;
  readonly points: readonly RoadPoint[];
}

/** Original Greater Accra neighbourhood-road coordinates. Legon campus roads are maintained separately in legonCampusRoads.ts. */
export const GREATER_ACCRA_LOCAL_ROADS: readonly LocalRoadDefinition[] = [
  { id: "airport-residential-drive", width: 13, points: [
        { x: 250, z: 1030 }, { x: 340, z: 1260 }, { x: 470, z: 1510 }, { x: 650, z: 1770 }
      ] },
  { id: "north-airport-road", width: 12, points: [
        { x: -250, z: 1260 }, { x: 80, z: 1430 }, { x: 420, z: 1580 }, { x: 650, z: 1770 }
      ] },
  { id: "airport-residential-loop-east", width: 11, points: [
        { x: 470, z: 1510 }, { x: 880, z: 1630 }, { x: 1180, z: 1900 }, { x: 1290, z: 2210 }
      ] },
  { id: "airport-residential-loop-west", width: 11, points: [
        { x: -250, z: 1260 }, { x: -420, z: 1630 }, { x: -350, z: 2020 }, { x: 40, z: 2220 }
      ] },
  { id: "tetteh-quarshie-east-access", width: 14, points: [
        { x: 3650, z: 1750 }, { x: 3740, z: 1920 }, { x: 3790, z: 2100 }, { x: 3750, z: 2260 }
      ] },
  { id: "accra-mall-signature-link", width: 12, points: [
        { x: 3350, z: 2200 }, { x: 3510, z: 2230 }, { x: 3650, z: 2260 }, { x: 3750, z: 2260 }
      ] },
  { id: "east-legon-boundary-road", width: 12, points: [
        { x: 3790, z: 2100 }, { x: 4150, z: 2050 }, { x: 4480, z: 1880 }, { x: 4600, z: 1775 }
      ] },
  { id: "tetteh-quarshie-local-north", width: 11, points: [
        { x: 3650, z: 1750 }, { x: 3480, z: 1980 }, { x: 3350, z: 2200 }, { x: 3250, z: 2460 }
      ] },
  { id: "kotoka-terminal-access", width: 14, points: [
        { x: 1050, z: 850 }, { x: 1260, z: 900 }, { x: 1480, z: 930 }, { x: 1700, z: 950 }
      ] },
  { id: "kotoka-airport-residential-link", width: 12, points: [
        { x: 650, z: 1770 }, { x: 900, z: 1450 }, { x: 1250, z: 1150 }, { x: 1700, z: 950 }
      ] },
  { id: "accra-mall-west-access", width: 12, points: [
        { x: 3250, z: 2460 }, { x: 3270, z: 2360 }, { x: 3290, z: 2240 }, { x: 3350, z: 2200 }
      ] },
  { id: "central-stadium-access", width: 12, points: [
        { x: -450, z: 450 }, { x: -330, z: 80 }, { x: -240, z: -360 }, { x: -150, z: -820 }
      ] },
  { id: "dansoman-market-street", width: 12, points: [{ x: -5900, z: -1100 }, { x: -5400, z: -1100 }, { x: -4900, z: -1100 }, { x: -4300, z: -1100 }] },
  { id: "dansoman-residential-street", width: 11, points: [{ x: -5900, z: -600 }, { x: -5400, z: -600 }, { x: -4900, z: -600 }, { x: -4300, z: -600 }] },
  { id: "kaneshie-market-street", width: 12, points: [{ x: -3400, z: -500 }, { x: -3000, z: -500 }, { x: -2600, z: -500 }, { x: -2200, z: -500 }] },
  { id: "kaneshie-residential-street", width: 11, points: [{ x: -3400, z: -40 }, { x: -3000, z: -40 }, { x: -2600, z: -40 }, { x: -2200, z: -40 }] },
  { id: "central-makola-market-street", width: 12, points: [{ x: -1100, z: 40 }, { x: -650, z: 40 }, { x: -200, z: 40 }, { x: 250, z: 40 }, { x: 650, z: 40 }] },
  { id: "central-ridge-street", width: 11, points: [{ x: -1100, z: 650 }, { x: -650, z: 650 }, { x: -200, z: 650 }, { x: 250, z: 650 }, { x: 650, z: 650 }] },
  { id: "osu-oxford-street-link", width: 12, points: [{ x: 650, z: -1600 }, { x: 950, z: -1600 }, { x: 1300, z: -1600 }, { x: 1700, z: -1600 }] },
  { id: "osu-residential-street", width: 11, points: [{ x: 650, z: -1050 }, { x: 950, z: -1050 }, { x: 1300, z: -1050 }, { x: 1700, z: -1050 }] },
  { id: "labadi-beach-road-local", width: 12, points: [{ x: 2100, z: -2250 }, { x: 2450, z: -2250 }, { x: 2800, z: -2250 }, { x: 3200, z: -2250 }] },
  { id: "labadi-estate-street", width: 11, points: [{ x: 2100, z: -1650 }, { x: 2450, z: -1650 }, { x: 2800, z: -1650 }, { x: 3200, z: -1650 }] },
  { id: "spintex-commercial-street", width: 12, points: [{ x: 4700, z: -1450 }, { x: 5200, z: -1450 }, { x: 5700, z: -1450 }, { x: 6200, z: -1450 }] },
  { id: "spintex-estate-street", width: 11, points: [{ x: 4700, z: -850 }, { x: 5200, z: -850 }, { x: 5700, z: -850 }, { x: 6200, z: -850 }] },
  { id: "tema-community-street", width: 12, points: [{ x: 8000, z: -1100 }, { x: 8500, z: -1100 }, { x: 9000, z: -1100 }, { x: 9500, z: -1100 }] },
  { id: "tema-industrial-street", width: 11, points: [{ x: 8000, z: -500 }, { x: 8500, z: -500 }, { x: 9000, z: -500 }, { x: 9500, z: -500 }] },
  { id: "achimota-residential-street", width: 12, points: [{ x: -2400, z: 1900 }, { x: -2000, z: 1900 }, { x: -1600, z: 1900 }, { x: -1200, z: 1900 }] },
  { id: "achimota-community-street", width: 11, points: [{ x: -2400, z: 2450 }, { x: -2000, z: 2450 }, { x: -1600, z: 2450 }, { x: -1200, z: 2450 }] },
  { id: "madina-commercial-street", width: 12, points: [{ x: 4700, z: 1500 }, { x: 5150, z: 1500 }, { x: 5600, z: 1500 }, { x: 6000, z: 1500 }] },
  { id: "madina-residential-street", width: 11, points: [{ x: 4700, z: 2050 }, { x: 5150, z: 2050 }, { x: 5600, z: 2050 }, { x: 6000, z: 2050 }] },
  { id: "nkrumah-memorial-access", width: 12, points: [
        { x: -450, z: 450 }, { x: -620, z: 390 }, { x: -760, z: 300 }
      ] },
  { id: "national-theatre-access", width: 12, points: [
        { x: -450, z: 450 }, { x: -260, z: 100 }, { x: -150, z: -160 }, { x: -80, z: -420 }
      ] },
];

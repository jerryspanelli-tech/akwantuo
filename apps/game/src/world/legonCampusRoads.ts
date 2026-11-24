import type { LocalRoadDefinition } from "./greaterAccraRoadData";

/**
 * Legon campus road centre-lines interpreted from the University of Ghana
 * CERSGIS campus map (NEW_UG_MAP.pdf). The source map's graticule is
 * approximately 0°11'00"W / 5°39'00"N at this layout's origin; one arc-minute
 * is about 1.84 km east-west and 1.85 km north-south at Legon's latitude.
 *
 * These are map-grounded game-layout coordinates, not surveyed GPS traces.
 * The campus is deliberately kept inside the existing Legon world anchor
 * (3350, 3550) so the rest of Greater Accra does not move.
 */
export const LEGON_CAMPUS_ROADS: readonly LocalRoadDefinition[] = [
  {
    id: "legon-main-university-avenue",
    width: 14,
    points: [
      { x: 4270, z: 3550 }, { x: 3950, z: 3550 }, { x: 3650, z: 3550 },
      { x: 3350, z: 3550 }, { x: 3050, z: 3550 }, { x: 2780, z: 3600 }
    ]
  },
  {
    id: "legon-jb-danquah-avenue",
    width: 12,
    points: [
      { x: 2780, z: 3850 }, { x: 3100, z: 3880 }, { x: 3450, z: 3900 },
      { x: 3800, z: 3900 }, { x: 4200, z: 3880 }
    ]
  },
  {
    id: "legon-east-legon-road",
    width: 13,
    points: [
      { x: 4230, z: 5100 }, { x: 4270, z: 4550 }, { x: 4270, z: 4050 },
      { x: 4270, z: 3550 }, { x: 4250, z: 3050 }, { x: 4180, z: 2550 },
      { x: 4100, z: 2150 }
    ]
  },
  {
    id: "legon-main-gate-approach",
    width: 14,
    points: [
      { x: 3650, z: 1750 }, { x: 3900, z: 2200 }, { x: 4110, z: 2700 },
      { x: 4250, z: 3150 }, { x: 4270, z: 3550 }
    ]
  },
  {
    id: "legon-jkm-hodasi-road",
    width: 10,
    points: [
      { x: 2500, z: 4650 }, { x: 2750, z: 4400 }, { x: 3000, z: 4150 },
      { x: 3250, z: 3920 }, { x: 3450, z: 3750 }
    ]
  },
  {
    id: "legon-volta-road",
    width: 9,
    points: [
      { x: 3020, z: 4300 }, { x: 3050, z: 4000 }, { x: 3070, z: 3700 },
      { x: 3070, z: 3400 }, { x: 3050, z: 3050 }
    ]
  },
  {
    id: "legon-lower-hill-drive",
    width: 11,
    points: [
      { x: 2750, z: 3050 }, { x: 3050, z: 2920 }, { x: 3400, z: 2850 },
      { x: 3750, z: 2800 }, { x: 4050, z: 2650 }
    ]
  },
  {
    id: "legon-noguchi-road",
    width: 11,
    points: [
      { x: 3650, z: 2850 }, { x: 3850, z: 2550 }, { x: 4050, z: 2250 },
      { x: 4180, z: 1950 }
    ]
  },
  {
    id: "legon-botanical-gardens-road",
    width: 9,
    points: [
      { x: 2700, z: 4800 }, { x: 2850, z: 4500 }, { x: 2950, z: 4200 },
      { x: 3000, z: 3950 }
    ]
  },
  {
    id: "legon-akuafo-road",
    width: 9,
    points: [
      { x: 3150, z: 3500 }, { x: 3350, z: 3300 }, { x: 3550, z: 3150 },
      { x: 3750, z: 3000 }
    ]
  },
  {
    id: "legon-mensah-sarbah-link",
    width: 9,
    points: [
      { x: 3300, z: 2900 }, { x: 3450, z: 2650 }, { x: 3650, z: 2450 },
      { x: 3900, z: 2300 }
    ]
  }
];

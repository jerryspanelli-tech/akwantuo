import {
  Color3,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3
} from "@babylonjs/core";

export type StationPassengerFitoutOptions = Readonly<{
  id: string;
  centerX: number;
  centerZ: number;
  groundElevationM: number;
  concourseWidthM?: number;
  concourseLengthM?: number;
}>;

export type StationPassengerFitoutResult = Readonly<{
  departureBoards: readonly Mesh[];
  ticketKiosks: readonly Mesh[];
  wayfinding: readonly Mesh[];
  seating: readonly Mesh[];
  securityAndService: readonly Mesh[];
  planting: readonly Mesh[];
  allMeshes: readonly Mesh[];
}>;

const PALETTE = {
  screenFrame: new Color3(0.055, 0.085, 0.12),
  screen: new Color3(0.08, 0.42, 0.58),
  screenAccent: new Color3(0.9, 0.68, 0.28),
  kiosk: new Color3(0.83, 0.85, 0.82),
  kioskScreen: new Color3(0.1, 0.48, 0.62),
  darkMetal: new Color3(0.13, 0.17, 0.2),
  seat: new Color3(0.12, 0.34, 0.38),
  planter: new Color3(0.38, 0.35, 0.29),
  foliage: new Color3(0.16, 0.36, 0.22),
  gold: new Color3(0.78, 0.55, 0.22),
  white: new Color3(0.88, 0.9, 0.88)
} as const;

function material(scene: Scene, id: string, colour: Color3): StandardMaterial {
  const name = `akwantuo-station-fitout-${id}`;
  const existing = scene.getMaterialByName(name);
  if (existing instanceof StandardMaterial) return existing;
  const created = new StandardMaterial(name, scene);
  created.diffuseColor = colour;
  created.specularColor = new Color3(0.16, 0.16, 0.16);
  created.emissiveColor = id.includes("screen") ? colour.scale(0.32) : Color3.Black();
  return created;
}

function box(
  scene: Scene,
  name: string,
  dimensions: { width: number; height: number; depth: number },
  position: Vector3,
  surface: StandardMaterial
): Mesh {
  const mesh = MeshBuilder.CreateBox(name, dimensions, scene);
  mesh.position.copyFrom(position);
  mesh.material = surface;
  mesh.isPickable = false;
  mesh.checkCollisions = false;
  return mesh;
}

function validate(options: StationPassengerFitoutOptions): void {
  if (!options.id.trim() ||
      ![options.centerX, options.centerZ, options.groundElevationM].every(Number.isFinite)) {
    throw new Error("Station passenger fit-out requires an id and finite position.");
  }
  const width = options.concourseWidthM ?? 34;
  const length = options.concourseLengthM ?? 76;
  if (![width, length].every((value) => Number.isFinite(value) && value > 20)) {
    throw new Error("Passenger fit-out needs a concourse wider and longer than 20 metres.");
  }
}

/**
 * Adds a visual passenger-service layer inside the station concourse:
 * live-information screens, ticket kiosks, wayfinding pylons, seating,
 * security lanes, a staffed help point and planters. This is static preview
 * geometry; no screen data, ticketing, access control or service logic exists.
 */
export function createStationPassengerFitout(
  scene: Scene,
  options: StationPassengerFitoutOptions
): StationPassengerFitoutResult {
  validate(options);
  const width = options.concourseWidthM ?? 34;
  const length = options.concourseLengthM ?? 76;
  const x = options.centerX;
  const z = options.centerZ;
  const y = options.groundElevationM;

  const frame = material(scene, "screen-frame", PALETTE.screenFrame);
  const screen = material(scene, "screen", PALETTE.screen);
  const screenAccent = material(scene, "screen-accent", PALETTE.screenAccent);
  const kiosk = material(scene, "kiosk", PALETTE.kiosk);
  const kioskScreen = material(scene, "kiosk-screen", PALETTE.kioskScreen);
  const darkMetal = material(scene, "dark-metal", PALETTE.darkMetal);
  const seat = material(scene, "seat", PALETTE.seat);
  const planter = material(scene, "planter", PALETTE.planter);
  const foliage = material(scene, "foliage", PALETTE.foliage);
  const gold = material(scene, "gold", PALETTE.gold);
  const white = material(scene, "white", PALETTE.white);

  const departureBoards: Mesh[] = [];
  const ticketKiosks: Mesh[] = [];
  const wayfinding: Mesh[] = [];
  const seating: Mesh[] = [];
  const securityAndService: Mesh[] = [];
  const planting: Mesh[] = [];

  // Main live departures board and smaller concourse information displays.
  departureBoards.push(box(scene, `${options.id}-departure-board-frame`,
    { width: 17, height: 4.4, depth: 0.5 },
    new Vector3(x, y + 8.2, z + width * 0.39), frame));
  departureBoards.push(box(scene, `${options.id}-departure-board-screen`,
    { width: 16.2, height: 3.6, depth: 0.08 },
    new Vector3(x, y + 8.2, z + width * 0.39 - 0.3), screen));
  for (let row = 0; row < 4; row += 1) {
    departureBoards.push(box(scene, `${options.id}-departure-row-${row}`,
      { width: 12.8, height: 0.1, depth: 0.04 },
      new Vector3(x + 0.7, y + 9.25 - row * 0.72, z + width * 0.39 - 0.36), white));
    departureBoards.push(box(scene, `${options.id}-departure-status-${row}`,
      { width: 1.1, height: 0.16, depth: 0.045 },
      new Vector3(x - 6.1, y + 9.25 - row * 0.72, z + width * 0.39 - 0.37), screenAccent));
  }

  // Self-service ticket machines with a bright screen and lower payment panel.
  for (let index = 0; index < 4; index += 1) {
    const kioskX = x - 12 + index * 8;
    ticketKiosks.push(box(scene, `${options.id}-ticket-kiosk-${index}`,
      { width: 2.1, height: 3.1, depth: 1.15 },
      new Vector3(kioskX, y + 1.55, z - width * 0.2), kiosk));
    ticketKiosks.push(box(scene, `${options.id}-ticket-kiosk-screen-${index}`,
      { width: 1.45, height: 1.05, depth: 0.09 },
      new Vector3(kioskX, y + 2.05, z - width * 0.2 - 0.62), kioskScreen));
    ticketKiosks.push(box(scene, `${options.id}-ticket-kiosk-reader-${index}`,
      { width: 0.7, height: 0.18, depth: 0.1 },
      new Vector3(kioskX, y + 1.15, z - width * 0.2 - 0.64), darkMetal));
  }

  // Tall wayfinding pylons and compact platform-direction markers.
  for (let index = 0; index < 2; index += 1) {
    const pylonX = x + (index === 0 ? -width * 0.38 : width * 0.38);
    wayfinding.push(box(scene, `${options.id}-wayfinding-pylon-${index}`,
      { width: 1.2, height: 5.2, depth: 0.7 },
      new Vector3(pylonX, y + 2.6, z), darkMetal));
    wayfinding.push(box(scene, `${options.id}-wayfinding-face-${index}`,
      { width: 0.95, height: 3.6, depth: 0.08 },
      new Vector3(pylonX, y + 3.1, z - 0.4), gold));
  }
  wayfinding.push(box(scene, `${options.id}-platform-direction-sign`,
    { width: 12, height: 1.1, depth: 0.24 },
    new Vector3(x, y + 5.2, z - width * 0.43), darkMetal));
  wayfinding.push(box(scene, `${options.id}-platform-direction-sign-face`,
    { width: 11.4, height: 0.68, depth: 0.06 },
    new Vector3(x, y + 5.2, z - width * 0.43 - 0.16), gold));

  // Modular public seating, placed clear of the ticket and circulation zone.
  for (let row = 0; row < 2; row += 1) {
    const benchZ = z + (row === 0 ? -2 : 5);
    for (let index = 0; index < 3; index += 1) {
      const benchX = x - 18 + index * 18;
      seating.push(box(scene, `${options.id}-bench-seat-${row}-${index}`,
        { width: 5.2, height: 0.22, depth: 1.15 },
        new Vector3(benchX, y + 0.65, benchZ), seat));
      seating.push(box(scene, `${options.id}-bench-back-${row}-${index}`,
        { width: 5.2, height: 1.1, depth: 0.2 },
        new Vector3(benchX, y + 1.18, benchZ + 0.48), seat));
      seating.push(box(scene, `${options.id}-bench-support-${row}-${index}`,
        { width: 0.22, height: 0.62, depth: 0.8 },
        new Vector3(benchX - 1.9, y + 0.31, benchZ), darkMetal));
      seating.push(box(scene, `${options.id}-bench-support-right-${row}-${index}`,
        { width: 0.22, height: 0.62, depth: 0.8 },
        new Vector3(benchX + 1.9, y + 0.31, benchZ), darkMetal));
    }
  }

  // Entry security lanes and a staffed passenger-assistance counter.
  for (let index = 0; index < 4; index += 1) {
    const gateX = x - 7.5 + index * 5;
    securityAndService.push(box(scene, `${options.id}-fare-gate-base-${index}`,
      { width: 1.2, height: 1.1, depth: 2.2 },
      new Vector3(gateX, y + 0.55, z - width * 0.39), kiosk));
    securityAndService.push(box(scene, `${options.id}-fare-gate-screen-${index}`,
      { width: 0.8, height: 0.18, depth: 0.08 },
      new Vector3(gateX, y + 1.18, z - width * 0.39 - 0.2), screenAccent));
  }
  securityAndService.push(box(scene, `${options.id}-help-desk`,
    { width: 8, height: 1.2, depth: 2.2 },
    new Vector3(x + width * 0.28, y + 0.6, z + width * 0.2), gold));
  securityAndService.push(box(scene, `${options.id}-help-desk-screen`,
    { width: 6.8, height: 0.2, depth: 0.08 },
    new Vector3(x + width * 0.28, y + 1.35, z + width * 0.2 - 1.15), screen));

  // Interior planters soften the large hall while keeping a clear central route.
  for (let index = 0; index < 4; index += 1) {
    const planterX = x + (index % 2 === 0 ? -1 : 1) * (width * 0.4);
    const planterZ = z + (index < 2 ? -1 : 1) * (length * 0.32);
    planting.push(box(scene, `${options.id}-planter-${index}`,
      { width: 4.5, height: 0.85, depth: 4.5 },
      new Vector3(planterX, y + 0.42, planterZ), planter));
    planting.push(box(scene, `${options.id}-planter-greenery-${index}`,
      { width: 3.7, height: 1.5, depth: 3.7 },
      new Vector3(planterX, y + 1.45, planterZ), foliage));
  }

  const allMeshes = [
    ...departureBoards,
    ...ticketKiosks,
    ...wayfinding,
    ...seating,
    ...securityAndService,
    ...planting
  ];
  return {
    departureBoards,
    ticketKiosks,
    wayfinding,
    seating,
    securityAndService,
    planting,
    allMeshes
  };
}

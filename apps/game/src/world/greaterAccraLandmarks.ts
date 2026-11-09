import {
  Color3,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3
} from "@babylonjs/core";
import type { SolidArea } from "./collision";

type Point = Readonly<{ x: number; z: number }>;
type LandmarkReport = Readonly<{
  landmarkCount: number;
  localRoadCount: number;
  solidAreas: readonly SolidArea[];
}>;

function sharedMaterial(scene: Scene, name: string, color: Color3): StandardMaterial {
  const existing = scene.getMaterialByName(name);
  if (existing instanceof StandardMaterial) return existing;
  const material = new StandardMaterial(name, scene);
  material.diffuseColor = color;
  material.specularColor = new Color3(0.08, 0.08, 0.08);
  return material;
}

function box(
  scene: Scene, name: string, width: number, height: number, depth: number,
  x: number, y: number, z: number, material: StandardMaterial
): void {
  const mesh = MeshBuilder.CreateBox(name, { width, height, depth }, scene);
  mesh.position.set(x, y, z);
  mesh.material = material;
  mesh.isPickable = false;
  mesh.checkCollisions = false;
}

function addRoad(
  scene: Scene,
  id: string,
  points: readonly Point[],
  width = 12
): void {
  const asphalt = sharedMaterial(scene, "akwantuo-road-asphalt", new Color3(0.105, 0.12, 0.125));
  const sidewalk = sharedMaterial(scene, "akwantuo-road-sidewalk", new Color3(0.48, 0.47, 0.42));
  const drain = sharedMaterial(scene, "akwantuo-road-drain", new Color3(0.075, 0.09, 0.085));
  const markings = sharedMaterial(scene, "akwantuo-road-markings", new Color3(0.91, 0.86, 0.68));

  const band = (name: string, innerOffset: number, outerOffset: number, material: StandardMaterial): void => {
    const inner: Vector3[] = [];
    const outer: Vector3[] = [];
    points.forEach((point, index) => {
      const before = points[Math.max(0, index - 1)];
      const after = points[Math.min(points.length - 1, index + 1)];
      const dx = after.x - before.x;
      const dz = after.z - before.z;
      const length = Math.hypot(dx, dz) || 1;
      const nx = dz / length;
      const nz = -dx / length;
      inner.push(new Vector3(point.x + nx * innerOffset, 0.05, point.z + nz * innerOffset));
      outer.push(new Vector3(point.x + nx * outerOffset, 0.05, point.z + nz * outerOffset));
    });
    const mesh = MeshBuilder.CreateRibbon(name, { pathArray: [inner, outer], sideOrientation: Mesh.DOUBLESIDE }, scene);
    mesh.material = material;
    mesh.isPickable = false;
    mesh.checkCollisions = false;
  };

  // Match the existing local-street cross-section: 6.5m carriageway,
  // 0.5m shoulders, 1.8m sidewalks and 0.45m drains on both sides.
  band(id + "-asphalt", -3.75, 3.75, asphalt);
  band(id + "-shoulder-west", 3.75, 4.25, asphalt);
  band(id + "-sidewalk-west", 4.25, 6.05, sidewalk);
  band(id + "-drain-west", 6.05, 6.5, drain);
  band(id + "-shoulder-east", -4.25, -3.75, asphalt);
  band(id + "-sidewalk-east", -6.05, -4.25, sidewalk);
  band(id + "-drain-east", -6.5, -6.05, drain);

  // Broken centre lines follow the road centreline and reuse the main-road marking colour.
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i], b = points[i + 1];
    const length = Math.hypot(b.x - a.x, b.z - a.z);
    const angle = Math.atan2(b.x - a.x, b.z - a.z);
    const dashCount = Math.max(1, Math.floor(length / 26));
    for (let dash = 0; dash < dashCount; dash += 2) {
      const t = (dash + 0.5) / dashCount;
      const x = a.x + (b.x - a.x) * t;
      const z = a.z + (b.z - a.z) * t;
      const mark = MeshBuilder.CreateBox(id + "-centre-dash-" + i + "-" + dash, {
        width: 0.16, height: 0.025, depth: Math.min(5.5, length / dashCount * 0.58)
      }, scene);
      mark.position.set(x, 0.075, z);
      mark.rotation.y = angle;
      mark.material = markings;
      mark.isPickable = false;
      mark.checkCollisions = false;
    }
  }
}

function createVillaggio(scene: Scene, solids: SolidArea[]): void {
  const x = 650, z = 1770;
  const podium = sharedMaterial(scene, "akwantuo-villaggio-podium", new Color3(0.72, 0.74, 0.71));
  const glass = sharedMaterial(scene, "akwantuo-villaggio-glass", new Color3(0.24, 0.39, 0.43));
  const aqua = sharedMaterial(scene, "akwantuo-villaggio-kente-aqua", new Color3(0.17, 0.56, 0.48));
  const azure = sharedMaterial(scene, "akwantuo-villaggio-kente-red", new Color3(0.72, 0.18, 0.2));
  const alto = sharedMaterial(scene, "akwantuo-villaggio-kente-gold", new Color3(0.83, 0.62, 0.12));
  const dark = sharedMaterial(scene, "akwantuo-villaggio-roof", new Color3(0.16, 0.2, 0.22));

  box(scene, "villaggio-vista-podium", 116, 9, 82, x, 4.5, z, podium);
  const towers = [
    { id: "aqua", dx: -34, dz: -8, width: 25, depth: 25, floors: 9, motif: aqua },
    { id: "azure", dx: 0, dz: 8, width: 27, depth: 26, floors: 17, motif: azure },
    { id: "alto", dx: 35, dz: -7, width: 29, depth: 28, floors: 27, motif: alto }
  ];
  for (const tower of towers) {
    const height = tower.floors * 3.05;
    const baseY = 9 + height / 2;
    box(scene, "villaggio-" + tower.id + "-tower", tower.width, height, tower.depth,
      x + tower.dx, baseY, z + tower.dz, glass);
    box(scene, "villaggio-" + tower.id + "-kente-spine", tower.width + 0.35, height * 0.92, 1.15,
      x + tower.dx, baseY, z + tower.dz - tower.depth / 2 - 0.5, tower.motif);
    box(scene, "villaggio-" + tower.id + "-crown", tower.width + 1.2, 1.4, tower.depth + 1.2,
      x + tower.dx, 9 + height + 0.7, z + tower.dz, dark);
    // Repeating narrow facade bands evoke the woven kente rhythm without a heavy texture atlas.
    for (let floor = 1; floor < tower.floors; floor += 2) {
      box(scene, "villaggio-" + tower.id + "-band-" + floor, tower.width + 0.18, 0.24, 0.3,
        x + tower.dx, 9 + floor * 3.05, z + tower.dz - tower.depth / 2 - 0.68, tower.motif);
    }
  }

  const pool = sharedMaterial(scene, "akwantuo-villaggio-pool", new Color3(0.12, 0.48, 0.62));
  const garden = sharedMaterial(scene, "akwantuo-villaggio-landscape", new Color3(0.25, 0.38, 0.25));
  box(scene, "villaggio-rooftop-pool", 25, 0.25, 9, x + 37, 9.3, z + 28, pool);
  box(scene, "villaggio-garden-court", 25, 0.12, 14, x - 42, 9.08, z + 30, garden);
  solids.push({ x, z, halfWidth: 62, halfDepth: 48 });
}

function createSignature(scene: Scene, solids: SolidArea[]): void {
  const x = 3750, z = 2260;
  const podium = sharedMaterial(scene, "akwantuo-signature-podium", new Color3(0.76, 0.75, 0.68));
  const glass = sharedMaterial(scene, "akwantuo-signature-glass", new Color3(0.25, 0.42, 0.48));
  const white = sharedMaterial(scene, "akwantuo-signature-white", new Color3(0.83, 0.84, 0.79));
  const gold = sharedMaterial(scene, "akwantuo-signature-gold", new Color3(0.72, 0.55, 0.28));
  const pool = sharedMaterial(scene, "akwantuo-signature-pool", new Color3(0.1, 0.43, 0.57));

  box(scene, "the-signature-east-legon-podium", 112, 8, 76, x, 4, z, podium);
  const towers = [
    { id: "north", dx: -25, floors: 20, width: 31 },
    { id: "south", dx: 20, floors: 16, width: 29 }
  ];
  for (const tower of towers) {
    const height = tower.floors * 3.1;
    box(scene, "the-signature-" + tower.id + "-tower", tower.width, height, 29,
      x + tower.dx, 8 + height / 2, z, glass);
    for (let side = -1; side <= 1; side += 2) {
      box(scene, "the-signature-" + tower.id + "-vertical-fin-" + side,
        1.15, height * 0.94, 30, x + tower.dx + side * (tower.width / 2 - 1.3),
        8 + height / 2, z, gold);
    }
    for (let floor = 1; floor < tower.floors; floor += 1) {
      box(scene, "the-signature-" + tower.id + "-floor-line-" + floor,
        tower.width + 0.1, 0.12, 29.2, x + tower.dx, 8 + floor * 3.1, z, white);
    }
  }
  box(scene, "the-signature-main-entry", 72, 4.5, 13, x, 10.25, z + 43, white);
  box(scene, "the-signature-entry-canopy", 54, 0.8, 16, x, 13, z + 51, gold);
  box(scene, "the-signature-pool", 27, 0.28, 10, x + 39, 8.2, z + 24, pool);
  solids.push({ x, z, halfWidth: 59, halfDepth: 43 });
}

function createAccraMall(scene: Scene, solids: SolidArea[]): void {
  const x = 3290, z = 2240;
  const concrete = sharedMaterial(scene, "akwantuo-accra-mall-concrete", new Color3(0.69, 0.7, 0.67));
  const glass = sharedMaterial(scene, "akwantuo-accra-mall-glass", new Color3(0.22, 0.38, 0.43));
  const roof = sharedMaterial(scene, "akwantuo-accra-mall-roof", new Color3(0.26, 0.29, 0.3));
  const brand = sharedMaterial(scene, "akwantuo-accra-mall-brand", new Color3(0.75, 0.18, 0.16));
  box(scene, "accra-mall-main-volume", 132, 19, 78, x, 9.5, z, concrete);
  box(scene, "accra-mall-glass-front", 110, 11, 0.8, x, 7.2, z - 39.5, glass);
  box(scene, "accra-mall-roof", 136, 1.2, 82, x, 19.6, z, roof);
  box(scene, "accra-mall-sign-band", 54, 3.2, 1.0, x, 17.2, z - 40.2, brand);
  box(scene, "accra-mall-parking-forecourt", 170, 0.12, 54, x, 0.04, z - 68, concrete);
  solids.push({ x, z, halfWidth: 69, halfDepth: 42 });
}

function createKotokaAirport(scene: Scene, solids: SolidArea[]): void {
  const x = 1700, z = 950;
  const terminal = sharedMaterial(scene, "akwantuo-kotoka-terminal", new Color3(0.72, 0.75, 0.73));
  const glass = sharedMaterial(scene, "akwantuo-kotoka-glass", new Color3(0.2, 0.39, 0.46));
  const roof = sharedMaterial(scene, "akwantuo-kotoka-roof", new Color3(0.37, 0.42, 0.43));
  const runway = sharedMaterial(scene, "akwantuo-kotoka-runway", new Color3(0.13, 0.15, 0.16));
  box(scene, "kotoka-terminal-main", 150, 15, 43, x, 7.5, z, terminal);
  box(scene, "kotoka-terminal-glass", 132, 8, 0.8, x, 6.8, z - 22, glass);
  box(scene, "kotoka-terminal-roof", 158, 1.5, 48, x, 15.4, z, roof);
  box(scene, "kotoka-airside-runway", 470, 0.1, 32, x + 190, 0.02, z + 100, runway);
  const runwayMark = sharedMaterial(scene, "akwantuo-kotoka-runway-marking", new Color3(0.9, 0.9, 0.84));
  for (let i = 0; i < 13; i += 1) {
    box(scene, "kotoka-runway-centre-mark-" + i, 13, 0.035, 0.45,
      x + 10 + i * 28, 0.09, z + 100, runwayMark);
  }
  solids.push({ x, z, halfWidth: 80, halfDepth: 27 });
}

function createAccraSportsStadium(scene: Scene, solids: SolidArea[]): void {
  const x = -150, z = -820;
  const concrete = sharedMaterial(scene, "akwantuo-stadium-concrete", new Color3(0.67, 0.68, 0.64));
  const roof = sharedMaterial(scene, "akwantuo-stadium-roof", new Color3(0.3, 0.37, 0.39));
  const pitch = sharedMaterial(scene, "akwantuo-stadium-pitch", new Color3(0.18, 0.39, 0.22));
  const track = sharedMaterial(scene, "akwantuo-stadium-track", new Color3(0.58, 0.28, 0.19));
  const seating = MeshBuilder.CreateCylinder("accra-sports-stadium-bowl", {
    height: 18, diameterTop: 142, diameterBottom: 178, tessellation: 48
  }, scene);
  seating.position.set(x, 8, z);
  seating.scaling.z = 0.72;
  seating.material = concrete;
  seating.isPickable = false;
  const roofRing = MeshBuilder.CreateTorus("accra-sports-stadium-roof-ring", {
    diameter: 148, thickness: 5, tessellation: 48
  }, scene);
  roofRing.position.set(x, 18, z);
  roofRing.scaling.z = 0.72;
  roofRing.material = roof;
  roofRing.isPickable = false;
  const field = MeshBuilder.CreateGround("accra-sports-stadium-field", { width: 78, height: 48 }, scene);
  field.position.set(x, 0.06, z);
  field.material = pitch;
  field.isPickable = false;
  const athletics = MeshBuilder.CreateTorus("accra-sports-stadium-track", {
    diameter: 105, thickness: 3, tessellation: 48
  }, scene);
  athletics.position.set(x, 0.08, z);
  athletics.scaling.z = 0.72;
  athletics.material = track;
  athletics.isPickable = false;
  solids.push({ x, z, halfWidth: 94, halfDepth: 72 });
}

function createUniversityOfGhana(scene: Scene, solids: SolidArea[]): void {
  const x = 3350, z = 3550;
  const stone = sharedMaterial(scene, "akwantuo-legon-stone", new Color3(0.72, 0.66, 0.53));
  const roof = sharedMaterial(scene, "akwantuo-legon-roof", new Color3(0.43, 0.34, 0.26));
  const glass = sharedMaterial(scene, "akwantuo-legon-glass", new Color3(0.28, 0.42, 0.44));
  box(scene, "university-of-ghana-main-hall", 66, 26, 46, x, 13, z, stone);
  box(scene, "university-of-ghana-main-hall-roof", 72, 2.2, 52, x, 27, z, roof);
  box(scene, "university-of-ghana-main-hall-tower", 15, 44, 15, x, 22, z - 20, stone);
  box(scene, "university-of-ghana-main-hall-clock-face", 3.4, 3.4, 0.25, x, 37, z - 27.7, glass);
  box(scene, "university-of-ghana-campus-annex", 92, 16, 32, x + 115, 8, z + 25, stone);
  solids.push({ x, z, halfWidth: 43, halfDepth: 35 });
}

export function createGreaterAccraLandmarks(scene: Scene): LandmarkReport {
  const solidAreas: SolidArea[] = [];
  createVillaggio(scene, solidAreas);
  createSignature(scene, solidAreas);
  createAccraMall(scene, solidAreas);
  createKotokaAirport(scene, solidAreas);
  createAccraSportsStadium(scene, solidAreas);
  createUniversityOfGhana(scene, solidAreas);

  // Airport Residential local streets and access links, aligned with the
  // northbound side of Airport City and the Liberation Road corridor.
  addRoad(scene, "airport-residential-drive", [
    { x: 250, z: 1030 }, { x: 340, z: 1260 }, { x: 470, z: 1510 }, { x: 650, z: 1770 }
  ], 13);
  addRoad(scene, "north-airport-road", [
    { x: -250, z: 1260 }, { x: 80, z: 1430 }, { x: 420, z: 1580 }, { x: 650, z: 1770 }
  ], 12);
  addRoad(scene, "airport-residential-loop-east", [
    { x: 470, z: 1510 }, { x: 880, z: 1630 }, { x: 1180, z: 1900 }, { x: 1290, z: 2210 }
  ], 11);
  addRoad(scene, "airport-residential-loop-west", [
    { x: -250, z: 1260 }, { x: -420, z: 1630 }, { x: -350, z: 2020 }, { x: 40, z: 2220 }
  ], 11);

  // Tetteh Quarshie / Accra Mall / The Signature local street grid and
  // access road; the main N1 and N4 remain the dominant highway corridors.
  addRoad(scene, "tetteh-quarshie-east-access", [
    { x: 3650, z: 1750 }, { x: 3740, z: 1920 }, { x: 3790, z: 2100 }, { x: 3750, z: 2260 }
  ], 14);
  addRoad(scene, "accra-mall-signature-link", [
    { x: 3350, z: 2200 }, { x: 3510, z: 2230 }, { x: 3650, z: 2260 }, { x: 3750, z: 2260 }
  ], 12);
  addRoad(scene, "east-legon-boundary-road", [
    { x: 3790, z: 2100 }, { x: 4150, z: 2050 }, { x: 4480, z: 1880 }, { x: 4600, z: 1775 }
  ], 12);
  addRoad(scene, "tetteh-quarshie-local-north", [
    { x: 3650, z: 1750 }, { x: 3480, z: 1980 }, { x: 3350, z: 2200 }, { x: 3250, z: 2460 }
  ], 11);

  // Links into the airport, mall, Legon and central-city street systems.
  addRoad(scene, "kotoka-terminal-access", [
    { x: 1050, z: 850 }, { x: 1260, z: 900 }, { x: 1480, z: 930 }, { x: 1700, z: 950 }
  ], 14);
  addRoad(scene, "kotoka-airport-residential-link", [
    { x: 650, z: 1770 }, { x: 900, z: 1450 }, { x: 1250, z: 1150 }, { x: 1700, z: 950 }
  ], 12);
  addRoad(scene, "accra-mall-west-access", [
    { x: 3250, z: 2460 }, { x: 3270, z: 2360 }, { x: 3290, z: 2240 }, { x: 3350, z: 2200 }
  ], 12);
  addRoad(scene, "legon-campus-road", [
    { x: 3250, z: 2460 }, { x: 3280, z: 2800 }, { x: 3310, z: 3200 }, { x: 3350, z: 3550 }
  ], 12);
  addRoad(scene, "central-stadium-access", [
    { x: -450, z: 450 }, { x: -330, z: 80 }, { x: -240, z: -360 }, { x: -150, z: -820 }
  ], 12);

  return { landmarkCount: 6, localRoadCount: 13, solidAreas };
}

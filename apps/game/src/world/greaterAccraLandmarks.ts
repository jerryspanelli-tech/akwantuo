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

  const ribbon = (name: string, halfWidth: number, y: number, material: StandardMaterial): void => {
    const left: Vector3[] = [];
    const right: Vector3[] = [];
    points.forEach((point, index) => {
      const before = points[Math.max(0, index - 1)];
      const after = points[Math.min(points.length - 1, index + 1)];
      const dx = after.x - before.x;
      const dz = after.z - before.z;
      const length = Math.hypot(dx, dz) || 1;
      const nx = dz / length;
      const nz = -dx / length;
      left.push(new Vector3(point.x + nx * halfWidth, y, point.z + nz * halfWidth));
      right.push(new Vector3(point.x - nx * halfWidth, y, point.z - nz * halfWidth));
    });
    const mesh = MeshBuilder.CreateRibbon(name, { pathArray: [left, right], sideOrientation: Mesh.DOUBLESIDE }, scene);
    mesh.material = material;
    mesh.isPickable = false;
    mesh.checkCollisions = false;
  };

  ribbon(id + "-drain-west", width / 2 + 3.0, 0.018, drain);
  ribbon(id + "-walk-west", width / 2 + 1.1, 0.032, sidewalk);
  ribbon(id + "-asphalt", width / 2, 0.05, asphalt);
  ribbon(id + "-walk-east", width / 2 + 4.9, 0.032, sidewalk);
  ribbon(id + "-drain-east", width / 2 + 6.8, 0.018, drain);

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

export function createGreaterAccraLandmarks(scene: Scene): LandmarkReport {
  const solidAreas: SolidArea[] = [];
  createVillaggio(scene, solidAreas);
  createSignature(scene, solidAreas);

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

  return { landmarkCount: 2, localRoadCount: 8, solidAreas };
}

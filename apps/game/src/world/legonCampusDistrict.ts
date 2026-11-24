import { Color3, MeshBuilder, Scene, StandardMaterial } from "@babylonjs/core";
import type { SolidArea } from "./collision";

type CampusBuilding = Readonly<{
  id: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  wall: StandardMaterial;
  roof: StandardMaterial;
  glass: StandardMaterial;
}>;

function material(scene: Scene, name: string, color: Color3): StandardMaterial {
  const existing = scene.getMaterialByName(name);
  if (existing instanceof StandardMaterial) return existing;
  const result = new StandardMaterial(name, scene);
  result.diffuseColor = color;
  result.specularColor = new Color3(0.08, 0.08, 0.08);
  return result;
}

function staticBox(
  scene: Scene,
  name: string,
  width: number,
  height: number,
  depth: number,
  x: number,
  y: number,
  z: number,
  surface: StandardMaterial
): void {
  const mesh = MeshBuilder.CreateBox(name, { width, height, depth }, scene);
  mesh.position.set(x, y, z);
  mesh.material = surface;
  mesh.isPickable = false;
  mesh.checkCollisions = false;
}

function campusBuilding(scene: Scene, building: CampusBuilding, solids: SolidArea[]): void {
  const { id, x, z, width, depth, height, wall, roof, glass } = building;
  staticBox(scene, id + "-main-volume", width, height, depth, x, height / 2, z, wall);
  staticBox(scene, id + "-roof-parapet", width + 2, 1.1, depth + 2, x, height + 0.55, z, roof);

  // A recessed glazed entrance band and narrow vertical facade bays give the
  // campus blocks more scale than a single unbroken placeholder cube.
  staticBox(scene, id + "-front-glazing", width * 0.68, Math.max(2.2, height * 0.16), 0.18,
    x, height * 0.48, z - depth / 2 - 0.11, glass);
  staticBox(scene, id + "-rear-glazing", width * 0.54, Math.max(2, height * 0.13), 0.18,
    x, height * 0.48, z + depth / 2 + 0.11, glass);
  for (const side of [-1, 1]) {
    staticBox(scene, id + "-facade-pier-" + side, 1.8, height * 0.82, 0.32,
      x + side * (width * 0.34), height * 0.5, z - depth / 2 - 0.18, roof);
  }

  solids.push({ x, z, halfWidth: width / 2 + 2, halfDepth: depth / 2 + 2 });
}

export function createLegonCampusDistrict(scene: Scene, solids: SolidArea[]): void {
  const blue = material(scene, "university-ghana-blue", new Color3(47 / 255, 74 / 255, 117 / 255));
  const gold = material(scene, "university-ghana-gold", new Color3(183 / 255, 154 / 255, 100 / 255));
  const warmStone = material(scene, "university-ghana-warm-stone", new Color3(0.70, 0.64, 0.52));
  const paleStone = material(scene, "university-ghana-pale-stone", new Color3(0.78, 0.75, 0.66));
  const redRoof = material(scene, "university-ghana-terracotta", new Color3(0.39, 0.25, 0.19));
  const concrete = material(scene, "university-ghana-concrete", new Color3(0.56, 0.57, 0.53));
  const glass = material(scene, "university-ghana-glass", new Color3(0.20, 0.36, 0.42));
  const garden = material(scene, "university-ghana-garden", new Color3(0.20, 0.36, 0.19));
  const track = material(scene, "university-ghana-track", new Color3(0.42, 0.19, 0.15));
  const field = material(scene, "university-ghana-field", new Color3(0.17, 0.34, 0.17));
  const water = material(scene, "university-ghana-fountain-water", new Color3(0.12, 0.38, 0.48));

  // Main entrance: the blue-and-gold identity is used for the campus gateway
  // and wayfinding, while the campus buildings retain varied local finishes.
  staticBox(scene, "university-ghana-main-gate-west-pillar", 8, 15, 8, 4215, 7.5, 3505, warmStone);
  staticBox(scene, "university-ghana-main-gate-east-pillar", 8, 15, 8, 4215, 7.5, 3595, warmStone);
  staticBox(scene, "university-ghana-main-gate-sign", 2.4, 5.5, 78, 4215, 16.5, 3550, blue);
  staticBox(scene, "university-ghana-main-gate-gold-trim", 2.7, 0.55, 82, 4215, 19.5, 3550, gold);
  staticBox(scene, "university-ghana-main-gate-motto-panel", 0.35, 2.1, 58, 4213.6, 12.7, 3550, gold);

  const buildings: CampusBuilding[] = [
    { id: "university-ghana-convocation-group", x: 2860, z: 4140, width: 118, depth: 78, height: 25, wall: warmStone, roof: redRoof, glass },
    { id: "university-ghana-great-hall", x: 2980, z: 4070, width: 92, depth: 68, height: 23, wall: paleStone, roof: redRoof, glass },
    { id: "university-ghana-commonwealth-hall", x: 2820, z: 3500, width: 132, depth: 82, height: 27, wall: warmStone, roof: redRoof, glass },
    { id: "university-ghana-volta-hall", x: 3050, z: 3730, width: 104, depth: 70, height: 22, wall: paleStone, roof: concrete, glass },
    { id: "university-ghana-balme-library", x: 3290, z: 3780, width: 128, depth: 82, height: 22, wall: warmStone, roof: concrete, glass },
    { id: "university-ghana-academic-north-block", x: 3450, z: 4140, width: 96, depth: 66, height: 24, wall: paleStone, roof: concrete, glass },
    { id: "university-ghana-academic-east-block", x: 3820, z: 3890, width: 112, depth: 72, height: 25, wall: warmStone, roof: concrete, glass },
    { id: "university-ghana-legon-hall", x: 3150, z: 3210, width: 112, depth: 74, height: 24, wall: paleStone, roof: redRoof, glass },
    { id: "university-ghana-akuafo-hall", x: 3550, z: 3190, width: 118, depth: 78, height: 26, wall: warmStone, roof: redRoof, glass },
    { id: "university-ghana-mensah-sarbah-hall", x: 3490, z: 2720, width: 132, depth: 82, height: 28, wall: paleStone, roof: concrete, glass },
    { id: "university-ghana-central-cafeteria", x: 3700, z: 3000, width: 82, depth: 58, height: 13, wall: warmStone, roof: redRoof, glass },
    { id: "university-ghana-performing-arts", x: 3000, z: 3050, width: 102, depth: 70, height: 17, wall: paleStone, roof: concrete, glass },
    { id: "university-ghana-ugmc", x: 4010, z: 2220, width: 132, depth: 92, height: 27, wall: paleStone, roof: concrete, glass },
    { id: "university-ghana-public-health", x: 3820, z: 2400, width: 94, depth: 66, height: 20, wall: warmStone, roof: concrete, glass },
    { id: "university-ghana-international-student-hostel", x: 3650, z: 2150, width: 100, depth: 70, height: 23, wall: paleStone, roof: concrete, glass }
  ];
  for (const building of buildings) campusBuilding(scene, building, solids);

  // University Square and the ornamental fountain described in the official
  // campus guide, placed between the library and the main avenue.
  const square = MeshBuilder.CreateGround("university-ghana-square-plaza", {
    width: 150, height: 100
  }, scene);
  square.position.set(3350, 0.035, 3550);
  square.material = concrete;
  square.isPickable = false;
  const fountain = MeshBuilder.CreateCylinder("university-ghana-square-fountain", {
    height: 1.2, diameter: 18, tessellation: 32
  }, scene);
  fountain.position.set(3350, 0.7, 3550);
  fountain.material = water;
  fountain.isPickable = false;

  // Botanical Gardens, Athletic Oval and sports grounds anchor the northern
  // and southern campus zones; these are simple static low-cost meshes.
  const botanical = MeshBuilder.CreateGround("university-ghana-botanical-gardens", {
    width: 620, height: 620
  }, scene);
  botanical.position.set(2860, 0.018, 4700);
  botanical.material = garden;
  botanical.isPickable = false;

  const ovalOuter = MeshBuilder.CreateCylinder("university-ghana-athletic-oval-track", {
    height: 0.28, diameter: 230, tessellation: 48
  }, scene);
  ovalOuter.scaling.z = 0.68;
  ovalOuter.position.set(3820, 0.14, 2630);
  ovalOuter.material = track;
  ovalOuter.isPickable = false;
  const ovalField = MeshBuilder.CreateCylinder("university-ghana-athletic-oval-field", {
    height: 0.32, diameter: 178, tessellation: 48
  }, scene);
  ovalField.scaling.z = 0.68;
  ovalField.position.set(3820, 0.3, 2630);
  ovalField.material = field;
  ovalField.isPickable = false;

  const stadiumPitch = MeshBuilder.CreateGround("university-ghana-stadium-pitch", {
    width: 115, height: 72
  }, scene);
  stadiumPitch.position.set(4020, 0.05, 2450);
  stadiumPitch.material = field;
  stadiumPitch.isPickable = false;

  // The UG mark is a compact campus wayfinding monument, not a substitute
  // for the official crest artwork. Text uses the published university motto.
  staticBox(scene, "university-ghana-wayfinding-monument", 2.2, 9, 2.2, 3350, 4.5, 3460, blue);
  staticBox(scene, "university-ghana-wayfinding-gold-cap", 2.6, 0.8, 2.6, 3350, 9.4, 3460, gold);

  // The main buildings are solid in the game's existing rectangle collision
  // system. Paths, squares, gardens and sports areas remain walkable.
}

import {
  Color3,
  MeshBuilder,
  Scene,
  StandardMaterial,
  TransformNode
} from "@babylonjs/core";
import type { SolidArea } from "./collision";
import { INTERIOR_BLUEPRINTS, type InteriorFixtureType } from "./interiorBlueprints";

export type InteriorRoomInstance = Readonly<{
  id: string;
  root: TransformNode;
  spawn: Readonly<{ x: number; z: number }>;
  solidAreas: readonly SolidArea[];
}>;

const FIXTURE_COLOURS: Record<InteriorFixtureType, string> = {
  counter: "#79563b",
  shelf: "#8a6545",
  chair: "#4c5c55",
  mirror: "#8bb3b7",
  table: "#79563b",
  bed: "#e0d5c0",
  sofa: "#536b61",
  desk: "#76583d",
  medical_bed: "#d9e5e1",
  tool_bench: "#5c5143",
  display: "#b88b4c",
  stage: "#202d39",
  runway: "#d9d9d3",
  audience_seating: "#8d3d36",
  screen: "#172a38",
  refrigerator: "#d7e1df",
  snack_rack: "#a47a4f",
  shopkeeper: "#385e59"
};

function createMaterial(scene: Scene, id: string, colour: string): StandardMaterial {
  void id;
  const sharedName = "interior-shared-material-" + colour;
  const existing = scene.getMaterialByName(sharedName);
  if (existing instanceof StandardMaterial) return existing;
  const value = new StandardMaterial(sharedName, scene);
  value.diffuseColor = Color3.FromHexString(colour);
  value.specularColor = new Color3(0.08, 0.08, 0.08);
  return value;
}

export function createInteriorRooms(scene: Scene): readonly InteriorRoomInstance[] {
  const rooms = INTERIOR_BLUEPRINTS.map((blueprint, index) => {
    const root = new TransformNode("interior-room-" + blueprint.id, scene);
    // Interiors are streamed as dormant room modules and enabled only on entry.
    root.position.set(10400 + index * 40, 0, 7800);
    root.setEnabled(false);

    const wallMaterial = createMaterial(scene, blueprint.id + "-walls", "#d5c7aa");
    const floorMaterial = createMaterial(scene, blueprint.id + "-floor",
      blueprint.floorStyle === "wood" ? "#806344" : blueprint.floorStyle === "tile" ? "#a9aaa0" : "#77766c");
    const trimMaterial = createMaterial(scene, blueprint.id + "-trim", "#6c5946");

    const floor = MeshBuilder.CreateGround("interior-floor-" + blueprint.id, {
      width: blueprint.width, height: blueprint.depth
    }, scene);
    floor.parent = root;
    floor.position.y = 0.015;
    floor.material = floorMaterial;
    floor.isPickable = false;

    const wallThickness = 0.22;
    const wallHeight = blueprint.wallHeight;
    const sideWallLeft = MeshBuilder.CreateBox("interior-wall-left-" + blueprint.id, {
      width: wallThickness, height: wallHeight, depth: blueprint.depth
    }, scene);
    sideWallLeft.parent = root;
    sideWallLeft.position.set(-blueprint.width / 2, wallHeight / 2, 0);
    sideWallLeft.material = wallMaterial;
    sideWallLeft.isPickable = false;

    const sideWallRight = sideWallLeft.clone("interior-wall-right-" + blueprint.id);
    if (sideWallRight) sideWallRight.position.x = blueprint.width / 2;

    const backWall = MeshBuilder.CreateBox("interior-wall-back-" + blueprint.id, {
      width: blueprint.width, height: wallHeight, depth: wallThickness
    }, scene);
    backWall.parent = root;
    backWall.position.set(0, wallHeight / 2, -blueprint.depth / 2);
    backWall.material = wallMaterial;
    backWall.isPickable = false;

    // Split the front wall around a walk-through entrance.
    for (const side of [-1, 1]) {
      const segment = MeshBuilder.CreateBox("interior-front-wall-" + blueprint.id + "-" + side, {
        width: blueprint.width / 2 - 1.05, height: wallHeight, depth: wallThickness
      }, scene);
      segment.parent = root;
      segment.position.set(side * (blueprint.width / 4 + 0.525), wallHeight / 2, blueprint.depth / 2);
      segment.material = wallMaterial;
      segment.isPickable = false;
    }

    const lintel = MeshBuilder.CreateBox("interior-door-lintel-" + blueprint.id, {
      width: 2.1, height: 0.35, depth: wallThickness
    }, scene);
    lintel.parent = root;
    lintel.position.set(0, wallHeight - 0.18, blueprint.depth / 2);
    lintel.material = trimMaterial;
    lintel.isPickable = false;

    for (let fixtureIndex = 0; fixtureIndex < blueprint.fixtures.length; fixtureIndex += 1) {
      const fixture = blueprint.fixtures[fixtureIndex];
      const material = createMaterial(scene, blueprint.id + "-fixture-" + fixtureIndex, FIXTURE_COLOURS[fixture.type]);
      const scale = fixture.scale;
      const isSeat = fixture.type === "chair" || fixture.type === "sofa";
      const isBed = fixture.type === "bed" || fixture.type === "medical_bed";
      const width = fixture.type === "stage" ? 14 : fixture.type === "runway" ? 3.2 : fixture.type === "screen" ? 12 : fixture.type === "audience_seating" ? 2.1 : fixture.type === "counter" || fixture.type === "desk" || fixture.type === "tool_bench" ? 2.1 : fixture.type === "refrigerator" ? 2.25 : fixture.type === "snack_rack" ? 1.25 : fixture.type === "shopkeeper" ? 0.72 : isBed ? 2.2 : isSeat ? 0.9 : 1.2;
      const height = fixture.type === "stage" ? 0.65 : fixture.type === "runway" ? 0.18 : fixture.type === "screen" ? 5.5 : fixture.type === "audience_seating" ? 0.95 : fixture.type === "shelf" || fixture.type === "snack_rack" ? 1.9 : fixture.type === "refrigerator" ? 2.35 : fixture.type === "shopkeeper" ? 1.25 : fixture.type === "mirror" ? 1.7 : isSeat ? 0.9 : isBed ? 0.55 : 0.95;
      const depth = fixture.type === "stage" ? 4.5 : fixture.type === "runway" ? 13 : fixture.type === "screen" ? 0.35 : fixture.type === "audience_seating" ? 1.6 : isBed ? 1.9 : fixture.type === "shelf" || fixture.type === "snack_rack" ? 0.62 : fixture.type === "refrigerator" ? 0.9 : fixture.type === "shopkeeper" ? 0.55 : 0.85;
      const mesh = MeshBuilder.CreateBox("interior-fixture-" + blueprint.id + "-" + fixtureIndex, {
        width: width * scale, height: height * scale, depth: depth * scale
      }, scene);
      mesh.parent = root;
      mesh.position.set(fixture.x, height * scale / 2, fixture.z);
      mesh.rotation.y = fixture.rotationY;
      mesh.material = material;
      mesh.isPickable = false;

      if (fixture.type === "refrigerator") {
        const glassMaterial = createMaterial(scene, "shop-fridge-glass", "#8ab6c2");
        glassMaterial.alpha = 0.42;
        const glass = MeshBuilder.CreateBox("shop-fridge-glass-" + fixtureIndex, {
          width: 1.88 * scale, height: 2.02 * scale, depth: 0.055
        }, scene);
        glass.parent = root;
        glass.position.set(fixture.x, 1.2 * scale, fixture.z + 0.47 * scale);
        glass.material = glassMaterial;
        glass.isPickable = false;
        const innerShelfMaterial = createMaterial(scene, "shop-fridge-shelf", "#e4e7df");
        for (let shelf = 0; shelf < 4; shelf += 1) {
          const rail = MeshBuilder.CreateBox("shop-fridge-shelf-" + fixtureIndex + "-" + shelf, {
            width: 1.72 * scale, height: 0.045, depth: 0.72 * scale
          }, scene);
          rail.parent = root;
          rail.position.set(fixture.x, 0.48 * scale + shelf * 0.48 * scale, fixture.z + 0.02);
          rail.material = innerShelfMaterial;
          rail.isPickable = false;
          for (let bottle = 0; bottle < 5; bottle += 1) {
            const drink = MeshBuilder.CreateCylinder("shop-fridge-drink-" + fixtureIndex + "-" + shelf + "-" + bottle, {
              height: 0.31 * scale, diameter: 0.12 * scale, tessellation: 8
            }, scene);
            drink.parent = root;
            drink.position.set(fixture.x - 0.68 * scale + bottle * 0.34 * scale, 0.67 * scale + shelf * 0.48 * scale, fixture.z + 0.05);
            drink.material = createMaterial(scene, "shop-fridge-drink-colour-" + ((bottle + shelf) % 4), ["#b94735", "#e8a72f", "#5c9c65", "#d9d5c7"][(bottle + shelf) % 4]);
            drink.isPickable = false;
          }
        }
        const header = MeshBuilder.CreateBox("shop-fridge-header-" + fixtureIndex, {
          width: 2.02 * scale, height: 0.18 * scale, depth: 0.12
        }, scene);
        header.parent = root;
        header.position.set(fixture.x, 2.25 * scale, fixture.z + 0.48 * scale);
        header.material = createMaterial(scene, "shop-fridge-header", "#315d68");
        header.isPickable = false;
      }

      if (fixture.type === "snack_rack") {
        const packetColours = ["#c84d36", "#d9a63b", "#4c8b65", "#4c6f9c"];
        for (let shelf = 0; shelf < 3; shelf += 1) {
          const ledge = MeshBuilder.CreateBox("snack-rack-ledge-" + fixtureIndex + "-" + shelf, {
            width: 1.38 * scale, height: 0.08, depth: 0.72 * scale
          }, scene);
          ledge.parent = root;
          ledge.position.set(fixture.x, 0.42 + shelf * 0.58, fixture.z + 0.08);
          ledge.material = trimMaterial;
          ledge.isPickable = false;
          for (let pack = 0; pack < 4; pack += 1) {
            const packet = MeshBuilder.CreateBox("snack-rack-pack-" + fixtureIndex + "-" + shelf + "-" + pack, {
              width: 0.22, height: 0.34, depth: 0.13
            }, scene);
            packet.parent = root;
            packet.position.set(fixture.x - 0.48 + pack * 0.32, 0.65 + shelf * 0.58, fixture.z + 0.14);
            packet.material = createMaterial(scene, "snack-pack-" + packetColours[pack], packetColours[pack]);
            packet.isPickable = false;
          }
        }
      }

      if (fixture.type === "counter") {
        const till = MeshBuilder.CreateBox("shop-checkout-till", { width: 0.48, height: 0.18, depth: 0.38 }, scene);
        till.parent = root;
        till.position.set(fixture.x - 0.45, 1.12 * scale, fixture.z - 0.08);
        till.material = createMaterial(scene, "shop-checkout-till", "#29343b");
        till.isPickable = false;
        const screen = MeshBuilder.CreateBox("shop-checkout-screen", { width: 0.34, height: 0.24, depth: 0.035 }, scene);
        screen.parent = root;
        screen.position.set(fixture.x - 0.45, 1.31 * scale, fixture.z - 0.12);
        screen.rotation.x = -0.24;
        screen.material = createMaterial(scene, "shop-checkout-screen", "#65a8a0");
        screen.isPickable = false;
      }

      if (fixture.type === "shopkeeper") {
        const skin = createMaterial(scene, "shopkeeper-skin", "#81543a");
        const uniform = createMaterial(scene, "shopkeeper-uniform", "#315d55");
        const trousers = createMaterial(scene, "shopkeeper-trousers", "#26323a");
        const head = MeshBuilder.CreateSphere("shopkeeper-head", { diameter: 0.34, segments: 12 }, scene);
        head.parent = root;
        head.position.set(fixture.x, 1.52, fixture.z);
        head.material = skin;
        head.isPickable = false;
        const torso = MeshBuilder.CreateBox("shopkeeper-torso", { width: 0.48, height: 0.7, depth: 0.27 }, scene);
        torso.parent = root;
        torso.position.set(fixture.x, 0.98, fixture.z);
        torso.material = uniform;
        torso.isPickable = false;
        for (const side of [-1, 1]) {
          const arm = MeshBuilder.CreateCylinder("shopkeeper-arm-" + side, { height: 0.58, diameter: 0.12, tessellation: 8 }, scene);
          arm.parent = root;
          arm.position.set(fixture.x + side * 0.32, 0.98, fixture.z + 0.02);
          arm.rotation.z = side * -0.12;
          arm.material = uniform;
          arm.isPickable = false;
          const leg = MeshBuilder.CreateCylinder("shopkeeper-leg-" + side, { height: 0.58, diameter: 0.15, tessellation: 8 }, scene);
          leg.parent = root;
          leg.position.set(fixture.x + side * 0.13, 0.32, fixture.z);
          leg.material = trousers;
          leg.isPickable = false;
        }
        const apron = MeshBuilder.CreateBox("shopkeeper-apron", { width: 0.4, height: 0.42, depth: 0.035 }, scene);
        apron.parent = root;
        apron.position.set(fixture.x, 0.93, fixture.z + 0.15);
        apron.material = createMaterial(scene, "shopkeeper-apron", "#d2b47a");
        apron.isPickable = false;
      }
    }

    if (blueprint.id === "creative-arts-centre") {
      const seatMaterial = createMaterial(scene, "creative-centre-seat", "#8d3d36");
      const frameMaterial = createMaterial(scene, "creative-centre-truss", "#303b43");
      for (const side of [-1, 1]) {
        for (let row = 0; row < 4; row += 1) {
          for (let seat = 0; seat < 4; seat += 1) {
            const x = side * (6.5 + seat * 1.45);
            const z = 6 - row * 2.65;
            const tierRise = (3 - row) * 0.28;
            const base = MeshBuilder.CreateBox("creative-centre-seat-base-" + side + "-" + row + "-" + seat, { width: 1.05, height: 0.42, depth: 0.95 }, scene);
            base.parent = root;
            base.position.set(x, 0.38 + tierRise, z);
            base.material = seatMaterial;
            base.isPickable = false;
            const back = MeshBuilder.CreateBox("creative-centre-seat-back-" + side + "-" + row + "-" + seat, { width: 1.05, height: 0.95, depth: 0.2 }, scene);
            back.parent = root;
            back.position.set(x, 0.9 + tierRise, z - 0.38);
            back.material = seatMaterial;
            back.isPickable = false;
          }
        }
      }
      for (const side of [-1, 1]) {
        for (let row = 0; row < 4; row += 1) {
          const riser = MeshBuilder.CreateBox("creative-centre-audience-riser-" + side + "-" + row, {
            width: 6.2, height: 0.28, depth: 2.2
          }, scene);
          riser.parent = root;
          riser.position.set(side * 8.8, 0.14 + (3 - row) * 0.28, 6 - row * 2.65);
          riser.material = frameMaterial;
          riser.isPickable = false;
        }
      }
      for (const side of [-1, 1]) {
        const runwayEdge = MeshBuilder.CreateBox("creative-centre-runway-edge-" + side, {
          width: 0.08, height: 0.06, depth: 12.4
        }, scene);
        runwayEdge.parent = root;
        runwayEdge.position.set(side * 1.72, 0.14, -1);
        runwayEdge.material = createMaterial(scene, "creative-centre-runway-edge", "#d4a84f");
        runwayEdge.isPickable = false;
      }
      for (const side of [-1, 1]) {
        const truss = MeshBuilder.CreateBox("creative-centre-light-truss-" + side, { width: 0.22, height: 0.22, depth: 23 }, scene);
        truss.parent = root;
        truss.position.set(side * 12.5, 10.4, -0.5);
        truss.material = frameMaterial;
        truss.isPickable = false;
        for (let lamp = 0; lamp < 5; lamp += 1) {
          const light = MeshBuilder.CreateSphere("creative-centre-stage-light-" + side + "-" + lamp, { diameter: 0.42, segments: 8 }, scene);
          light.parent = root;
          light.position.set(side * 12.5, 9.9, -9 + lamp * 4.2);
          light.material = createMaterial(scene, "creative-centre-stage-light", "#e6c46e");
          light.isPickable = false;
        }
      }
    }

    const centreX = root.position.x;
    const centreZ = root.position.z;
    const halfW = blueprint.width / 2;
    const halfD = blueprint.depth / 2;
    const solidAreas: SolidArea[] = [
      { x: centreX - halfW, z: centreZ, halfWidth: 0.35, halfDepth: halfD },
      { x: centreX + halfW, z: centreZ, halfWidth: 0.35, halfDepth: halfD },
      { x: centreX, z: centreZ - halfD, halfWidth: halfW, halfDepth: 0.35 },
      { x: centreX - (halfW / 2 + 0.525), z: centreZ + halfD, halfWidth: halfW / 2 - 0.525, halfDepth: 0.35 },
      { x: centreX + (halfW / 2 + 0.525), z: centreZ + halfD, halfWidth: halfW / 2 - 0.525, halfDepth: 0.35 }
    ];
    return {
      id: blueprint.id,
      root,
      spawn: { x: centreX, z: centreZ + halfD - 1.4 },
      solidAreas
    };
  });
  scene.onBeforeRenderObservable.add(() => {
    const head = scene.getMeshByName("shopkeeper-head");
    const leftArm = scene.getMeshByName("shopkeeper-arm--1");
    const rightArm = scene.getMeshByName("shopkeeper-arm-1");
    if (!head || !leftArm || !rightArm) return;
    const seconds = performance.now() / 1000;
    head.rotation.y = Math.sin(seconds * 0.72) * 0.12;
    leftArm.rotation.z = -0.12 + Math.sin(seconds * 1.1) * 0.035;
    rightArm.rotation.z = 0.12 + Math.sin(seconds * 1.1 + 1.2) * 0.035;
  });
  return rooms;
}

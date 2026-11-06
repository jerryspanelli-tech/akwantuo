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
  return INTERIOR_BLUEPRINTS.map((blueprint, index) => {
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
}

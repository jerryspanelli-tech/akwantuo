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
  display: "#b88b4c"
};

function createMaterial(scene: Scene, id: string, colour: string): StandardMaterial {
  const value = new StandardMaterial("interior-material-" + id, scene);
  value.diffuseColor = Color3.FromHexString(colour);
  value.specularColor = new Color3(0.08, 0.08, 0.08);
  return value;
}

export function createInteriorRooms(scene: Scene): readonly InteriorRoomInstance[] {
  return INTERIOR_BLUEPRINTS.map((blueprint, index) => {
    const root = new TransformNode("interior-room-" + blueprint.id, scene);
    // Interiors are streamed as dormant room modules and enabled only on entry.
    root.position.set(10400 + index * 26, 0, 7800);
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
      const width = fixture.type === "counter" || fixture.type === "desk" || fixture.type === "tool_bench" ? 2.1 : isBed ? 2.2 : isSeat ? 0.9 : 1.2;
      const height = fixture.type === "shelf" ? 1.9 : fixture.type === "mirror" ? 1.7 : isSeat ? 0.9 : isBed ? 0.55 : 0.95;
      const depth = isBed ? 1.9 : fixture.type === "shelf" ? 0.55 : 0.85;
      const mesh = MeshBuilder.CreateBox("interior-fixture-" + blueprint.id + "-" + fixtureIndex, {
        width: width * scale, height: height * scale, depth: depth * scale
      }, scene);
      mesh.parent = root;
      mesh.position.set(fixture.x, height * scale / 2, fixture.z);
      mesh.rotation.y = fixture.rotationY;
      mesh.material = material;
      mesh.isPickable = false;
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

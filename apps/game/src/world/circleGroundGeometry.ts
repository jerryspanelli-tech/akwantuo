import {
  Color3,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3
} from "@babylonjs/core";

export type CircleGroundApproach = Readonly<{
  id: string;
  /** Bearing clockwise from north, in radians. */
  bearingRadians: number;
  roadWidthM: number;
  roadLengthM: number;
}>;

export type CircleGroundGeometryOptions = Readonly<{
  id: string;
  centerX: number;
  centerZ: number;
  groundElevationM: number;
  outerRadiusM: number;
  islandRadiusM: number;
  approaches?: readonly CircleGroundApproach[];
}>;

export type CircleGroundGeometryResult = Readonly<{
  circulatingSurface: Mesh;
  centralIsland: Mesh;
  islandKerb: Mesh;
  approachRoads: readonly Mesh[];
}>;

const ASPHALT = new Color3(0.15, 0.16, 0.16);
const ISLAND_GREEN = new Color3(0.16, 0.31, 0.17);
const KERB_GREY = new Color3(0.62, 0.62, 0.58);

function material(scene: Scene, name: string, color: Color3): StandardMaterial {
  const existing = scene.getMaterialByName(name);
  if (existing instanceof StandardMaterial) return existing;
  const created = new StandardMaterial(name, scene);
  created.diffuseColor = color;
  created.specularColor = new Color3(0.08, 0.08, 0.08);
  return created;
}

function validate(options: CircleGroundGeometryOptions): void {
  if (!options.id.trim()) throw new Error("Circle ground geometry id is required.");
  if (![options.centerX, options.centerZ, options.groundElevationM].every(Number.isFinite)) {
    throw new Error("Circle ground geometry position must be finite.");
  }
  if (!Number.isFinite(options.outerRadiusM) || options.outerRadiusM <= 0 ||
      !Number.isFinite(options.islandRadiusM) || options.islandRadiusM <= 0 ||
      options.islandRadiusM >= options.outerRadiusM) {
    throw new Error("Roundabout radii must be positive and the island must fit inside the outer radius.");
  }
  const approaches = options.approaches ?? [];
  if (new Set(approaches.map((approach) => approach.id)).size !== approaches.length ||
      approaches.some((approach) =>
        !approach.id.trim() ||
        !Number.isFinite(approach.bearingRadians) ||
        !Number.isFinite(approach.roadWidthM) || approach.roadWidthM <= 0 ||
        !Number.isFinite(approach.roadLengthM) || approach.roadLengthM <= 0
      )) {
    throw new Error("Roundabout approaches require unique ids, finite bearings and positive dimensions.");
  }
}

function markStatic(mesh: Mesh, materialValue: StandardMaterial): Mesh {
  mesh.material = materialValue;
  mesh.isPickable = false;
  mesh.checkCollisions = false;
  return mesh;
}

/**
 * Creates a modular ground-level roundabout surface and central island.
 * Approach arms are generated only when explicitly supplied by a reviewed
 * local layout. This utility does not infer traffic rules, crossings, signs,
 * lane markings, collision meshes or vehicle paths.
 */
export function createCircleGroundGeometry(
  scene: Scene,
  options: CircleGroundGeometryOptions
): CircleGroundGeometryResult {
  validate(options);

  const asphalt = material(scene, "akwantuo-circle-ground-asphalt", ASPHALT);
  const greenery = material(scene, "akwantuo-circle-ground-island", ISLAND_GREEN);
  const kerb = material(scene, "akwantuo-circle-ground-kerb", KERB_GREY);
  const base = new Vector3(options.centerX, options.groundElevationM, options.centerZ);

  const circulatingSurface = MeshBuilder.CreateDisc(
    `${options.id}-circulating-surface`,
    { radius: options.outerRadiusM, tessellation: 96, sideOrientation: Mesh.DOUBLESIDE },
    scene
  );
  circulatingSurface.rotation.x = Math.PI / 2;
  circulatingSurface.position.copyFrom(base);
  markStatic(circulatingSurface, asphalt);

  const centralIsland = MeshBuilder.CreateCylinder(
    `${options.id}-central-island`,
    {
      height: 0.32,
      diameterTop: options.islandRadiusM * 2,
      diameterBottom: options.islandRadiusM * 2,
      tessellation: 96
    },
    scene
  );
  centralIsland.position.set(options.centerX, options.groundElevationM + 0.16, options.centerZ);
  markStatic(centralIsland, greenery);

  const islandKerb = MeshBuilder.CreateTorus(
    `${options.id}-island-kerb`,
    { diameter: options.islandRadiusM * 2, thickness: 0.22, tessellation: 96 },
    scene
  );
  islandKerb.rotation.x = Math.PI / 2;
  islandKerb.position.set(options.centerX, options.groundElevationM + 0.11, options.centerZ);
  markStatic(islandKerb, kerb);

  const approachRoads = (options.approaches ?? []).map((approach) => {
    const bearing = approach.bearingRadians;
    const directionX = Math.sin(bearing);
    const directionZ = Math.cos(bearing);
    const road = MeshBuilder.CreateBox(
      `${options.id}-approach-${approach.id}`,
      { width: approach.roadWidthM, height: 0.08, depth: approach.roadLengthM },
      scene
    );
    road.rotation.y = bearing;
    const perimeterOverlapM = Math.min(8, options.outerRadiusM * 0.15);
    const roadCentreDistance = options.outerRadiusM + approach.roadLengthM / 2 - perimeterOverlapM;
    road.position.set(
      options.centerX + directionX * roadCentreDistance,
      options.groundElevationM + 0.015,
      options.centerZ + directionZ * roadCentreDistance
    );
    markStatic(road, asphalt);
    return road;
  });

  return { circulatingSurface, centralIsland, islandKerb, approachRoads };
}

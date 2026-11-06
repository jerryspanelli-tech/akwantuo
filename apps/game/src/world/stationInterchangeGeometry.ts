import {
  Color3,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3
} from "@babylonjs/core";

export type InterchangeBayKind = "trotro" | "city_bus" | "taxi" | "ride_hailing" | "private_dropoff";

export type InterchangeBayLayout = Readonly<{
  id: string;
  kind: InterchangeBayKind;
  centerX: number;
  centerZ: number;
  widthM: number;
  lengthM: number;
  operation: "boarding" | "alighting" | "both";
}>;

export type StationInterchangeGeometryOptions = Readonly<{
  centerX: number;
  centerZ: number;
  roadWidthM: number;
  roadLengthM: number;
  pedestrianIslandWidthM: number;
  pedestrianIslandLengthM: number;
  bays: readonly InterchangeBayLayout[];
}>;

export type StationInterchangeGeometryResult = Readonly<{
  road: Mesh;
  pedestrianIsland: Mesh;
  shelters: readonly Mesh[];
  bayMarkings: readonly Mesh[];
  crossing: Mesh;
  vehiclePlaceholders: readonly Mesh[];
  allMeshes: readonly Mesh[];
}>;

const MATERIALS = new Map<Scene, Map<string, StandardMaterial>>();

function material(scene: Scene, key: string, color: Color3): StandardMaterial {
  let cache = MATERIALS.get(scene);
  if (!cache) {
    cache = new Map();
    MATERIALS.set(scene, cache);
  }
  let value = cache.get(key);
  if (!value) {
    value = new StandardMaterial(`station-interchange-${key}`, scene);
    value.diffuseColor = color;
    value.specularColor = new Color3(0.04, 0.04, 0.04);
    cache.set(key, value);
  }
  return value;
}

function finish(mesh: Mesh, mat: StandardMaterial): Mesh {
  mesh.material = mat;
  mesh.isPickable = false;
  mesh.checkCollisions = false;
  return mesh;
}

/** Configurable visual forecourt. No station-specific bay positions are assumed. */
export function createStationInterchangeGeometry(
  scene: Scene,
  options: StationInterchangeGeometryOptions
): StationInterchangeGeometryResult {
  if (![options.centerX, options.centerZ, options.roadWidthM, options.roadLengthM,
    options.pedestrianIslandWidthM, options.pedestrianIslandLengthM].every(Number.isFinite) ||
    options.roadWidthM <= 0 || options.roadLengthM <= 0 ||
    options.pedestrianIslandWidthM <= 0 || options.pedestrianIslandLengthM <= 0) {
    throw new Error("Invalid station interchange dimensions.");
  }
  const ids = options.bays.map((bay) => bay.id);
  if (new Set(ids).size !== ids.length || options.bays.some((bay) =>
    !bay.id.trim() || ![bay.centerX, bay.centerZ, bay.widthM, bay.lengthM].every(Number.isFinite) ||
    bay.widthM <= 0 || bay.lengthM <= 0 ||
    !["trotro", "city_bus", "taxi", "ride_hailing", "private_dropoff"].includes(bay.kind) ||
    !["boarding", "alighting", "both"].includes(bay.operation)
  )) throw new Error("Invalid station interchange bay layout.");

  const road = finish(MeshBuilder.CreateGround("interchange-forecourt-road", {
    width: options.roadWidthM, height: options.roadLengthM
  }, scene), material(scene, "asphalt", new Color3(0.13, 0.15, 0.16)));
  road.position.set(options.centerX, 0.035, options.centerZ);

  const island = finish(MeshBuilder.CreateBox("interchange-pedestrian-island", {
    width: options.pedestrianIslandWidthM, height: 0.3, depth: options.pedestrianIslandLengthM
  }, scene), material(scene, "island", new Color3(0.67, 0.66, 0.58)));
  island.position.set(options.centerX, 0.2, options.centerZ);

  const shelterMat = material(scene, "shelter", new Color3(0.72, 0.78, 0.78));
  const roofMat = material(scene, "shelter-roof", new Color3(0.12, 0.2, 0.25));
  const paintMat = material(scene, "paint", new Color3(0.94, 0.82, 0.48));
  const glassMat = material(scene, "glass", new Color3(0.35, 0.68, 0.75));
  const shelters: Mesh[] = [];
  const markings: Mesh[] = [];
  const vehicles: Mesh[] = [];

  for (const bay of options.bays) {
    const shelter = finish(MeshBuilder.CreateBox(`interchange-shelter-${bay.id}`, {
      width: Math.min(bay.widthM, 7), height: 0.22, depth: Math.min(bay.lengthM, 9)
    }, scene), roofMat);
    shelter.position.set(bay.centerX, 3.1, bay.centerZ);
    shelters.push(shelter);
    for (const side of [-1, 1]) {
      const post = finish(MeshBuilder.CreateBox(`interchange-post-${bay.id}-${side}`, {
        width: 0.18, height: 3, depth: 0.18
      }, scene), shelterMat);
      post.position.set(bay.centerX + side * Math.min(bay.widthM / 2 - 0.2, 2.5), 1.5, bay.centerZ);
      shelters.push(post);
    }
    const marking = finish(MeshBuilder.CreateGround(`interchange-bay-marking-${bay.id}`, {
      width: bay.widthM, height: 0.18
    }, scene), paintMat);
    marking.position.set(bay.centerX, 0.065, bay.centerZ + bay.lengthM / 2);
    markings.push(marking);

    const bodyColor = bay.kind === "trotro" ? new Color3(0.16, 0.38, 0.72)
      : bay.kind === "city_bus" ? new Color3(0.82, 0.68, 0.18)
      : bay.kind === "taxi" ? new Color3(0.82, 0.73, 0.2)
      : bay.kind === "ride_hailing" ? new Color3(0.2, 0.48, 0.36)
      : new Color3(0.68, 0.7, 0.72);
    const body = finish(MeshBuilder.CreateBox(`interchange-vehicle-${bay.id}`, {
      width: Math.min(bay.widthM * 0.72, bay.kind === "city_bus" ? 3 : 2.2),
      height: bay.kind === "city_bus" ? 2.8 : bay.kind === "trotro" ? 2.1 : 1.25,
      depth: bay.kind === "city_bus" ? 9 : bay.kind === "trotro" ? 5.2 : 4.2
    }, scene), material(scene, `vehicle-${bay.kind}`, bodyColor));
    body.position.set(bay.centerX, bay.kind === "city_bus" ? 1.45 : bay.kind === "trotro" ? 1.1 : 0.72, bay.centerZ - 1);
    vehicles.push(body);
  }

  const crossing = finish(MeshBuilder.CreateGround("interchange-pedestrian-crossing", {
    width: options.pedestrianIslandWidthM * 1.5, height: 5
  }, scene), paintMat);
  crossing.position.set(options.centerX, 0.07, options.centerZ - options.pedestrianIslandLengthM / 2 - 3);

  const allMeshes = [road, island, crossing, ...shelters, ...markings, ...vehicles];
  return { road, pedestrianIsland: island, shelters, bayMarkings: markings, crossing, vehiclePlaceholders: vehicles, allMeshes };
}

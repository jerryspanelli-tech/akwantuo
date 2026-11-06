import {
  Color3,
  Matrix,
  Mesh,
  MeshBuilder,
  Quaternion,
  Scene,
  StandardMaterial,
  Vector3
} from "@babylonjs/core";
import { GREATER_ACCRA_RAIL_ROUTES, type RailNetworkRoute } from "./railNetwork";
import {
  GREATER_ACCRA_TRACK_PROFILE,
  getRailTrackDesign,
  isGreaterAccraTrackDesignValid
} from "./railTrackDesign";

export type RailTrackGeometryOptions = Readonly<{
  includeFutureExpansion?: boolean;
  sleeperSpacingM?: number;
  groundElevationM?: number;
}>;

export type RailTrackGeometryResult = Readonly<{
  routeId: string;
  ballast: Mesh;
  rails: readonly Mesh[];
  sleepers: Mesh;
  totalLengthM: number;
  sleeperCount: number;
  allMeshes: readonly Mesh[];
}>;

type Point2 = Readonly<{ x: number; z: number }>;

function getMaterial(scene: Scene, name: string, colour: Color3): StandardMaterial {
  const existing = scene.getMaterialByName(name);
  if (existing instanceof StandardMaterial) return existing;
  const material = new StandardMaterial(name, scene);
  material.diffuseColor = colour;
  material.specularColor = new Color3(0.12, 0.12, 0.12);
  return material;
}

function pathLength(points: readonly Point2[]): number {
  let length = 0;
  for (let index = 1; index < points.length; index += 1) {
    length += Math.hypot(
      points[index].x - points[index - 1].x,
      points[index].z - points[index - 1].z
    );
  }
  return length;
}

function pointAtDistance(points: readonly Point2[], distanceM: number): Point2 {
  let remaining = distanceM;
  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1];
    const end = points[index];
    const length = Math.hypot(end.x - start.x, end.z - start.z);
    if (remaining <= length || index === points.length - 1) {
      const t = length > 0 ? Math.min(1, remaining / length) : 0;
      return {
        x: start.x + (end.x - start.x) * t,
        z: start.z + (end.z - start.z) * t
      };
    }
    remaining -= length;
  }
  return points[points.length - 1];
}

function tangentAtDistance(points: readonly Point2[], distanceM: number): Point2 {
  const before = pointAtDistance(points, Math.max(0, distanceM - 0.5));
  const after = pointAtDistance(points, Math.min(pathLength(points), distanceM + 0.5));
  const dx = after.x - before.x;
  const dz = after.z - before.z;
  const length = Math.hypot(dx, dz);
  if (length < 1e-6) throw new Error("Rail route contains a zero-length tangent.");
  return { x: dx / length, z: dz / length };
}

function offsetPath(points: readonly Point2[], offsetM: number, y: number): Vector3[] {
  return points.map((point, index) => {
    const previous = points[Math.max(0, index - 1)];
    const next = points[Math.min(points.length - 1, index + 1)];
    const dx = next.x - previous.x;
    const dz = next.z - previous.z;
    const length = Math.hypot(dx, dz);
    if (length < 1e-6) throw new Error("Rail route contains a zero-length segment.");
    return new Vector3(
      point.x + (dz / length) * offsetM,
      y,
      point.z - (dx / length) * offsetM
    );
  });
}

function sampleCentreline(points: readonly Point2[], spacingM: number): Point2[] {
  const total = pathLength(points);
  const samples: Point2[] = [];
  for (let distanceM = 0; distanceM < total; distanceM += spacingM) {
    samples.push(pointAtDistance(points, distanceM));
  }
  samples.push(points[points.length - 1]);
  return samples;
}

function createTrackForRoute(
  scene: Scene,
  route: RailNetworkRoute,
  groundElevationM: number,
  sleeperSpacingM: number
): RailTrackGeometryResult {
  const profile = GREATER_ACCRA_TRACK_PROFILE;
  const points = route.points;
  const totalLengthM = pathLength(points);
  if (points.length < 2 || totalLengthM <= 0) {
    throw new Error(`Rail route "${route.id}" requires a valid centreline.`);
  }

  const ballastMaterial = getMaterial(scene, "akwantuo-rail-ballast", new Color3(0.28, 0.27, 0.25));
  const sleeperMaterial = getMaterial(scene, "akwantuo-rail-sleeper", new Color3(0.24, 0.19, 0.14));
  const railMaterial = getMaterial(scene, "akwantuo-rail-steel", new Color3(0.48, 0.52, 0.55));

  const sampled = sampleCentreline(points, 8);
  const halfBallast = profile.ballastWidthM / 2;
  const ballast = MeshBuilder.CreateRibbon(`${route.id}-ballast`, {
    pathArray: [
      offsetPath(sampled, halfBallast, groundElevationM + 0.04),
      offsetPath(sampled, -halfBallast, groundElevationM + 0.04)
    ],
    sideOrientation: Mesh.DOUBLESIDE
  }, scene);
  ballast.material = ballastMaterial;
  ballast.isPickable = false;
  ballast.checkCollisions = false;

  const railOffset = profile.gaugeM / 2;
  const railPaths = [
    offsetPath(sampled, railOffset, groundElevationM + 0.22),
    offsetPath(sampled, -railOffset, groundElevationM + 0.22)
  ];
  const rails = railPaths.map((path, index) => {
    const rail = MeshBuilder.CreateTube(`${route.id}-rail-${index}`, {
      path,
      radius: profile.railRadiusM,
      tessellation: 6,
      cap: Mesh.CAP_ALL
    }, scene);
    rail.material = railMaterial;
    rail.isPickable = false;
    rail.checkCollisions = false;
    return rail;
  });

  // One source sleeper plus thin instances avoids creating tens of thousands
  // of separate Babylon meshes across the long Greater Accra route catalogue.
  const sleeper = MeshBuilder.CreateBox(`${route.id}-sleepers`, {
    width: profile.sleeperLengthM,
    height: profile.sleeperHeightM,
    depth: profile.sleeperWidthM
  }, scene);
  sleeper.material = sleeperMaterial;
  sleeper.isPickable = false;
  sleeper.checkCollisions = false;
  const sleeperCount = Math.floor(totalLengthM / sleeperSpacingM) + 1;
  const matrices = new Float32Array(sleeperCount * 16);
  for (let index = 0; index < sleeperCount; index += 1) {
    const distanceM = Math.min(totalLengthM, index * sleeperSpacingM);
    const point = pointAtDistance(points, distanceM);
    const tangent = tangentAtDistance(points, distanceM);
    const yaw = Math.atan2(tangent.x, tangent.z);
    const rotation = Quaternion.RotationYawPitchRoll(yaw, 0, 0);
    const matrix = Matrix.Compose(
      Vector3.One(),
      rotation,
      new Vector3(point.x, groundElevationM + 0.13, point.z)
    );
    matrix.copyToArray(matrices, index * 16);
  }
  sleeper.thinInstanceSetBuffer("matrix", matrices, 16, true);

  return {
    routeId: route.id,
    ballast,
    rails,
    sleepers: sleeper,
    totalLengthM,
    sleeperCount,
    allMeshes: [ballast, ...rails, sleeper]
  };
}

/**
 * Creates visual-only ballast, paired 1,067 mm rails and instanced sleepers
 * along the schematic route catalogue. Not a surveyed railway alignment.
 */
export function createRailTrackGeometry(
  scene: Scene,
  routeId: string,
  options: RailTrackGeometryOptions = {}
): RailTrackGeometryResult {
  if (!isGreaterAccraTrackDesignValid()) {
    throw new Error("Greater Accra rail track design catalogue is invalid.");
  }
  const route = GREATER_ACCRA_RAIL_ROUTES.find((item) => item.id === routeId);
  const design = getRailTrackDesign(routeId);
  if (!route || !design) throw new Error(`Unknown rail track route: ${routeId}`);
  if (!route.firstRelease && !options.includeFutureExpansion) {
    throw new Error(`Rail track route "${routeId}" is reserved for future expansion.`);
  }
  const spacing = options.sleeperSpacingM ?? GREATER_ACCRA_TRACK_PROFILE.sleeperSpacingM;
  const elevation = options.groundElevationM ?? 0;
  if (!Number.isFinite(spacing) || spacing < 0.4 || spacing > 1.5 ||
      !Number.isFinite(elevation)) {
    throw new Error("Rail track geometry options are outside supported visual limits.");
  }
  return createTrackForRoute(scene, route, elevation, spacing);
}

export function createGreaterAccraRailTrackGeometry(
  scene: Scene,
  options: RailTrackGeometryOptions = {}
): readonly RailTrackGeometryResult[] {
  if (!isGreaterAccraTrackDesignValid()) {
    throw new Error("Greater Accra rail track design catalogue is invalid.");
  }
  return GREATER_ACCRA_RAIL_ROUTES
    .filter((route) => route.firstRelease || options.includeFutureExpansion === true)
    .map((route) => createRailTrackGeometry(scene, route.id, options));
}

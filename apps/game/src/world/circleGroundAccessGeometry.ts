import {
  Color3,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3
} from "@babylonjs/core";
import { getMapNodePosition } from "./greaterAccraLayout";
import { CIRCLE_GROUND_ACCESS_ROUTES } from "./circleGroundAccess";
import { CIRCLE_FEO_OYEO_RAMPS } from "./circleInterchangeElevatedLayout";
import { CIRCLE_GROUND_ROUNDABOUT_LAYOUT } from "./circleInterchangeGroundLevel";

export type CircleAccessPathPoint = Readonly<{
  name: string;
  /** Metres relative to the Circle centre node. */
  x: number;
  z: number;
  elevationM?: number;
}>;

export type CircleAccessPathLayout = Readonly<{
  routeId: string;
  widthM: number;
  surface: "asphalt" | "pedestrian_paving";
  points: readonly CircleAccessPathPoint[];
  designNote: string;
}>;

/**
 * Spatial placeholders for the named access corridors in circleGroundAccess.
 * These are intentionally provisional game-layout paths, not surveyed street
 * centre-lines, verified property boundaries or official traffic directions.
 */
export const CIRCLE_ACCESS_PATH_LAYOUTS: readonly CircleAccessPathLayout[] = [
  {
    routeId: "circle-ground-feo-oye-o-to-nsawam-local-access",
    widthM: 10,
    surface: "asphalt",
    points: [
      { name: "Feo Oyeo Road", x: 62, z: 55 },
      { name: "Dadeban Road", x: 135, z: 112 },
      { name: "Abotia Street", x: 215, z: 128 },
      { name: "Otublohum Road", x: 275, z: 72 },
      { name: "Obibini Street", x: 248, z: -18 },
      { name: "Nsawam Road", x: 155, z: -82 }
    ],
    designNote: "Street-name sequence follows the documented local access route. All point positions and the 10 m game road width are provisional."
  },
  {
    routeId: "circle-ground-otublohum-to-pedestrian-mall",
    widthM: 4,
    surface: "pedestrian_paving",
    points: [
      { name: "Nsawam Road", x: 155, z: -82 },
      { name: "Otublohum local roads", x: 205, z: -130 },
      { name: "Circle Pedestrian Shopping Mall", x: 275, z: -168 }
    ],
    designNote: "Pedestrian-only paved access placeholder. Keep the mall edge pedestrian-priority; exact entrance and path alignment require site verification."
  },
  {
    routeId: "circle-ground-ring-road-east-to-feo-oye-o",
    widthM: 12,
    surface: "asphalt",
    points: [
      { name: "Ring Road East", x: -155, z: -115 },
      { name: "Feo Oyeo intersection", x: -35, z: -28 },
      { name: "Ring Road West", x: 62, z: 55 }
    ],
    designNote: "Connectivity reference only. The exact at-grade relationship to elevated Ring Road structures is unresolved; this visual placeholder must be reviewed before driving integration."
  }
] as const;

function materialFor(scene: Scene, surface: CircleAccessPathLayout["surface"]): StandardMaterial {
  if (surface === "asphalt") {
    const sharedRoadMaterial = scene.getMaterialByName("akwantuo-road-asphalt");
    if (sharedRoadMaterial instanceof StandardMaterial) return sharedRoadMaterial;
  }
  const name = surface === "asphalt"
    ? "akwantuo-circle-local-asphalt"
    : "akwantuo-circle-pedestrian-paving";
  const existing = scene.getMaterialByName(name);
  if (existing instanceof StandardMaterial) return existing;
  const material = new StandardMaterial(name, scene);
  material.diffuseColor = surface === "asphalt"
    ? new Color3(0.19, 0.2, 0.2)
    : new Color3(0.55, 0.53, 0.46);
  material.specularColor = new Color3(0.08, 0.08, 0.08);
  return material;
}

function createPathMesh(
  scene: Scene,
  layout: CircleAccessPathLayout,
  centreX: number,
  centreZ: number
): Mesh {
  if (layout.points.length < 2 || layout.widthM <= 0) {
    throw new Error(`Circle access path ${layout.routeId} has invalid geometry.`);
  }
  const left: Vector3[] = [];
  const right: Vector3[] = [];
  layout.points.forEach((point, index) => {
    const previous = layout.points[Math.max(0, index - 1)];
    const next = layout.points[Math.min(layout.points.length - 1, index + 1)];
    const dx = next.x - previous.x;
    const dz = next.z - previous.z;
    const length = Math.hypot(dx, dz);
    if (length <= 1e-6) throw new Error(`Circle access path ${layout.routeId} has a zero-length tangent.`);
    const halfWidth = layout.widthM / 2;
    const normalX = dz / length;
    const normalZ = -dx / length;
    left.push(new Vector3(
      centreX + point.x + normalX * halfWidth,
      point.elevationM ?? (layout.surface === "pedestrian_paving" ? 0.12 : 0.08),
      centreZ + point.z + normalZ * halfWidth
    ));
    right.push(new Vector3(
      centreX + point.x - normalX * halfWidth,
      point.elevationM ?? (layout.surface === "pedestrian_paving" ? 0.12 : 0.08),
      centreZ + point.z - normalZ * halfWidth
    ));
  });
  const mesh = MeshBuilder.CreateRibbon(`akwantuo-${layout.routeId}`, {
    pathArray: [left, right],
    sideOrientation: Mesh.DOUBLESIDE,
    updatable: false
  }, scene);
  mesh.material = materialFor(scene, layout.surface);
  mesh.isPickable = false;
  mesh.checkCollisions = false;
  return mesh;
}

export type CircleGroundAccessGeometryResult = Readonly<{
  vehicleAccessRoads: readonly Mesh[];
  pedestrianAccessPaths: readonly Mesh[];
}>;

/**
 * Checks that both elevated-ramp feet have a short, deterministic tie-in to
 * one of the authored ground-level Circle approach arms.
 */
export function isCircleRampGroundAccessLayoutValid(): boolean {
  if (CIRCLE_FEO_OYEO_RAMPS.length !== 2) return false;
  return CIRCLE_FEO_OYEO_RAMPS.every((ramp) => {
    const foot = ramp.points.reduce((lowest, point) => point.y < lowest.y ? point : lowest);
    const nearest = CIRCLE_GROUND_ROUNDABOUT_LAYOUT.approaches.map((approach) => {
      const directionX = Math.sin(approach.bearingRadians);
      const directionZ = Math.cos(approach.bearingRadians);
      const along = foot.x * directionX + foot.z * directionZ;
      const projectedX = directionX * along;
      const projectedZ = directionZ * along;
      return {
        along,
        distanceM: Math.hypot(foot.x - projectedX, foot.z - projectedZ),
        roadHalfWidthM: approach.roadWidthM / 2,
        roadLengthM: approach.roadLengthM
      };
    }).filter((candidate) =>
        candidate.along >= CIRCLE_GROUND_ROUNDABOUT_LAYOUT.outerRadiusM - 8 &&
        candidate.along <= CIRCLE_GROUND_ROUNDABOUT_LAYOUT.outerRadiusM +
          candidate.roadLengthM - 8
      )
      .sort((a, b) => a.distanceM - b.distanceM)[0];
    return !!nearest && nearest.distanceM <= 80 &&
      nearest.roadHalfWidthM > 0 && ramp.deckWidthM > 0;
  });
}

/** Builds provisional local access surfaces around the Circle preview. */
export function createCircleGroundAccessGeometry(
  scene: Scene
): CircleGroundAccessGeometryResult {
  const centre = getMapNodePosition("circle-junction");
  if (!centre) throw new Error("Circle local access geometry is missing its map anchor.");
  const routeIds = new Set(CIRCLE_GROUND_ACCESS_ROUTES.map((route) => route.id));
  if (CIRCLE_ACCESS_PATH_LAYOUTS.length !== routeIds.size ||
      CIRCLE_ACCESS_PATH_LAYOUTS.some((layout) => !routeIds.has(layout.routeId)) ||
      new Set(CIRCLE_ACCESS_PATH_LAYOUTS.map((layout) => layout.routeId)).size !== routeIds.size) {
    throw new Error("Circle local access paths must map one-to-one to the named access route catalogue.");
  }
  const meshes = CIRCLE_ACCESS_PATH_LAYOUTS.map((layout) =>
    createPathMesh(scene, layout, centre.x, centre.z)
  );

  // Join each ramp foot to the nearest actual ground-level approach arm.
  // The connector endpoint is projected onto the authored approach centreline,
  // so it overlaps the road surface instead of stopping short beside it.
  const rampGroundConnectors: CircleAccessPathLayout[] = CIRCLE_FEO_OYEO_RAMPS.map((ramp) => {
    const foot = ramp.points.reduce((lowest, point) => point.y < lowest.y ? point : lowest);
    const candidates = CIRCLE_GROUND_ROUNDABOUT_LAYOUT.approaches.map((approach) => {
      const directionX = Math.sin(approach.bearingRadians);
      const directionZ = Math.cos(approach.bearingRadians);
      const along = foot.x * directionX + foot.z * directionZ;
      const projectedX = directionX * along;
      const projectedZ = directionZ * along;
      return {
        approach,
        projectedX,
        projectedZ,
        distanceM: Math.hypot(foot.x - projectedX, foot.z - projectedZ),
        along
      };
    }).filter((candidate) =>
        candidate.along >= CIRCLE_GROUND_ROUNDABOUT_LAYOUT.outerRadiusM - 8 &&
        candidate.along <= CIRCLE_GROUND_ROUNDABOUT_LAYOUT.outerRadiusM +
          candidate.approach.roadLengthM - 8
      )
      .sort((a, b) => a.distanceM - b.distanceM);
    const nearest = candidates[0];
    if (!nearest || nearest.distanceM > 80) {
      throw new Error(`Circle ramp ${ramp.id} has no nearby ground-road approach for a safe surface tie-in.`);
    }
    return {
      routeId: ramp.id + "-ground-approach-connector",
      widthM: Math.min(ramp.deckWidthM, nearest.approach.roadWidthM - 2),
      surface: "asphalt" as const,
      points: [
        { name: "Ramp ground foot", x: foot.x, z: foot.z, elevationM: foot.y },
        { name: nearest.approach.id + " road centreline", x: nearest.projectedX, z: nearest.projectedZ, elevationM: 0.055 }
      ],
      designNote: "Ground-level connector joins the ramp foot to the nearest authored Circle approach surface."
    };
  });
  const connectorMeshes = rampGroundConnectors.map((layout) =>
    createPathMesh(scene, layout, centre.x, centre.z)
  );
  return {
    vehicleAccessRoads: [
      ...meshes.filter((_, index) => CIRCLE_ACCESS_PATH_LAYOUTS[index].surface === "asphalt"),
      ...connectorMeshes
    ],
    pedestrianAccessPaths: meshes.filter((_, index) =>
      CIRCLE_ACCESS_PATH_LAYOUTS[index].surface === "pedestrian_paving"
    )
  };
}

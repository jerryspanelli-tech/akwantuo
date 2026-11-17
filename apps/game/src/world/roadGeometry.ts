import {
  Color3,
  DynamicTexture,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3,
  VertexData
} from "@babylonjs/core";
import type { RoadCrossSectionProfile } from "@akwantuo/shared";
import { getMapRoadPath, GREATER_ACCRA_ROAD_PATHS, type MapPoint } from "./greaterAccraLayout";
import { getRoadCrossSectionProfile, ROAD_CROSS_SECTION_PROFILES, GREATER_ACCRA_ROAD_DESIGNS } from "./roadDesign";
import { GREATER_ACCRA_JUNCTION_LAYOUTS } from "./junctionLayouts";
import { GREATER_ACCRA_ROAD_NETWORK } from "./roadNetwork";

type RoadBandKind = "asphalt" | "sidewalk" | "median" | "drain" | "curb";

type RoadBand = Readonly<{
  kind: RoadBandKind;
  innerOffsetM: number;
  outerOffsetM: number;
  y: number;
}>;

export type RoadGeometryOptions = Readonly<{
  /** Maximum spacing between generated cross-sections, in world metres. */
  sampleSpacingM?: number;
  /** Whether to build future expansion stubs as non-drivable visual guides. */
  includeFutureExpansion?: boolean;
}>;

const ROAD_MATERIAL_COLORS: Record<RoadBandKind, Color3> = {
  asphalt: new Color3(0.105, 0.12, 0.125),
  sidewalk: new Color3(0.48, 0.47, 0.42),
  median: new Color3(0.62, 0.59, 0.48),
  drain: new Color3(0.075, 0.09, 0.085),
  curb: new Color3(0.62, 0.62, 0.57)
};

function getMaterial(scene: Scene, kind: RoadBandKind): StandardMaterial {
  const name = `akwantuo-road-${kind}`;
  const existing = scene.getMaterialByName(name);
  if (existing instanceof StandardMaterial) return existing;

  const material = new StandardMaterial(name, scene);
  material.diffuseColor = ROAD_MATERIAL_COLORS[kind];
  material.specularColor = new Color3(0.025, 0.025, 0.025);
  if (kind === "asphalt") {
    // One shared, subtle procedural asphalt texture avoids a flat plastic look
    // without adding per-road images or large texture memory allocations.
    const texture = new DynamicTexture(
      "akwantuo-road-asphalt-grain",
      { width: 256, height: 256 },
      scene,
      false
    );
    const context = texture.getContext();
    context.fillStyle = "#343a3b";
    context.fillRect(0, 0, 256, 256);
    for (let index = 0; index < 5200; index += 1) {
      const x = (index * 73 + 19) % 256;
      const y = (index * 151 + 47) % 256;
      const shade = index % 3 === 0 ? 75 : index % 3 === 1 ? 105 : 135;
      context.fillStyle = "rgba(" + shade + "," + shade + "," + shade + "," + (0.08 + (index % 4) * 0.025) + ")";
      context.fillRect(x, y, 1 + (index % 2), 1);
    }
    texture.update(false);
    texture.uScale = 3;
    texture.vScale = 72;
    texture.anisotropicFilteringLevel = Math.min(8, scene.getEngine().getCaps().maxAnisotropy || 1);
    material.diffuseTexture = texture;
    material.diffuseColor = new Color3(0.9, 0.92, 0.92);
  }
  return material;
}

function distance(a: MapPoint, b: MapPoint): number {
  return Math.hypot(b.x - a.x, b.z - a.z);
}

/** Adds evenly spaced stations so long map segments do not become coarse strips. */
function samplePolyline(points: readonly MapPoint[], spacingM: number): MapPoint[] {
  const sampled: MapPoint[] = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    const length = distance(start, end);
    const steps = Math.max(1, Math.ceil(length / spacingM));
    for (let step = 0; step < steps; step += 1) {
      const t = step / steps;
      sampled.push({
        x: start.x + (end.x - start.x) * t,
        z: start.z + (end.z - start.z) * t
      });
    }
  }
  const last = points[points.length - 1];
  if (last) sampled.push({ x: last.x, z: last.z });
  return sampled;
}

/** Returns a stable left/right unit normal for each centreline station. */
function getNormals(points: readonly MapPoint[]): MapPoint[] {
  return points.map((point, index) => {
    const previous = points[Math.max(0, index - 1)];
    const next = points[Math.min(points.length - 1, index + 1)];
    const dx = next.x - previous.x;
    const dz = next.z - previous.z;
    const length = Math.hypot(dx, dz) || 1;
    return { x: dz / length, z: -dx / length };
  });
}

/**
 * Keeps corridor ribbons outside junction reservation envelopes. Dedicated
 * junction meshes will later occupy these spaces, avoiding overlapping
 * through-road ribbons at multi-level interchanges and urban junctions.
 */
function trimRoadPathAtJunctions(roadSegmentId: string, source: readonly MapPoint[]): MapPoint[] {
  const segment = GREATER_ACCRA_ROAD_NETWORK.segments.find((item) => item.id === roadSegmentId);
  if (!segment) throw new Error(`Unknown road segment for junction clipping: ${roadSegmentId}`);

  const clipEndpoint = (points: readonly MapPoint[], nodeId: string): MapPoint[] => {
    const reservation = GREATER_ACCRA_JUNCTION_LAYOUTS.find((item) => item.nodeId === nodeId);
    if (!reservation) return [...points];
    // Only Circle currently has a dedicated grade-separated/ground-level
    // junction package. Other reserved junctions have no connector geometry
    // yet, so clipping them creates visible dead ends. Keep those approaches
    // continuous and let them meet at grade until their interchanges are built.
    if (nodeId !== "circle-junction") return [...points];

    const halfX = reservation.reserveWidthM / 2 + 25;
    const halfZ = reservation.reserveDepthM / 2 + 25;
    const inside = (point: MapPoint) =>
      Math.abs(point.x - reservation.centre.x) <= halfX &&
      Math.abs(point.z - reservation.centre.z) <= halfZ;

    if (!inside(points[0])) return [...points];
    for (let index = 1; index < points.length; index += 1) {
      const previous = points[index - 1];
      const current = points[index];
      if (inside(current)) continue;

      let low = 0;
      let high = 1;
      for (let iteration = 0; iteration < 20; iteration += 1) {
        const middle = (low + high) / 2;
        const candidate = {
          x: previous.x + (current.x - previous.x) * middle,
          z: previous.z + (current.z - previous.z) * middle
        };
        if (inside(candidate)) low = middle;
        else high = middle;
      }
      const segmentLength = Math.hypot(current.x - previous.x, current.z - previous.z);
      const t = Math.min(1, high + 25 / Math.max(1, segmentLength));
      const cut = {
        x: previous.x + (current.x - previous.x) * t,
        z: previous.z + (current.z - previous.z) * t
      };
      return [cut, ...points.slice(index)];
    }
    return [];
  };

  let points = clipEndpoint(source, segment.fromNodeId);
  if (points.length < 2) return [];
  points = clipEndpoint([...points].reverse(), segment.toNodeId).reverse();
  return points;
}

function createBands(profile: RoadCrossSectionProfile): RoadBand[] {
  const drain = profile.drainageWidthM;
  const sidewalk = profile.sidewalkWidthM;
  const shoulder = profile.shoulderWidthM;
  const carriageway = profile.lanesPerDirection * profile.laneWidthM;
  const median = profile.medianWidthM;

  const intervals: Array<{ kind: RoadBandKind; width: number; y: number }> = [
    { kind: "drain", width: drain, y: 0.018 },
    { kind: "sidewalk", width: sidewalk, y: 0.032 },
    { kind: "asphalt", width: shoulder, y: 0.045 },
    { kind: "asphalt", width: carriageway, y: 0.05 },
    { kind: "median", width: median, y: 0.04 },
    { kind: "asphalt", width: carriageway, y: 0.05 },
    { kind: "asphalt", width: shoulder, y: 0.045 },
    { kind: "sidewalk", width: sidewalk, y: 0.032 },
    { kind: "drain", width: drain, y: 0.018 }
  ];

  const totalWidth = intervals.reduce((sum, item) => sum + item.width, 0);
  let offset = -totalWidth / 2;
  const bands: RoadBand[] = [];
  for (const interval of intervals) {
    if (interval.width <= 0) continue;
    bands.push({
      kind: interval.kind,
      innerOffsetM: offset,
      outerOffsetM: offset + interval.width,
      y: interval.y
    });
    offset += interval.width;
  }
  return bands;
}

/**
 * Builds a closed, extruded road band rather than a zero-thickness surface.
 * The top stays at the established road elevation so existing vehicle height
 * sampling and route coordinates are not silently shifted. Side walls and an
 * underside give the road a real 3D deck; thickness varies by band type.
 */
function createBandMesh(
  scene: Scene,
  name: string,
  points: readonly MapPoint[],
  normals: readonly MapPoint[],
  band: RoadBand
): Mesh {
  const positions: number[] = [];
  const indices: number[] = [];
  const thickness = band.kind === "asphalt" ? 0.42
    : band.kind === "sidewalk" ? 0.22
    : band.kind === "median" ? 0.28
    : 0.16;

  points.forEach((point, index) => {
    const normal = normals[index];
    const innerX = point.x + normal.x * band.innerOffsetM;
    const innerZ = point.z + normal.z * band.innerOffsetM;
    const outerX = point.x + normal.x * band.outerOffsetM;
    const outerZ = point.z + normal.z * band.outerOffsetM;
    positions.push(
      innerX, band.y, innerZ,
      outerX, band.y, outerZ,
      innerX, band.y - thickness, innerZ,
      outerX, band.y - thickness, outerZ
    );
  });

  const addDoubleSidedQuad = (a: number, b: number, c: number, d: number): void => {
    indices.push(a, b, c, a, c, d);
  };
  for (let index = 0; index < points.length - 1; index += 1) {
    const current = index * 4;
    const next = (index + 1) * 4;
    addDoubleSidedQuad(current, next, next + 1, current + 1);
    addDoubleSidedQuad(current + 2, current + 3, next + 3, next + 2);
    addDoubleSidedQuad(current, current + 2, next + 2, next);
    addDoubleSidedQuad(current + 1, next + 1, next + 3, current + 3);
  }

  const vertexData = new VertexData();
  vertexData.positions = positions;
  vertexData.indices = indices;
  vertexData.normals = [];
  VertexData.ComputeNormals(positions, indices, vertexData.normals);
  const mesh = new Mesh(name, scene);
  vertexData.applyToMesh(mesh, false);
  mesh.material = getMaterial(scene, band.kind);
  mesh.material.backFaceCulling = false;
  mesh.isPickable = false;
  mesh.checkCollisions = false;
  return mesh;
}

/**
 * Builds a road segment as separate continuous asphalt, sidewalk, median and
 * drainage ribbons. This is a reusable geometry layer; it does not yet place
 * traffic, signs, markings, junction ramps or roadside props.
 */
export function createRoadSegmentGeometry(
  scene: Scene,
  roadSegmentId: string,
  profile: RoadCrossSectionProfile,
  options: RoadGeometryOptions = {}
): Mesh[] {
  const path = getMapRoadPath(roadSegmentId);
  if (!path || path.points.length < 2) {
    throw new Error(`No valid map centreline found for road segment: ${roadSegmentId}`);
  }

  const spacing = options.sampleSpacingM ?? 35;
  if (!Number.isFinite(spacing) || spacing < 5 || spacing > 250) {
    throw new RangeError("Road sample spacing must be between 5 and 250 metres.");
  }

  const approachPath = trimRoadPathAtJunctions(roadSegmentId, path.points);
  if (approachPath.length < 2) return [];
  const points = samplePolyline(approachPath, spacing);
  const normals = getNormals(points);
  const meshes = createBands(profile).map((band, index) =>
    createBandMesh(scene, `${roadSegmentId}-${band.kind}-${index}`, points, normals, band)
  );

  // Raised kerb strips separate the asphalt shoulder from the pedestrian
  // pavement. They sit inside the authored cross-section and do not widen it.
  if (profile.sidewalkWidthM > 0) {
    const carriageway = profile.lanesPerDirection * profile.laneWidthM;
    const kerbCentre = profile.medianWidthM / 2 + carriageway + profile.shoulderWidthM;
    const kerbMaterial = getMaterial(scene, "curb");
    for (const side of [-1, 1] as const) {
      const inner = points.map((point, index) => new Vector3(
        point.x + normals[index].x * side * (kerbCentre - 0.08),
        0.12,
        point.z + normals[index].z * side * (kerbCentre - 0.08)
      ));
      const outer = points.map((point, index) => new Vector3(
        point.x + normals[index].x * side * (kerbCentre + 0.08),
        0.12,
        point.z + normals[index].z * side * (kerbCentre + 0.08)
      ));
      const kerb = MeshBuilder.CreateRibbon(
        `${roadSegmentId}-raised-kerb-${side === -1 ? "west" : "east"}`,
        { pathArray: [inner, outer], sideOrientation: Mesh.DOUBLESIDE, updatable: false },
        scene
      );
      kerb.material = kerbMaterial;
      kerb.isPickable = false;
      kerb.checkCollisions = false;
      meshes.push(kerb);
    }
  }
  return meshes;
}

/** Builds all first-release road ribbons from the approved layout catalogue. */
export function createGreaterAccraRoadGeometry(
  scene: Scene,
  options: RoadGeometryOptions = {}
): Mesh[] {
  const meshes: Mesh[] = [];

  for (const path of GREATER_ACCRA_ROAD_PATHS) {
    if (!path.playableInFirstRelease && !options.includeFutureExpansion) continue;
    const design = GREATER_ACCRA_ROAD_DESIGNS.find((item) => item.roadSegmentId === path.roadSegmentId);
    const profile = design && getRoadCrossSectionProfile(design.crossSectionProfileId);
    if (!profile || !ROAD_CROSS_SECTION_PROFILES.includes(profile)) {
      throw new Error(`Missing road cross-section profile for ${path.roadSegmentId}`);
    }
    meshes.push(...createRoadSegmentGeometry(scene, path.roadSegmentId, profile, options));
  }
  return meshes;
}


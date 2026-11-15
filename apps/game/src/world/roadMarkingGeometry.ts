import { Color3, Mesh, MeshBuilder, Scene, Vector3 } from "@babylonjs/core";
import type { RoadCrossSectionProfile } from "@akwantuo/shared";
import { getMapRoadPath, GREATER_ACCRA_ROAD_PATHS, type MapPoint } from "./greaterAccraLayout";
import { getRoadCrossSectionProfile, ROAD_CROSS_SECTION_PROFILES, GREATER_ACCRA_ROAD_DESIGNS } from "./roadDesign";
import { GREATER_ACCRA_JUNCTION_LAYOUTS } from "./junctionLayouts";
import { GREATER_ACCRA_ROAD_NETWORK } from "./roadNetwork";

export type RoadMarkingGeometryOptions = Readonly<{
  sampleSpacingM?: number;
  dashLengthM?: number;
  dashGapM?: number;
  lineHeightM?: number;
}>;

type MarkingPath = Readonly<{ points: readonly Vector3[] }>;

const WHITE = new Color3(0.92, 0.92, 0.86);
const EDGE_WHITE = new Color3(0.78, 0.8, 0.77);

function distance(a: MapPoint, b: MapPoint): number {
  return Math.hypot(b.x - a.x, b.z - a.z);
}

function samplePolyline(points: readonly MapPoint[], spacingM: number): MapPoint[] {
  const sampled: MapPoint[] = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    const length = distance(a, b);
    const steps = Math.max(1, Math.ceil(length / spacingM));
    for (let step = 0; step < steps; step += 1) {
      const t = step / steps;
      sampled.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
    }
  }
  const last = points[points.length - 1];
  if (last) sampled.push({ x: last.x, z: last.z });
  return sampled;
}

function getNormals(points: readonly MapPoint[]): MapPoint[] {
  return points.map((_, index) => {
    const previous = points[Math.max(0, index - 1)];
    const next = points[Math.min(points.length - 1, index + 1)];
    const dx = next.x - previous.x;
    const dz = next.z - previous.z;
    const length = Math.hypot(dx, dz) || 1;
    return { x: dz / length, z: -dx / length };
  });
}

function offsetPath(
  points: readonly MapPoint[],
  normals: readonly MapPoint[],
  offsetM: number,
  y: number
): Vector3[] {
  return points.map((point, index) => new Vector3(
    point.x + normals[index].x * offsetM,
    y,
    point.z + normals[index].z * offsetM
  ));
}

/**
 * Stops ordinary lane paint outside reserved junction envelopes. This prevents
 * centreline markings from being drawn straight through future flyovers,
 * signal junctions or roundabouts before their own geometry is authored.
 */
function trimAtJunctionReservations(
  roadSegmentId: string,
  source: readonly MapPoint[]
): MapPoint[] {
  const segment = GREATER_ACCRA_ROAD_NETWORK.segments.find((item) => item.id === roadSegmentId);
  if (!segment) throw new Error(`Unknown road segment for junction clipping: ${roadSegmentId}`);

  const clipFromEndpoint = (points: readonly MapPoint[], nodeId: string): MapPoint[] => {
    const reservation = GREATER_ACCRA_JUNCTION_LAYOUTS.find((item) => item.nodeId === nodeId);
    if (!reservation) return [...points];
    // Only Circle currently has a dedicated grade-separated/ground-level
    // junction package. Other reserved junctions have no connector geometry
    // yet, so clipping them creates visible dead ends. Keep those approaches
    // continuous and let them meet at grade until their interchanges are built.
    if (nodeId !== "circle-junction") return [...points];

    const halfWidth = reservation.reserveWidthM / 2 + 25;
    const halfDepth = reservation.reserveDepthM / 2 + 25;
    const inside = (point: MapPoint): boolean =>
      Math.abs(point.x - reservation.centre.x) <= halfWidth &&
      Math.abs(point.z - reservation.centre.z) <= halfDepth;

    if (!inside(points[0])) return [...points];
    for (let index = 1; index < points.length; index += 1) {
      const previous = points[index - 1];
      const current = points[index];
      if (inside(current)) continue;

      // Binary-search the first point just beyond the reservation boundary.
      let low = 0;
      let high = 1;
      for (let iteration = 0; iteration < 18; iteration += 1) {
        const middle = (low + high) / 2;
        const candidate = {
          x: previous.x + (current.x - previous.x) * middle,
          z: previous.z + (current.z - previous.z) * middle
        };
        if (inside(candidate)) low = middle;
        else high = middle;
      }
      const t = Math.min(1, high + 25 / Math.max(1, Math.hypot(current.x - previous.x, current.z - previous.z)));
      const cut = {
        x: previous.x + (current.x - previous.x) * t,
        z: previous.z + (current.z - previous.z) * t
      };
      return [cut, ...points.slice(index)];
    }
    return [];
  };

  let points = clipFromEndpoint(source, segment.fromNodeId);
  if (points.length < 2) return [];
  points = clipFromEndpoint([...points].reverse(), segment.toNodeId).reverse();
  return points;
}

function getPathLength(points: readonly Vector3[]): number {
  let length = 0;
  for (let i = 1; i < points.length; i += 1) length += Vector3.Distance(points[i - 1], points[i]);
  return length;
}

function pointAtDistance(points: readonly Vector3[], targetM: number): Vector3 {
  let traversed = 0;
  for (let i = 1; i < points.length; i += 1) {
    const start = points[i - 1];
    const end = points[i];
    const segmentLength = Vector3.Distance(start, end);
    if (traversed + segmentLength >= targetM) {
      const t = segmentLength === 0 ? 0 : (targetM - traversed) / segmentLength;
      return Vector3.Lerp(start, end, t);
    }
    traversed += segmentLength;
  }
  return points[points.length - 1].clone();
}

function makeDashedLines(path: readonly Vector3[], dashM: number, gapM: number): Vector3[][] {
  const lines: Vector3[][] = [];
  const total = getPathLength(path);
  for (let start = 0; start < total; start += dashM + gapM) {
    const end = Math.min(total, start + dashM);
    if (end - start < 0.5) continue;
    lines.push([pointAtDistance(path, start), pointAtDistance(path, end)]);
  }
  return lines;
}

function createLineMesh(
  scene: Scene,
  name: string,
  lines: Vector3[][],
  color: Color3
): Mesh | undefined {
  if (lines.length === 0) return undefined;
  const mesh = MeshBuilder.CreateLineSystem(name, { lines, updatable: false }, scene);
  mesh.color = color;
  mesh.alpha = 1;
  mesh.isPickable = false;
  mesh.checkCollisions = false;
  mesh.renderingGroupId = 1;
  return mesh;
}

/**
 * Builds provisional lane-divider and carriageway-edge paint for one road.
 * Markings follow the centreline and cross-section; junction stop lines,
 * crossings, arrows and box markings are intentionally handled separately.
 */
export function createRoadSegmentMarkings(
  scene: Scene,
  roadSegmentId: string,
  profile: RoadCrossSectionProfile,
  options: RoadMarkingGeometryOptions = {}
): Mesh[] {
  const path = getMapRoadPath(roadSegmentId);
  if (!path || path.points.length < 2) {
    throw new Error(`No valid map centreline found for road markings: ${roadSegmentId}`);
  }

  const spacing = options.sampleSpacingM ?? 12;
  const dashLength = options.dashLengthM ?? 4.5;
  const dashGap = options.dashGapM ?? 6;
  const y = options.lineHeightM ?? 0.085;
  if (!Number.isFinite(spacing) || spacing < 2 || spacing > 100) throw new RangeError("Marking sample spacing must be 2–100 metres.");
  if (!Number.isFinite(dashLength) || dashLength < 1 || dashLength > 20) throw new RangeError("Dash length must be 1–20 metres.");
  if (!Number.isFinite(dashGap) || dashGap < 1 || dashGap > 30) throw new RangeError("Dash gap must be 1–30 metres.");

  const approachPath = trimAtJunctionReservations(roadSegmentId, path.points);
  if (approachPath.length < 2) return [];
  const points = samplePolyline(approachPath, spacing);
  const normals = getNormals(points);
  const carriageway = profile.lanesPerDirection * profile.laneWidthM;
  const innerEdge = profile.medianWidthM / 2;
  const outerEdge = innerEdge + carriageway;
  const solidLines: Vector3[][] = [];
  const dashedLines: Vector3[][] = [];

  for (const side of [-1, 1] as const) {
    const inner = offsetPath(points, normals, side * innerEdge, y);
    const outer = offsetPath(points, normals, side * outerEdge, y);
    solidLines.push(inner, outer);

    for (let lane = 1; lane < profile.lanesPerDirection; lane += 1) {
      const dividerOffset = innerEdge + lane * profile.laneWidthM;
      const divider = offsetPath(points, normals, side * dividerOffset, y + 0.002);
      dashedLines.push(...makeDashedLines(divider, dashLength, dashGap));
    }
  }

  const meshes: Mesh[] = [];
  const solid = createLineMesh(scene, `${roadSegmentId}-edge-markings`, solidLines, EDGE_WHITE);
  const dashed = createLineMesh(scene, `${roadSegmentId}-lane-markings`, dashedLines, WHITE);
  if (solid) meshes.push(solid);
  if (dashed) meshes.push(dashed);
  return meshes;
}

/** Generates paint for first-release routes only; future gateways stay unpainted. */
export function createGreaterAccraRoadMarkings(
  scene: Scene,
  options: RoadMarkingGeometryOptions = {}
): Mesh[] {
  const meshes: Mesh[] = [];
  for (const path of GREATER_ACCRA_ROAD_PATHS) {
    if (!path.playableInFirstRelease) continue;
    const design = GREATER_ACCRA_ROAD_DESIGNS.find((item) => item.roadSegmentId === path.roadSegmentId);
    const profile = design && getRoadCrossSectionProfile(design.crossSectionProfileId);
    if (!profile || !ROAD_CROSS_SECTION_PROFILES.includes(profile)) {
      throw new Error(`Missing road cross-section profile for road markings: ${path.roadSegmentId}`);
    }
    meshes.push(...createRoadSegmentMarkings(scene, path.roadSegmentId, profile, options));
  }
  return meshes;
}

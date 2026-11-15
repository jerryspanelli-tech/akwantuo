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

export type ElevatedRoadPoint = Readonly<{
  x: number;
  y: number;
  z: number;
}>;

export type ElevatedRoadGeometryOptions = Readonly<{
  id: string;
  /** Ordered 3D road centreline points. Y is deck-top elevation in metres. */
  points: readonly ElevatedRoadPoint[];
  deckWidthM: number;
  deckThicknessM: number;
  /** Simplified ground datum for support columns in this local design area. */
  groundElevationM: number;
  /** Explicit support stations measured along the centreline; never auto-guessed. */
  supportStationsM?: readonly number[];
  supportWidthM?: number;
  supportDepthM?: number;
  /** Lateral offset from the carriageway centreline; use the median or shoulder, not a live lane. */
  supportLateralOffsetM?: number;
  guardrailHeightM?: number;
  guardrailInsetM?: number;
}>;

export type ElevatedRoadGeometryResult = Readonly<{
  deck: Mesh;
  underside: Mesh;
  fascia: readonly Mesh[];
  guardrails: readonly Mesh[];
  supports: readonly Mesh[];
  laneMarkings: readonly Mesh[];
  totalLengthM: number;
}>;

const DECK_COLOR = new Color3(0.16, 0.17, 0.17);
const CONCRETE_COLOR = new Color3(0.48, 0.49, 0.47);
const RAIL_COLOR = new Color3(0.24, 0.26, 0.27);

function getRoadPaintMaterial(scene: Scene): StandardMaterial {
  const name = "akwantuo-elevated-road-lane-paint";
  const existing = scene.getMaterialByName(name);
  if (existing instanceof StandardMaterial) return existing;
  const material = new StandardMaterial(name, scene);
  material.diffuseColor = new Color3(0.94, 0.93, 0.82);
  material.emissiveColor = new Color3(0.12, 0.12, 0.1);
  material.specularColor = new Color3(0, 0, 0);
  return material;
}

function getRoadSurfaceTexture(scene: Scene): DynamicTexture {
  const existing = scene.getTextureByName("akwantuo-elevated-road-asphalt-grain");
  if (existing instanceof DynamicTexture) return existing;
  const texture = new DynamicTexture(
    "akwantuo-elevated-road-asphalt-grain",
    { width: 128, height: 128 },
    scene,
    false
  );
  const context = texture.getContext();
  context.fillStyle = "#343839";
  context.fillRect(0, 0, 128, 128);
  for (let index = 0; index < 1800; index += 1) {
    const x = (index * 47 + 13) % 128;
    const z = (index * 83 + 29) % 128;
    const shade = index % 3 === 0 ? 80 : index % 3 === 1 ? 112 : 142;
    context.fillStyle = "rgba(" + shade + "," + shade + "," + shade + ",0.13)";
    context.fillRect(x, z, 1 + (index % 2), 1);
  }
  texture.update(false);
  texture.uScale = 2;
  texture.vScale = 18;
  texture.anisotropicFilteringLevel = Math.min(4, scene.getEngine().getCaps().maxAnisotropy || 1);
  return texture;
}

function createRoadPaintLine(
  scene: Scene,
  name: string,
  points: readonly ElevatedRoadPoint[],
  offsetM: number,
  widthM: number,
  dashed: boolean
): Mesh | undefined {
  const segments: Vector3[][] = [];
  let travelled = 0;
  const spacing = dashed ? 9 : Number.POSITIVE_INFINITY;
  let dashStart = 0;
  const sampleAt = (target: number): Vector3 => {
    let distance = 0;
    for (let index = 1; index < points.length; index += 1) {
      const a = points[index - 1];
      const b = points[index];
      const length = Math.hypot(b.x - a.x, b.z - a.z);
      if (distance + length >= target) {
        const t = length > 0 ? (target - distance) / length : 0;
        const x = a.x + (b.x - a.x) * t;
        const z = a.z + (b.z - a.z) * t;
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const magnitude = Math.hypot(dx, dz) || 1;
        return new Vector3(
          x + (dz / magnitude) * offsetM,
          a.y + (b.y - a.y) * t + 0.085,
          z - (dx / magnitude) * offsetM
        );
      }
      distance += length;
    }
    const last = points[points.length - 1];
    return new Vector3(last.x, last.y + 0.085, last.z);
  };
  for (let index = 1; index < points.length; index += 1) {
    travelled += Math.hypot(points[index].x - points[index - 1].x, points[index].z - points[index - 1].z);
  }
  if (dashed) {
    for (let start = 0; start < travelled; start += spacing) {
      const end = Math.min(travelled, start + 4.5);
      if (end - start > 0.4) segments.push([sampleAt(start), sampleAt(end)]);
    }
  } else {
    const path = points.map((_, index) => sampleAt(
      points.slice(0, index + 1).reduce((sum, point, pointIndex, all) =>
        pointIndex === 0 ? sum : sum + Math.hypot(point.x - all[pointIndex - 1].x, point.z - all[pointIndex - 1].z), 0)
    ));
    segments.push(path);
  }
  if (!segments.length) return undefined;
  const positions: number[] = [];
  const indices: number[] = [];
  for (const segment of segments) {
    for (let index = 1; index < segment.length; index += 1) {
      const start = segment[index - 1];
      const end = segment[index];
      const dx = end.x - start.x;
      const dz = end.z - start.z;
      const magnitude = Math.hypot(dx, dz);
      if (magnitude < 0.01) continue;
      const nx = (dz / magnitude) * widthM / 2;
      const nz = (-dx / magnitude) * widthM / 2;
      const base = positions.length / 3;
      positions.push(
        start.x + nx, start.y, start.z + nz,
        start.x - nx, start.y, start.z - nz,
        end.x + nx, end.y, end.z + nz,
        end.x - nx, end.y, end.z - nz
      );
      indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
    }
  }
  if (!indices.length) return undefined;
  const normals: number[] = [];
  VertexData.ComputeNormals(positions, indices, normals);
  const vertexData = new VertexData();
  vertexData.positions = positions;
  vertexData.indices = indices;
  vertexData.normals = normals;
  const mesh = new Mesh(name, scene);
  vertexData.applyToMesh(mesh, false);
  mesh.material = getRoadPaintMaterial(scene);
  mesh.isPickable = false;
  mesh.checkCollisions = false;
  // Keep paint in the opaque road pass so the depth buffer correctly hides
  // markings behind vehicles instead of drawing them over car bodies.
  mesh.renderingGroupId = 0;
  return mesh;
}

function getOrCreateMaterial(
  scene: Scene,
  name: string,
  color: Color3
): StandardMaterial {
  const existing = scene.getMaterialByName(name);
  if (existing instanceof StandardMaterial) return existing;
  const material = new StandardMaterial(name, scene);
  material.diffuseColor = color;
  material.specularColor = new Color3(0.12, 0.12, 0.12);
  return material;
}

function getPathLength(points: readonly ElevatedRoadPoint[]): number {
  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    total += Vector3.Distance(toVector(points[index - 1]), toVector(points[index]));
  }
  return total;
}

function toVector(point: ElevatedRoadPoint): Vector3 {
  return new Vector3(point.x, point.y, point.z);
}

function pointAtDistance(
  points: readonly ElevatedRoadPoint[],
  distanceM: number
): Vector3 {
  let traversed = 0;
  for (let index = 1; index < points.length; index += 1) {
    const start = toVector(points[index - 1]);
    const end = toVector(points[index]);
    const length = Vector3.Distance(start, end);
    if (traversed + length >= distanceM) {
      const t = length > 0 ? (distanceM - traversed) / length : 0;
      return Vector3.Lerp(start, end, t);
    }
    traversed += length;
  }
  return toVector(points[points.length - 1]);
}

function getSideOffset(
  points: readonly ElevatedRoadPoint[],
  index: number,
  offsetM: number
): Vector3 {
  const previous = toVector(points[Math.max(0, index - 1)]);
  const next = toVector(points[Math.min(points.length - 1, index + 1)]);
  const dx = next.x - previous.x;
  const dz = next.z - previous.z;
  const magnitude = Math.hypot(dx, dz);
  if (magnitude <= 1e-8) throw new Error("Elevated road contains a zero-length horizontal tangent.");
  return new Vector3((dz / magnitude) * offsetM, 0, (-dx / magnitude) * offsetM);
}

function createRibbon(
  scene: Scene,
  name: string,
  paths: Vector3[][]
): Mesh {
  const mesh = MeshBuilder.CreateRibbon(name, {
    pathArray: paths,
    sideOrientation: Mesh.DOUBLESIDE,
    updatable: false
  }, scene);
  mesh.isPickable = false;
  return mesh;
}

function validateOptions(options: ElevatedRoadGeometryOptions, totalLengthM: number): void {
  if (!options.id.trim()) throw new Error("Elevated road id is required.");
  if (options.points.length < 2) throw new Error("Elevated road requires at least two centreline points.");
  if (!options.points.every((point) =>
    Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.z)
  )) throw new Error("Elevated road points must contain finite x, y and z values.");
  if (!Number.isFinite(totalLengthM) || totalLengthM <= 0) {
    throw new Error("Elevated road centreline must have a positive length.");
  }
  if (!Number.isFinite(options.deckWidthM) || options.deckWidthM <= 0 ||
      !Number.isFinite(options.deckThicknessM) || options.deckThicknessM <= 0 ||
      !Number.isFinite(options.groundElevationM)) {
    throw new Error("Elevated road dimensions and ground elevation must be valid.");
  }
  const stations = options.supportStationsM ?? [];
  if (new Set(stations).size !== stations.length ||
      stations.some((station) => !Number.isFinite(station) || station < 0 || station > totalLengthM)) {
    throw new Error("Support stations must be unique distances within the elevated road length.");
  }
  if (stations.some((station) =>
    pointAtDistance(options.points, station).y - options.deckThicknessM <= options.groundElevationM
  )) {
    throw new Error("Every support station must have deck clearance above the configured ground elevation.");
  }
  if (options.supportStationsM && (
    !Number.isFinite(options.supportWidthM ?? 1.2) || (options.supportWidthM ?? 1.2) <= 0 ||
    !Number.isFinite(options.supportDepthM ?? 1.2) || (options.supportDepthM ?? 1.2) <= 0 ||
    !Number.isFinite(options.supportLateralOffsetM ?? 0) ||
    Math.abs(options.supportLateralOffsetM ?? 0) + (options.supportWidthM ?? 1.2) / 2 > options.deckWidthM / 2 - 0.35
  )) throw new Error("Support dimensions and lateral offset must keep columns within the deck and outside the edge clearance.");
  if (!Number.isFinite(options.guardrailHeightM ?? 1.1) || (options.guardrailHeightM ?? 1.1) < 0) {
    throw new Error("Guardrail height must be a non-negative finite value.");
  }
  if (!Number.isFinite(options.guardrailInsetM ?? 0.25) ||
      (options.guardrailInsetM ?? 0.25) < 0 ||
      (options.guardrailInsetM ?? 0.25) >= options.deckWidthM / 2) {
    throw new Error("Guardrail inset must be non-negative and remain inside the deck edge.");
  }
}

/**
 * Builds a reusable 3D elevated-road deck with underside, fascia, guardrails
 * and only the support columns explicitly supplied by the caller.
 *
 * This helper deliberately does not invent ramps, pier locations, vertical
 * clearances or collision behaviour. Supply a researched 3D centreline and
 * explicit support stations only after the local site layout is approved.
 */
export function createElevatedRoadGeometry(
  scene: Scene,
  options: ElevatedRoadGeometryOptions
): ElevatedRoadGeometryResult {
  const totalLengthM = getPathLength(options.points);
  validateOptions(options, totalLengthM);

  const halfWidth = options.deckWidthM / 2;
  const halfThickness = options.deckThicknessM;
  const leftTop: Vector3[] = [];
  const rightTop: Vector3[] = [];
  const leftBottom: Vector3[] = [];
  const rightBottom: Vector3[] = [];
  const leftRail: Vector3[] = [];
  const rightRail: Vector3[] = [];

  options.points.forEach((point, index) => {
    const centre = toVector(point);
    const left = getSideOffset(options.points, index, halfWidth);
    const right = left.scale(-1);
    const leftEdge = centre.add(left);
    const rightEdge = centre.add(right);
    leftTop.push(leftEdge);
    rightTop.push(rightEdge);
    leftBottom.push(new Vector3(leftEdge.x, leftEdge.y - halfThickness, leftEdge.z));
    rightBottom.push(new Vector3(rightEdge.x, rightEdge.y - halfThickness, rightEdge.z));
    const railOffset = halfWidth - (options.guardrailInsetM ?? 0.25);
    leftRail.push(new Vector3(
      centre.x + left.x * (railOffset / halfWidth),
      centre.y + (options.guardrailHeightM ?? 1.1),
      centre.z + left.z * (railOffset / halfWidth)
    ));
    rightRail.push(new Vector3(
      centre.x + right.x * (railOffset / halfWidth),
      centre.y + (options.guardrailHeightM ?? 1.1),
      centre.z + right.z * (railOffset / halfWidth)
    ));
  });

  const deck = createRibbon(scene, `${options.id}-deck`, [leftTop, rightTop]);
  deck.material = getOrCreateMaterial(scene, "akwantuo-elevated-road-deck", DECK_COLOR);
  const deckMaterial = deck.material as StandardMaterial;
  deckMaterial.diffuseTexture = getRoadSurfaceTexture(scene);
  deckMaterial.diffuseColor = new Color3(0.92, 0.94, 0.94);
  deckMaterial.specularColor = new Color3(0.025, 0.025, 0.025);

  const underside = createRibbon(scene, `${options.id}-underside`, [leftBottom, rightBottom]);
  underside.material = getOrCreateMaterial(scene, "akwantuo-elevated-road-concrete", CONCRETE_COLOR);

  const fascia = [
    createRibbon(scene, `${options.id}-left-fascia`, [leftTop, leftBottom]),
    createRibbon(scene, `${options.id}-right-fascia`, [rightTop, rightBottom])
  ];
  fascia.forEach((mesh) => {
    mesh.material = getOrCreateMaterial(scene, "akwantuo-elevated-road-concrete", CONCRETE_COLOR);
  });

  const railMaterial = getOrCreateMaterial(scene, "akwantuo-elevated-road-rail", RAIL_COLOR);
  const guardrails = [leftRail, rightRail].map((path, index) => {
    const rail = MeshBuilder.CreateTube(`${options.id}-guardrail-${index + 1}`, {
      path,
      radius: 0.075,
      tessellation: 6,
      cap: Mesh.CAP_ALL
    }, scene);
    rail.material = railMaterial;
    rail.isPickable = false;
    return rail;
  });

  const supportWidth = options.supportWidthM ?? 1.2;
  const supportDepth = options.supportDepthM ?? 1.2;
  const supportMaterial = getOrCreateMaterial(scene, "akwantuo-elevated-road-support", CONCRETE_COLOR);
  const supports = (options.supportStationsM ?? []).map((station, index) => {
    const deckPoint = pointAtDistance(options.points, station);
    const segmentIndex = options.points.findIndex((point, index) =>
      index < options.points.length - 1 &&
      getPathLength(options.points.slice(0, index + 2)) >= station
    );
    const lateral = getSideOffset(options.points, Math.max(0, segmentIndex), options.supportLateralOffsetM ?? 0);
    const supportHeight = deckPoint.y - halfThickness - options.groundElevationM;
    const support = MeshBuilder.CreateBox(`${options.id}-support-${index + 1}`, {
      width: supportWidth,
      depth: supportDepth,
      height: supportHeight
    }, scene);
    support.position.set(
      deckPoint.x + lateral.x,
      options.groundElevationM + supportHeight / 2,
      deckPoint.z + lateral.z
    );
    support.material = supportMaterial;
    support.isPickable = false;
    return support;
  });

  const laneMarkings: Mesh[] = [];
  const edgeOffset = halfWidth - 0.35;
  const leftEdge = createRoadPaintLine(scene, `${options.id}-left-edge-line`, options.points, edgeOffset, 0.18, false);
  const rightEdge = createRoadPaintLine(scene, `${options.id}-right-edge-line`, options.points, -edgeOffset, 0.18, false);
  const centreLine = createRoadPaintLine(scene, `${options.id}-centre-lane-line`, options.points, 0, 0.16, true);
  if (leftEdge) laneMarkings.push(leftEdge);
  if (rightEdge) laneMarkings.push(rightEdge);
  if (centreLine) laneMarkings.push(centreLine);

  return { deck, underside, fascia, guardrails, supports, laneMarkings, totalLengthM };
}

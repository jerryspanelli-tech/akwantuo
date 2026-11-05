import {
  Color3,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3
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
  guardrailHeightM?: number;
  guardrailInsetM?: number;
}>;

export type ElevatedRoadGeometryResult = Readonly<{
  deck: Mesh;
  underside: Mesh;
  fascia: readonly Mesh[];
  guardrails: readonly Mesh[];
  supports: readonly Mesh[];
  totalLengthM: number;
}>;

const DECK_COLOR = new Color3(0.16, 0.17, 0.17);
const CONCRETE_COLOR = new Color3(0.48, 0.49, 0.47);
const RAIL_COLOR = new Color3(0.24, 0.26, 0.27);

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
    !Number.isFinite(options.supportDepthM ?? 1.2) || (options.supportDepthM ?? 1.2) <= 0
  )) throw new Error("Support dimensions must be positive finite values.");
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
    const supportHeight = deckPoint.y - halfThickness - options.groundElevationM;
    const support = MeshBuilder.CreateBox(`${options.id}-support-${index + 1}`, {
      width: supportWidth,
      depth: supportDepth,
      height: supportHeight
    }, scene);
    support.position.set(
      deckPoint.x,
      options.groundElevationM + supportHeight / 2,
      deckPoint.z
    );
    support.material = supportMaterial;
    support.isPickable = false;
    return support;
  });

  return { deck, underside, fascia, guardrails, supports, totalLengthM };
}

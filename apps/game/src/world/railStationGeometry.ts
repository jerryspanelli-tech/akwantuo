import {
  Color3,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3
} from "@babylonjs/core";

export type UltraModernStationGeometryOptions = Readonly<{
  id: string;
  centerX: number;
  centerZ: number;
  groundElevationM: number;
  /** Main concourse footprint. All dimensions are provisional design targets. */
  concourseWidthM?: number;
  concourseLengthM?: number;
  concourseHeightM?: number;
  platformLengthM?: number;
  platformWidthM?: number;
  platformCount?: number;
}>;

export type UltraModernStationGeometryResult = Readonly<{
  concourse: readonly Mesh[];
  platforms: readonly Mesh[];
  canopies: readonly Mesh[];
  architecturalDetails: readonly Mesh[];
  allMeshes: readonly Mesh[];
}>;

const COLOURS = {
  glass: new Color3(0.34, 0.72, 0.82),
  structure: new Color3(0.78, 0.8, 0.79),
  roof: new Color3(0.22, 0.27, 0.3),
  accent: new Color3(0.78, 0.55, 0.22),
  platform: new Color3(0.53, 0.55, 0.53),
  tactile: new Color3(0.88, 0.68, 0.25),
  solar: new Color3(0.12, 0.2, 0.28)
} as const;

function getMaterial(
  scene: Scene,
  name: string,
  colour: Color3,
  alpha = 1
): StandardMaterial {
  const existing = scene.getMaterialByName(name);
  if (existing instanceof StandardMaterial) return existing;
  const created = new StandardMaterial(name, scene);
  created.diffuseColor = colour;
  created.specularColor = new Color3(0.18, 0.18, 0.18);
  created.alpha = alpha;
  created.backFaceCulling = false;
  return created;
}

function createBox(
  scene: Scene,
  name: string,
  dimensions: { width: number; height: number; depth: number },
  position: Vector3,
  material: StandardMaterial
): Mesh {
  const mesh = MeshBuilder.CreateBox(name, dimensions, scene);
  mesh.position.copyFrom(position);
  mesh.material = material;
  mesh.isPickable = false;
  mesh.checkCollisions = false;
  return mesh;
}

function validate(options: UltraModernStationGeometryOptions): void {
  if (!options.id.trim()) throw new Error("Station geometry requires an id.");
  if (![options.centerX, options.centerZ, options.groundElevationM].every(Number.isFinite)) {
    throw new Error("Station position must use finite coordinates.");
  }
  const values = [
    options.concourseWidthM ?? 34,
    options.concourseLengthM ?? 76,
    options.concourseHeightM ?? 12,
    options.platformLengthM ?? 180,
    options.platformWidthM ?? 8,
    options.platformCount ?? 2
  ];
  if (values.some((value) => !Number.isFinite(value) || value <= 0)) {
    throw new Error("Station dimensions and platform count must be positive.");
  }
  if (!Number.isInteger(options.platformCount ?? 2) ||
      (options.platformCount ?? 2) > 4) {
    throw new Error("Station preview supports one to four platforms.");
  }
}

/**
 * Creates a reusable ultra-modern station massing prototype: glazed concourse,
 * sculpted roof, shaded platform canopies, tactile platform edges and solar
 * roof accents. Dimensions and platform placement are visual design targets,
 * not approved railway engineering or surveyed station plans.
 */
export function createUltraModernRailStationGeometry(
  scene: Scene,
  options: UltraModernStationGeometryOptions
): UltraModernStationGeometryResult {
  validate(options);

  const width = options.concourseWidthM ?? 34;
  const length = options.concourseLengthM ?? 76;
  const height = options.concourseHeightM ?? 12;
  const platformLength = options.platformLengthM ?? 180;
  const platformWidth = options.platformWidthM ?? 8;
  const platformCount = options.platformCount ?? 2;
  const baseY = options.groundElevationM;

  const glass = getMaterial(scene, "akwantuo-station-glass", COLOURS.glass, 0.48);
  const structure = getMaterial(scene, "akwantuo-station-structure", COLOURS.structure);
  const roofMaterial = getMaterial(scene, "akwantuo-station-roof", COLOURS.roof);
  const accent = getMaterial(scene, "akwantuo-station-accent", COLOURS.accent);
  const platformMaterial = getMaterial(scene, "akwantuo-station-platform", COLOURS.platform);
  const tactile = getMaterial(scene, "akwantuo-station-tactile", COLOURS.tactile);
  const solar = getMaterial(scene, "akwantuo-station-solar", COLOURS.solar);

  const concourse: Mesh[] = [];
  const platforms: Mesh[] = [];
  const canopies: Mesh[] = [];
  const architecturalDetails: Mesh[] = [];
  const x = options.centerX;
  const z = options.centerZ;
  const halfWidth = width / 2;
  const halfLength = length / 2;

  // Raised, transparent passenger hall and a broad contemporary roof.
  concourse.push(createBox(scene, `${options.id}-hall-glass-front`,
    { width: length, height: height * 0.78, depth: 0.28 },
    new Vector3(x, baseY + height * 0.42, z - halfWidth), glass));
  concourse.push(createBox(scene, `${options.id}-hall-glass-back`,
    { width: length, height: height * 0.78, depth: 0.28 },
    new Vector3(x, baseY + height * 0.42, z + halfWidth), glass));
  concourse.push(createBox(scene, `${options.id}-hall-glass-west`,
    { width: 0.28, height: height * 0.78, depth: width },
    new Vector3(x - halfLength, baseY + height * 0.42, z), glass));
  concourse.push(createBox(scene, `${options.id}-hall-glass-east`,
    { width: 0.28, height: height * 0.78, depth: width },
    new Vector3(x + halfLength, baseY + height * 0.42, z), glass));
  concourse.push(createBox(scene, `${options.id}-hall-roof`,
    { width: length + 5, height: 1.25, depth: width + 5 },
    new Vector3(x, baseY + height, z), roofMaterial));
  concourse.push(createBox(scene, `${options.id}-hall-base`,
    { width: length, height: 0.45, depth: width },
    new Vector3(x, baseY + 0.22, z), structure));

  // Tall structural fins give the hall a strong civic-scale silhouette.
  for (let index = 0; index < 9; index += 1) {
    const finX = x - halfLength + 5 + index * ((length - 10) / 8);
    architecturalDetails.push(createBox(scene, `${options.id}-front-fin-${index}`,
      { width: 0.65, height: height * 0.88, depth: 0.55 },
      new Vector3(finX, baseY + height * 0.46, z - halfWidth - 0.12), structure));
    architecturalDetails.push(createBox(scene, `${options.id}-back-fin-${index}`,
      { width: 0.65, height: height * 0.88, depth: 0.55 },
      new Vector3(finX, baseY + height * 0.46, z + halfWidth + 0.12), structure));
  }

  // Ghana-inspired warm metal entrance portal and a deep weather canopy.
  architecturalDetails.push(createBox(scene, `${options.id}-entrance-portal`,
    { width: 18, height: 8, depth: 1.2 },
    new Vector3(x, baseY + 4, z - halfWidth - 1.1), accent));
  architecturalDetails.push(createBox(scene, `${options.id}-entrance-canopy`,
    { width: 30, height: 0.55, depth: 12 },
    new Vector3(x, baseY + 7.2, z - halfWidth - 5), roofMaterial));

  // Parallel platforms with tactile warning edges and lightweight solar canopies.
  const platformSpacing = platformWidth + 13;
  for (let index = 0; index < platformCount; index += 1) {
    const side = index % 2 === 0 ? -1 : 1;
    const row = Math.floor(index / 2);
    const platformZ = z + side * (halfWidth + 9 + row * platformSpacing);
    platforms.push(createBox(scene, `${options.id}-platform-${index}`,
      { width: platformLength, height: 0.42, depth: platformWidth },
      new Vector3(x, baseY + 0.21, platformZ), platformMaterial));
    platforms.push(createBox(scene, `${options.id}-platform-tactile-edge-${index}`,
      { width: platformLength, height: 0.08, depth: 0.65 },
      new Vector3(x, baseY + 0.46, platformZ - side * (platformWidth / 2 - 0.42)), tactile));
    canopies.push(createBox(scene, `${options.id}-platform-canopy-${index}`,
      { width: platformLength * 0.72, height: 0.55, depth: platformWidth + 3 },
      new Vector3(x, baseY + 6.2, platformZ), roofMaterial));
    for (const canopyX of [x - platformLength * 0.34, x, x + platformLength * 0.34]) {
      canopies.push(createBox(scene, `${options.id}-canopy-column-${index}-${canopyX}`,
        { width: 0.55, height: 6, depth: 0.55 },
        new Vector3(canopyX, baseY + 3.2, platformZ), structure));
    }
    canopies.push(createBox(scene, `${options.id}-solar-strip-${index}`,
      { width: platformLength * 0.5, height: 0.12, depth: platformWidth * 0.55 },
      new Vector3(x, baseY + 6.55, platformZ), solar));
  }

  const allMeshes = [...concourse, ...platforms, ...canopies, ...architecturalDetails];
  return { concourse, platforms, canopies, architecturalDetails, allMeshes };
}

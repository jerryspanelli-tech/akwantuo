import {
  Color3,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3
} from "@babylonjs/core";

export type StationAccessMode = "ramp" | "stairs" | "lift" | "sheltered_walkway";

export type StationAccessConnection = Readonly<{
  id: string;
  mode: StationAccessMode;
  /** Explicit endpoints supplied by a reviewed station/site layout. */
  from: Readonly<{ x: number; y: number; z: number }>;
  to: Readonly<{ x: number; y: number; z: number }>;
  widthM: number;
  roofed?: boolean;
  designNote?: string;
}>;

export type StationAccessGeometryOptions = Readonly<{
  stationId: string;
  connections: readonly StationAccessConnection[];
}>;

export type StationAccessGeometryResult = Readonly<{
  ramps: readonly Mesh[];
  stairs: readonly Mesh[];
  lifts: readonly Mesh[];
  shelteredWalkways: readonly Mesh[];
  allMeshes: readonly Mesh[];
}>;

const ACCESS_COLOURS = {
  paving: new Color3(0.58, 0.6, 0.58),
  tactile: new Color3(0.9, 0.69, 0.25),
  rail: new Color3(0.32, 0.36, 0.38),
  glass: new Color3(0.38, 0.72, 0.82),
  roof: new Color3(0.2, 0.25, 0.29),
  liftCab: new Color3(0.72, 0.76, 0.75)
} as const;

function getMaterial(scene: Scene, key: keyof typeof ACCESS_COLOURS): StandardMaterial {
  const name = `akwantuo-station-access-${key}`;
  const existing = scene.getMaterialByName(name);
  if (existing instanceof StandardMaterial) return existing;
  const material = new StandardMaterial(name, scene);
  material.diffuseColor = ACCESS_COLOURS[key];
  material.specularColor = new Color3(0.16, 0.16, 0.16);
  if (key === "glass") {
    material.alpha = 0.35;
    material.backFaceCulling = false;
  }
  return material;
}

function validateConnection(connection: StationAccessConnection): void {
  if (!connection.id.trim() ||
      ![connection.from.x, connection.from.y, connection.from.z,
        connection.to.x, connection.to.y, connection.to.z,
        connection.widthM].every(Number.isFinite) ||
      connection.widthM < 1.2 || connection.widthM > 12) {
    throw new Error("Station access connections need valid IDs, finite endpoints and a usable width.");
  }
  const horizontalLength = Math.hypot(
    connection.to.x - connection.from.x,
    connection.to.z - connection.from.z
  );
  const verticalChange = Math.abs(connection.to.y - connection.from.y);
  if (connection.mode === "lift") {
    if (horizontalLength > 0.25 || verticalChange < 1) {
      throw new Error("Lift endpoints must share a near-vertical shaft and have a meaningful level change.");
    }
  } else if (horizontalLength < 1 || (connection.mode === "ramp" && verticalChange < 0.01)) {
    throw new Error("Ramp, stair and walkway connections need a horizontal path; ramps also need a level change.");
  }
}

function vector(point: StationAccessConnection["from"]): Vector3 {
  return new Vector3(point.x, point.y, point.z);
}

function createRibbon(
  scene: Scene,
  name: string,
  left: Vector3[],
  right: Vector3[],
  material: StandardMaterial
): Mesh {
  const mesh = MeshBuilder.CreateRibbon(name, {
    pathArray: [left, right],
    sideOrientation: Mesh.DOUBLESIDE
  }, scene);
  mesh.material = material;
  mesh.isPickable = false;
  mesh.checkCollisions = false;
  return mesh;
}

function createRamp(
  scene: Scene,
  connection: StationAccessConnection,
  paving: StandardMaterial,
  rail: StandardMaterial,
  tactile: StandardMaterial
): Mesh[] {
  const start = vector(connection.from);
  const end = vector(connection.to);
  const direction = end.subtract(start);
  const horizontal = Math.hypot(direction.x, direction.z);
  const nx = -direction.z / horizontal;
  const nz = direction.x / horizontal;
  const half = connection.widthM / 2;
  const leftStart = new Vector3(start.x + nx * half, start.y, start.z + nz * half);
  const rightStart = new Vector3(start.x - nx * half, start.y, start.z - nz * half);
  const leftEnd = new Vector3(end.x + nx * half, end.y, end.z + nz * half);
  const rightEnd = new Vector3(end.x - nx * half, end.y, end.z - nz * half);
  const deck = createRibbon(scene, `${connection.id}-ramp-deck`,
    [leftStart, leftEnd], [rightStart, rightEnd], paving);
  const handrails = [
    MeshBuilder.CreateTube(`${connection.id}-ramp-handrail-left`, {
      path: [leftStart.add(new Vector3(0, 0.95, 0)), leftEnd.add(new Vector3(0, 0.95, 0))],
      radius: 0.055,
      tessellation: 6
    }, scene),
    MeshBuilder.CreateTube(`${connection.id}-ramp-handrail-right`, {
      path: [rightStart.add(new Vector3(0, 0.95, 0)), rightEnd.add(new Vector3(0, 0.95, 0))],
      radius: 0.055,
      tessellation: 6
    }, scene)
  ];
  for (const mesh of handrails) {
    mesh.material = rail;
    mesh.isPickable = false;
    mesh.checkCollisions = false;
  }
  const landing = MeshBuilder.CreateBox(`${connection.id}-ramp-tactile-landing`, {
    width: connection.widthM,
    height: 0.06,
    depth: 0.7
  }, scene);
  landing.position.copyFrom(end);
  landing.position.y += 0.06;
  landing.rotation.y = Math.atan2(direction.x, direction.z);
  landing.material = tactile;
  landing.isPickable = false;
  landing.checkCollisions = false;
  return [deck, ...handrails, landing];
}

function createStairs(
  scene: Scene,
  connection: StationAccessConnection,
  paving: StandardMaterial,
  tactile: StandardMaterial
): Mesh[] {
  const start = vector(connection.from);
  const end = vector(connection.to);
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const horizontal = Math.hypot(dx, dz);
  const yaw = Math.atan2(dx, dz);
  const rise = end.y - start.y;
  const count = Math.max(3, Math.ceil(Math.abs(rise) / 0.16));
  const treadDepth = horizontal / count;
  const meshes: Mesh[] = [];
  for (let index = 0; index < count; index += 1) {
    const t = (index + 0.5) / count;
    const mesh = MeshBuilder.CreateBox(`${connection.id}-stair-tread-${index}`, {
      width: connection.widthM,
      height: 0.18,
      depth: treadDepth + 0.04
    }, scene);
    mesh.position.set(
      start.x + dx * t,
      start.y + rise * t,
      start.z + dz * t
    );
    mesh.rotation.y = yaw;
    mesh.material = paving;
    mesh.isPickable = false;
    mesh.checkCollisions = false;
    meshes.push(mesh);
  }
  const landing = MeshBuilder.CreateBox(`${connection.id}-stair-top-landing`, {
    width: connection.widthM,
    height: 0.06,
    depth: 0.7
  }, scene);
  landing.position.copyFrom(end);
  landing.position.y += 0.06;
  landing.rotation.y = yaw;
  landing.material = tactile;
  landing.isPickable = false;
  landing.checkCollisions = false;
  meshes.push(landing);
  return meshes;
}

function createLift(
  scene: Scene,
  connection: StationAccessConnection,
  glass: StandardMaterial,
  cabMaterial: StandardMaterial,
  roofMaterial: StandardMaterial
): Mesh[] {
  const x = connection.from.x;
  const z = connection.from.z;
  const low = Math.min(connection.from.y, connection.to.y);
  const high = Math.max(connection.from.y, connection.to.y);
  const shaftHeight = high - low;
  const shaftWidth = connection.widthM;
  const shaftDepth = Math.max(2.2, connection.widthM * 0.8);
  const centreY = low + shaftHeight / 2;
  const walls: Mesh[] = [
    MeshBuilder.CreateBox(`${connection.id}-lift-shaft-front`, {
      width: shaftWidth, height: shaftHeight, depth: 0.12
    }, scene),
    MeshBuilder.CreateBox(`${connection.id}-lift-shaft-back`, {
      width: shaftWidth, height: shaftHeight, depth: 0.12
    }, scene),
    MeshBuilder.CreateBox(`${connection.id}-lift-shaft-left`, {
      width: 0.12, height: shaftHeight, depth: shaftDepth
    }, scene),
    MeshBuilder.CreateBox(`${connection.id}-lift-shaft-right`, {
      width: 0.12, height: shaftHeight, depth: shaftDepth
    }, scene)
  ];
  walls[0].position.set(x, centreY, z - shaftDepth / 2);
  walls[1].position.set(x, centreY, z + shaftDepth / 2);
  walls[2].position.set(x - shaftWidth / 2, centreY, z);
  walls[3].position.set(x + shaftWidth / 2, centreY, z);
  for (const wall of walls) {
    wall.material = glass;
    wall.isPickable = false;
    wall.checkCollisions = false;
  }
  const cab = MeshBuilder.CreateBox(`${connection.id}-lift-cab`, {
    width: shaftWidth * 0.82,
    height: Math.min(2.4, shaftHeight * 0.35),
    depth: shaftDepth * 0.78
  }, scene);
  cab.position.set(x, connection.from.y + 1.2, z);
  cab.material = cabMaterial;
  cab.isPickable = false;
  cab.checkCollisions = false;
  const canopy = MeshBuilder.CreateBox(`${connection.id}-lift-shaft-canopy`, {
    width: shaftWidth + 0.4,
    height: 0.22,
    depth: shaftDepth + 0.4
  }, scene);
  canopy.position.set(x, high + 0.11, z);
  canopy.material = roofMaterial;
  canopy.isPickable = false;
  canopy.checkCollisions = false;
  return [...walls, cab, canopy];
}

function createShelteredWalkway(
  scene: Scene,
  connection: StationAccessConnection,
  paving: StandardMaterial,
  roof: StandardMaterial,
  rail: StandardMaterial
): Mesh[] {
  const start = vector(connection.from);
  const end = vector(connection.to);
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const length = Math.hypot(dx, dz);
  const nx = -dz / length;
  const nz = dx / length;
  const half = connection.widthM / 2;
  const leftStart = new Vector3(start.x + nx * half, start.y, start.z + nz * half);
  const rightStart = new Vector3(start.x - nx * half, start.y, start.z - nz * half);
  const leftEnd = new Vector3(end.x + nx * half, end.y, end.z + nz * half);
  const rightEnd = new Vector3(end.x - nx * half, end.y, end.z - nz * half);
  const floor = createRibbon(scene, `${connection.id}-walkway-floor`,
    [leftStart, leftEnd], [rightStart, rightEnd], paving);
  const roofHeight = 3.6;
  const roofMesh = createRibbon(scene, `${connection.id}-walkway-roof`,
    [leftStart.add(new Vector3(0, roofHeight, 0)), leftEnd.add(new Vector3(0, roofHeight, 0))],
    [rightStart.add(new Vector3(0, roofHeight, 0)), rightEnd.add(new Vector3(0, roofHeight, 0))],
    roof);
  const supports: Mesh[] = [];
  const supportCount = Math.max(2, Math.ceil(length / 8));
  for (let index = 0; index <= supportCount; index += 1) {
    const t = index / supportCount;
    const point = Vector3.Lerp(start, end, t);
    for (const side of [-1, 1]) {
      const post = MeshBuilder.CreateBox(`${connection.id}-walkway-post-${index}-${side}`, {
        width: 0.18, height: roofHeight, depth: 0.18
      }, scene);
      post.position.set(
        point.x + nx * half * side,
        point.y + roofHeight / 2,
        point.z + nz * half * side
      );
      post.material = rail;
      post.isPickable = false;
      post.checkCollisions = false;
      supports.push(post);
    }
  }
  return [floor, roofMesh, ...supports];
}

/**
 * Creates configurable access geometry only from explicit site-layout endpoints.
 * No station-specific endpoint or platform position is invented by this module.
 * Visual-only meshes; gradients, stair dimensions and lift design require review.
 */
export function createStationPlatformAccessGeometry(
  scene: Scene,
  options: StationAccessGeometryOptions
): StationAccessGeometryResult {
  if (!options.stationId.trim()) throw new Error("Station access geometry requires a station ID.");
  const ids = new Set<string>();
  for (const connection of options.connections) {
    validateConnection(connection);
    if (ids.has(connection.id)) throw new Error(`Duplicate station access connection: ${connection.id}`);
    ids.add(connection.id);
  }

  const ramps: Mesh[] = [];
  const stairs: Mesh[] = [];
  const lifts: Mesh[] = [];
  const shelteredWalkways: Mesh[] = [];
  const paving = getMaterial(scene, "paving");
  const tactile = getMaterial(scene, "tactile");
  const rail = getMaterial(scene, "rail");
  const glass = getMaterial(scene, "glass");
  const roof = getMaterial(scene, "roof");
  const liftCab = getMaterial(scene, "liftCab");

  for (const connection of options.connections) {
    const prefix = `${options.stationId}-${connection.id}`;
    const normalized = { ...connection, id: prefix };
    if (connection.mode === "ramp") {
      ramps.push(...createRamp(scene, normalized, paving, rail, tactile));
    } else if (connection.mode === "stairs") {
      stairs.push(...createStairs(scene, normalized, paving, tactile));
    } else if (connection.mode === "lift") {
      lifts.push(...createLift(scene, normalized, glass, liftCab, roof));
    } else {
      shelteredWalkways.push(...createShelteredWalkway(scene, normalized, paving, roof, rail));
    }
  }

  return {
    ramps,
    stairs,
    lifts,
    shelteredWalkways,
    allMeshes: [...ramps, ...stairs, ...lifts, ...shelteredWalkways]
  };
}

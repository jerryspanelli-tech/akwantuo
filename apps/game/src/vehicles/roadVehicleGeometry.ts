import { Color3, Mesh, MeshBuilder, Scene, StandardMaterial } from "@babylonjs/core";

export type RoadVehicleGeometryOptions = Readonly<{
  id: string;
  centerX: number;
  centerZ: number;
  groundElevationM: number;
  bodyColour?: string;
}>;

export type RoadVehicleGeometryResult = Readonly<{
  bodyMeshes: readonly Mesh[];
  glassMeshes: readonly Mesh[];
  wheelMeshes: readonly Mesh[];
  detailMeshes: readonly Mesh[];
  allMeshes: readonly Mesh[];
}>;

function material(scene: Scene, name: string, colour: Color3, alpha = 1): StandardMaterial {
  const existing = scene.getMaterialByName(name);
  if (existing instanceof StandardMaterial) return existing;
  const created = new StandardMaterial(name, scene);
  created.diffuseColor = colour;
  created.specularColor = new Color3(0.22, 0.22, 0.22);
  created.alpha = alpha;
  created.backFaceCulling = false;
  return created;
}

function box(
  scene: Scene,
  name: string,
  width: number,
  height: number,
  depth: number,
  x: number,
  y: number,
  z: number,
  surface: StandardMaterial
): Mesh {
  const mesh = MeshBuilder.CreateBox(name, { width, height, depth }, scene);
  mesh.position.set(x, y, z);
  mesh.material = surface;
  mesh.isPickable = false;
  mesh.checkCollisions = false;
  return mesh;
}

/** Lightweight Ghana-road saloon-car presentation model; not a production asset. */
export function createRoadVehicleGeometry(
  scene: Scene,
  options: RoadVehicleGeometryOptions
): RoadVehicleGeometryResult {
  if (!options.id.trim() ||
      ![options.centerX, options.centerZ, options.groundElevationM].every(Number.isFinite)) {
    throw new Error("Invalid road vehicle geometry options.");
  }

  const bodyColour = options.bodyColour ?? "#d6d9dc";
  if (!/^#[0-9a-fA-F]{6}$/.test(bodyColour)) {
    throw new Error("Road vehicle body colour must be a six-digit hex colour.");
  }
  const bodyMaterial = material(scene, `${options.id}-body-material`, Color3.FromHexString(bodyColour));
  const glassMaterial = material(scene, `${options.id}-glass-material`, new Color3(0.12, 0.25, 0.31), 0.9);
  const trimMaterial = material(scene, `${options.id}-trim-material`, new Color3(0.08, 0.1, 0.12));
  const lampMaterial = material(scene, `${options.id}-lamp-material`, new Color3(0.95, 0.84, 0.58));
  const tailMaterial = material(scene, `${options.id}-tail-material`, new Color3(0.68, 0.08, 0.06));
  const tyreMaterial = material(scene, `${options.id}-tyre-material`, new Color3(0.055, 0.06, 0.065));
  const wheelHubMaterial = material(scene, `${options.id}-wheel-hub-material`, new Color3(0.58, 0.6, 0.61));
  const cabinMaterial = material(scene, `${options.id}-cabin-material`, new Color3(0.075, 0.09, 0.09));
  const seatMaterial = material(scene, `${options.id}-seat-material`, new Color3(0.16, 0.2, 0.18));
  const interiorTrimMaterial = material(scene, `${options.id}-interior-trim-material`, new Color3(0.55, 0.42, 0.22));
  glassMaterial.alpha = 0.3;
  glassMaterial.transparencyMode = StandardMaterial.MATERIAL_ALPHABLEND;

  const x = options.centerX;
  const z = options.centerZ;
  const y = options.groundElevationM;
  const bodyMeshes: Mesh[] = [];
  const glassMeshes: Mesh[] = [];
  const wheelMeshes: Mesh[] = [];
  const detailMeshes: Mesh[] = [];

  bodyMeshes.push(box(scene, `${options.id}-lower-body`, 1.82, 0.72, 4.35, x, y + 0.88, z, bodyMaterial));
  bodyMeshes.push(box(scene, `${options.id}-bonnet`, 1.78, 0.22, 1.08, x, y + 1.28, z + 1.55, bodyMaterial));
  bodyMeshes.push(box(scene, `${options.id}-boot`, 1.78, 0.2, 0.78, x, y + 1.24, z - 1.72, bodyMaterial));
  bodyMeshes.push(box(scene, `${options.id}-roof`, 1.48, 0.18, 1.82, x, y + 1.88, z - 0.05, bodyMaterial));

  // Cabin glazing follows the sloped windscreen and rear window with side glass bands.
  glassMeshes.push(box(scene, `${options.id}-windscreen`, 1.48, 0.72, 0.08, x, y + 1.58, z + 0.91, glassMaterial));
  glassMeshes.push(box(scene, `${options.id}-rear-window`, 1.42, 0.62, 0.08, x, y + 1.56, z - 1.02, glassMaterial));
  for (const side of [-1, 1]) {
    glassMeshes.push(box(scene, `${options.id}-front-side-window-${side}`, 0.07, 0.62, 0.82,
      x + side * 0.76, y + 1.58, z + 0.43, glassMaterial));
    glassMeshes.push(box(scene, `${options.id}-rear-side-window-${side}`, 0.07, 0.62, 0.72,
      x + side * 0.76, y + 1.58, z - 0.48, glassMaterial));
  }

  for (const axleZ of [-1.35, 1.35]) {
    for (const side of [-1, 1]) {
      const wheel = MeshBuilder.CreateCylinder(`${options.id}-wheel-${axleZ}-${side}`, {
        diameter: 0.68, height: 0.22, tessellation: 16
      }, scene);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x + side * 0.91, y + 0.43, z + axleZ);
      wheel.material = tyreMaterial;
      wheel.isPickable = false;
      wheel.checkCollisions = false;
      wheelMeshes.push(wheel);

      const hub = MeshBuilder.CreateCylinder(`${options.id}-wheel-hub-${axleZ}-${side}`, {
        diameter: 0.34, height: 0.235, tessellation: 12
      }, scene);
      hub.rotation.z = Math.PI / 2;
      hub.position.set(x + side * 0.91, y + 0.43, z + axleZ);
      hub.material = wheelHubMaterial;
      hub.isPickable = false;
      hub.checkCollisions = false;
      wheelMeshes.push(hub);
    }
  }

  for (const side of [-1, 1]) {
    detailMeshes.push(box(scene, `${options.id}-headlamp-${side}`, 0.42, 0.2, 0.08,
      x + side * 0.59, y + 1.12, z + 2.19, lampMaterial));
    detailMeshes.push(box(scene, `${options.id}-tail-lamp-${side}`, 0.38, 0.22, 0.08,
      x + side * 0.58, y + 1.08, z - 2.19, tailMaterial));
    detailMeshes.push(box(scene, `${options.id}-door-handle-${side}`, 0.06, 0.07, 0.22,
      x + side * 0.93, y + 1.03, z - 0.18, trimMaterial));
  }
  detailMeshes.push(box(scene, `${options.id}-front-grille`, 0.74, 0.24, 0.08,
    x, y + 0.9, z + 2.2, trimMaterial));
  detailMeshes.push(box(scene, `${options.id}-front-bumper`, 1.84, 0.16, 0.12,
    x, y + 0.57, z + 2.17, trimMaterial));
  detailMeshes.push(box(scene, `${options.id}-rear-bumper`, 1.84, 0.16, 0.12,
    x, y + 0.57, z - 2.17, trimMaterial));

  // Cabin detail makes the vehicle readable from its first-person driver view.
  detailMeshes.push(box(scene, `${options.id}-dashboard`, 1.52, 0.32, 0.42, x, y + 1.28, z + 0.78, cabinMaterial));
  detailMeshes.push(box(scene, `${options.id}-instrument-panel`, 1.12, 0.1, 0.035, x, y + 1.39, z + 0.98, interiorTrimMaterial));
  detailMeshes.push(box(scene, `${options.id}-centre-console`, 0.28, 0.28, 0.56, x, y + 0.98, z + 0.36, cabinMaterial));
  for (const seatX of [-0.43, 0.43]) {
    detailMeshes.push(box(scene, `${options.id}-front-seat-base-${seatX}`, 0.58, 0.16, 0.62, x + seatX, y + 0.91, z + 0.05, seatMaterial));
    detailMeshes.push(box(scene, `${options.id}-front-seat-back-${seatX}`, 0.58, 0.72, 0.18, x + seatX, y + 1.31, z - 0.23, seatMaterial));
    detailMeshes.push(box(scene, `${options.id}-front-headrest-${seatX}`, 0.38, 0.22, 0.14, x + seatX, y + 1.78, z - 0.23, interiorTrimMaterial));
  }
  detailMeshes.push(box(scene, `${options.id}-rear-bench-base`, 1.22, 0.16, 0.58, x, y + 0.91, z - 0.76, seatMaterial));
  detailMeshes.push(box(scene, `${options.id}-rear-bench-back`, 1.22, 0.64, 0.18, x, y + 1.29, z - 1.02, seatMaterial));
  const steeringWheel = MeshBuilder.CreateTorus(`${options.id}-steering-wheel`, { diameter: 0.46, thickness: 0.055, tessellation: 20 }, scene);
  steeringWheel.position.set(x - 0.43, y + 1.56, z + 0.66);
  steeringWheel.rotation.x = Math.PI / 2;
  steeringWheel.material = interiorTrimMaterial;
  steeringWheel.isPickable = false;
  detailMeshes.push(steeringWheel);
  for (const side of [-1, 1]) {
    detailMeshes.push(box(scene, `${options.id}-side-mirror-${side}`, 0.12, 0.2, 0.28, x + side * 1.02, y + 1.48, z + 1.28, trimMaterial));
    detailMeshes.push(box(scene, `${options.id}-door-inner-trim-${side}`, 0.08, 0.28, 1.4, x + side * 0.84, y + 1.02, z - 0.1, cabinMaterial));
  }

  const allMeshes = [...bodyMeshes, ...glassMeshes, ...wheelMeshes, ...detailMeshes];
  return { bodyMeshes, glassMeshes, wheelMeshes, detailMeshes, allMeshes };
}

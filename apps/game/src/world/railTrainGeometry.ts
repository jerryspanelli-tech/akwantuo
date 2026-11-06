import {
  Color3,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3
} from "@babylonjs/core";

import { GREATER_ACCRA_TRACK_PROFILE } from "./railTrackDesign";

const CAPE_GAUGE_METRES = GREATER_ACCRA_TRACK_PROFILE.gaugeM;

export type RailTrainGeometryOptions = Readonly<{
  id: string;
  centerX: number;
  centerZ: number;
  groundElevationM: number;
  carCount?: number;
  carLengthM?: number;
  carWidthM?: number;
  carHeightM?: number;
}>;

export type RailTrainGeometryResult = Readonly<{
  bodyMeshes: readonly Mesh[];
  windowMeshes: readonly Mesh[];
  bogieMeshes: readonly Mesh[];
  detailMeshes: readonly Mesh[];
  allMeshes: readonly Mesh[];
}>;

function getMaterial(scene: Scene, name: string, colour: Color3, alpha = 1): StandardMaterial {
  const existing = scene.getMaterialByName(name);
  if (existing instanceof StandardMaterial) return existing;
  const material = new StandardMaterial(name, scene);
  material.diffuseColor = colour;
  material.specularColor = new Color3(0.2, 0.2, 0.2);
  material.alpha = alpha;
  material.backFaceCulling = false;
  return material;
}

function makeBox(
  scene: Scene,
  name: string,
  width: number,
  height: number,
  depth: number,
  x: number,
  y: number,
  z: number,
  material: StandardMaterial
): Mesh {
  const mesh = MeshBuilder.CreateBox(name, { width, height, depth }, scene);
  mesh.position.set(x, y, z);
  mesh.material = material;
  mesh.isPickable = false;
  mesh.checkCollisions = false;
  return mesh;
}

/**
 * Low-poly commuter-train visual prototype for the ultra-modern station preview.
 * It is static presentation geometry: no traction, doors, passenger interior,
 * rail contact, braking, signalling or operational behaviour.
 */
export function createRailTrainGeometry(
  scene: Scene,
  options: RailTrainGeometryOptions
): RailTrainGeometryResult {
  const carCount = options.carCount ?? 2;
  const carLength = options.carLengthM ?? 26;
  const carWidth = options.carWidthM ?? 3.2;
  const carHeight = options.carHeightM ?? 3.7;
  if (!options.id.trim() ||
      ![options.centerX, options.centerZ, options.groundElevationM,
        carLength, carWidth, carHeight].every(Number.isFinite) ||
      !Number.isInteger(carCount) || carCount < 1 || carCount > 6 ||
      carLength < 12 || carWidth < 2.4 || carHeight < 2.4) {
    throw new Error("Invalid rail train geometry options.");
  }

  const bodyMaterial = getMaterial(scene, "akwantuo-train-body", new Color3(0.82, 0.84, 0.82));
  const lowerMaterial = getMaterial(scene, "akwantuo-train-lower-body", new Color3(0.12, 0.22, 0.29));
  const glassMaterial = getMaterial(scene, "akwantuo-train-glass", new Color3(0.12, 0.32, 0.4), 0.88);
  const trimMaterial = getMaterial(scene, "akwantuo-train-warm-trim", new Color3(0.78, 0.48, 0.18));
  const tyreMaterial = getMaterial(scene, "akwantuo-train-wheel", new Color3(0.08, 0.09, 0.1));
  const lampMaterial = getMaterial(scene, "akwantuo-train-lamp", new Color3(0.98, 0.9, 0.65));
  const bodyMeshes: Mesh[] = [];
  const windowMeshes: Mesh[] = [];
  const bogieMeshes: Mesh[] = [];
  const detailMeshes: Mesh[] = [];
  const carGap = 0.65;
  const totalLength = carCount * carLength + (carCount - 1) * carGap;
  const startX = options.centerX - totalLength / 2;
  const baseY = options.groundElevationM;

  for (let car = 0; car < carCount; car += 1) {
    const carX = startX + carLength / 2 + car * (carLength + carGap);
    const carId = `${options.id}-car-${car}`;
    bodyMeshes.push(makeBox(scene, `${carId}-body`, carLength, carHeight, carWidth,
      carX, baseY + 1.95, options.centerZ, bodyMaterial));
    bodyMeshes.push(makeBox(scene, `${carId}-lower-skirt`, carLength * 0.94, 0.65, carWidth + 0.08,
      carX, baseY + 0.62, options.centerZ, lowerMaterial));
    bodyMeshes.push(makeBox(scene, `${carId}-roof`, carLength * 0.9, 0.28, carWidth * 0.92,
      carX, baseY + 3.88, options.centerZ, bodyMaterial));
    detailMeshes.push(makeBox(scene, `${carId}-waist-trim`, carLength * 0.96, 0.16, carWidth + 0.1,
      carX, baseY + 1.25, options.centerZ, trimMaterial));

    const windowCount = Math.max(4, Math.floor(carLength / 3.2));
    const windowWidth = Math.min(2.25, (carLength - 5) / windowCount - 0.45);
    for (let index = 0; index < windowCount; index += 1) {
      const windowX = carX - carLength / 2 + 3.1 + index * ((carLength - 6.2) / (windowCount - 1));
      for (const side of [-1, 1]) {
        windowMeshes.push(makeBox(scene, `${carId}-side-window-${index}-${side}`,
          windowWidth, 1.25, 0.07, windowX, baseY + 2.65,
          options.centerZ + side * (carWidth / 2 + 0.04), glassMaterial));
      }
    }

    for (const bogieOffset of [-carLength * 0.31, carLength * 0.31]) {
      const bogieX = carX + bogieOffset;
      bogieMeshes.push(makeBox(scene, `${carId}-bogie-frame-${bogieOffset}`,
        3.4, 0.48, CAPE_GAUGE_METRES + 0.25, bogieX, baseY + 0.55, options.centerZ, lowerMaterial));
      for (const side of [-1, 1]) {
        const wheel = MeshBuilder.CreateCylinder(`${carId}-wheel-${bogieOffset}-${side}`, {
          diameter: 0.82, height: 0.24, tessellation: 12
        }, scene);
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(bogieX, baseY + 0.42, options.centerZ + side * (CAPE_GAUGE_METRES / 2));
        wheel.material = tyreMaterial;
        wheel.isPickable = false;
        wheel.checkCollisions = false;
        bogieMeshes.push(wheel);
      }
    }

    // A simple cab face and paired headlights on the leading end only.
    if (car === 0) {
      detailMeshes.push(makeBox(scene, `${carId}-front-windscreen`,
        4.4, 1.45, 0.08, carX - carLength / 2 - 0.05, baseY + 2.8,
        options.centerZ, glassMaterial));
      for (const side of [-1, 1]) {
        detailMeshes.push(makeBox(scene, `${carId}-headlamp-${side}`,
          0.55, 0.32, 0.12, carX - carLength / 2 - 0.1, baseY + 1.65,
          options.centerZ + side * 1.05, lampMaterial));
      }
    }
  }

  const allMeshes = [...bodyMeshes, ...windowMeshes, ...bogieMeshes, ...detailMeshes];
  return { bodyMeshes, windowMeshes, bogieMeshes, detailMeshes, allMeshes };
}

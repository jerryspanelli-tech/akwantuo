import { TransformNode, Vector3, type Scene } from "@babylonjs/core";
import type { RoadVehicleDynamicsState } from "./roadVehicleDynamics";
import type { RoadVehicleGeometryResult } from "./roadVehicleGeometry";

export type RoadVehicleRigOptions = Readonly<{
  id: string;
  origin: Readonly<{ x: number; y: number; z: number }>;
}>;

export type RoadVehicleRig = Readonly<{
  root: TransformNode;
  update: (state: RoadVehicleDynamicsState, elevationM?: number) => void;
  dispose: () => void;
}>;

/** Parents a saloon visual under one root and applies the shared kinematic state. */
export function createRoadVehicleRig(
  scene: Scene,
  geometry: RoadVehicleGeometryResult,
  options: RoadVehicleRigOptions
): RoadVehicleRig {
  if (!options.id.trim() ||
      ![options.origin.x, options.origin.y, options.origin.z].every(Number.isFinite) ||
      geometry.allMeshes.length === 0 ||
      geometry.allMeshes.some((mesh) => mesh.isDisposed())) {
    throw new Error("Invalid road vehicle rig options or geometry.");
  }

  const root = new TransformNode(options.id, scene);
  root.position.set(options.origin.x, options.origin.y, options.origin.z);
  for (const mesh of geometry.allMeshes) {
    mesh.position.subtractInPlace(root.position);
    mesh.parent = root;
  }

  let disposed = false;
  let previousWheelPosition = { x: options.origin.x, z: options.origin.z };
  const update = (state: RoadVehicleDynamicsState, elevationM = options.origin.y): void => {
    if (disposed) throw new Error("Cannot update a disposed road vehicle rig.");
    if (![state.x, state.z, state.headingRadians, state.speedMps, elevationM].every(Number.isFinite)) {
      throw new Error("Road vehicle state contains non-finite transform values.");
    }
    const travelledM = Math.hypot(state.x - previousWheelPosition.x, state.z - previousWheelPosition.z) * Math.sign(state.speedMps || 1);
    const wheelRotation = travelledM / 0.34;
    for (const wheel of geometry.wheelMeshes) wheel.rotation.x += wheelRotation;
    previousWheelPosition = { x: state.x, z: state.z };
    root.position.copyFrom(new Vector3(state.x, elevationM, state.z));
    root.rotation.y = state.headingRadians;
  };

  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    root.dispose(false, false);
    for (const mesh of geometry.allMeshes) {
      if (!mesh.isDisposed()) mesh.dispose(false, false);
    }
  };

  return { root, update, dispose };
}

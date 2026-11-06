import { TransformNode, Vector3, type Scene } from "@babylonjs/core";
import type { RailTrainGeometryResult } from "./railTrainGeometry";
import type { RailTrainOperationFrame } from "./railTrainOperations";

export type RailTrainRigOptions = Readonly<{
  id: string;
  origin: Readonly<{ x: number; y: number; z: number }>;
}>;

export type RailTrainRig = Readonly<{
  root: TransformNode;
  update: (frame: RailTrainOperationFrame, elevationM?: number) => void;
  dispose: () => void;
}>;

/**
 * Groups the existing train meshes under one movable root and applies the
 * operation controller's sampled position and heading. The train geometry is
 * authored along local +X; operation headings are measured from +Z.
 */
export function createRailTrainRig(
  scene: Scene,
  geometry: RailTrainGeometryResult,
  options: RailTrainRigOptions
): RailTrainRig {
  if (!options.id.trim() ||
      ![options.origin.x, options.origin.y, options.origin.z].every(Number.isFinite) ||
      geometry.allMeshes.length === 0 ||
      geometry.allMeshes.some((mesh) => mesh.isDisposed())) {
    throw new Error("Invalid rail train rig options or geometry.");
  }

  const root = new TransformNode(options.id, scene);
  root.position.set(options.origin.x, options.origin.y, options.origin.z);

  // Convert the geometry builder's world-space positions into root-local
  // coordinates before parenting, preserving the train's original placement.
  for (const mesh of geometry.allMeshes) {
    mesh.position.subtractInPlace(root.position);
    mesh.parent = root;
  }

  let disposed = false;
  const update = (frame: RailTrainOperationFrame, elevationM = options.origin.y): void => {
    if (disposed) throw new Error("Cannot update a disposed rail train rig.");
    if (![frame.position.x, frame.position.z, frame.headingRadians, elevationM].every(Number.isFinite)) {
      throw new Error("Rail train frame contains non-finite transform values.");
    }
    root.position.copyFrom(new Vector3(frame.position.x, elevationM, frame.position.z));
    root.rotation.y = frame.headingRadians - Math.PI / 2;
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

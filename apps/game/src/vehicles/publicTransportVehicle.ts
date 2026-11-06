import { Color3, Mesh, MeshBuilder, Scene, StandardMaterial, TransformNode } from "@babylonjs/core";
import type { RoadVehicleDynamicsState } from "./roadVehicleDynamics";

export type PublicTransportVehicleRig = Readonly<{
  root: TransformNode;
  interiorWindow: TransformNode;
  exteriorFollow: TransformNode;
  update: (state: RoadVehicleDynamicsState) => void;
  dispose: () => void;
}>;

function makeMaterial(scene: Scene, name: string, colour: string, alpha = 1): StandardMaterial {
  const material = new StandardMaterial(name, scene);
  material.diffuseColor = Color3.FromHexString(colour);
  material.alpha = alpha;
  material.backFaceCulling = false;
  return material;
}

/** Compact Ghana-inspired minibus visual for the playable transport slice. */
export function createPublicTransportVehicle(
  scene: Scene,
  id: string,
  origin: Readonly<{ x: number; y: number; z: number }>
): PublicTransportVehicleRig {
  if (!id.trim() || ![origin.x, origin.y, origin.z].every(Number.isFinite)) {
    throw new Error("Invalid public transport vehicle origin.");
  }
  const root = new TransformNode(id, scene);
  root.position.set(origin.x, origin.y, origin.z);
  const body = makeMaterial(scene, id + "-body", "#e8dfc9");
  const lower = makeMaterial(scene, id + "-lower", "#24734f");
  const glass = makeMaterial(scene, id + "-glass", "#24434b", 0.82);
  const tyre = makeMaterial(scene, id + "-tyre", "#17191a");
  const trim = makeMaterial(scene, id + "-trim", "#d8b34c");
  const meshes: Mesh[] = [];
  const addBox = (name: string, w: number, h: number, d: number, x: number, y: number, z: number, mat: StandardMaterial) => {
    const mesh = MeshBuilder.CreateBox(id + "-" + name, { width: w, height: h, depth: d }, scene);
    mesh.position.set(x, y, z);
    mesh.material = mat;
    mesh.parent = root;
    mesh.isPickable = false;
    meshes.push(mesh);
    return mesh;
  };
  addBox("lower-body", 1.95, 1.05, 4.5, 0, 1.0, 0, lower);
  addBox("upper-body", 1.9, 1.05, 3.25, 0, 2.0, -0.25, body);
  addBox("front-windscreen", 1.62, 0.76, 0.07, 0, 2.0, 1.43, glass);
  addBox("rear-window", 1.62, 0.72, 0.07, 0, 2.0, -1.91, glass);
  for (const side of [-1, 1]) {
    for (const z of [-1.2, -0.25, 0.72]) {
      addBox("side-window-" + side + "-" + z, 0.06, 0.68, 0.72, side * 0.97, 2.02, z, glass);
    }
    for (const z of [-1.35, 1.3]) {
      const wheel = MeshBuilder.CreateCylinder(id + "-wheel-" + side + "-" + z, { diameter: 0.72, height: 0.2, tessellation: 16 }, scene);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(side * 0.99, 0.48, z);
      wheel.material = tyre;
      wheel.parent = root;
      wheel.isPickable = false;
      meshes.push(wheel);
    }
  }
  addBox("destination-board", 1.15, 0.3, 0.1, 0, 2.62, 1.68, trim);
  addBox("front-bumper", 1.98, 0.16, 0.12, 0, 0.55, 2.28, trim);
  const interiorWindow = new TransformNode(id + "-passenger-window-anchor", scene);
  interiorWindow.position.set(0, 1.72, 0.55);
  interiorWindow.parent = root;
  const exteriorFollow = new TransformNode(id + "-exterior-follow-anchor", scene);
  exteriorFollow.position.set(0, 4.2, -8.5);
  exteriorFollow.parent = root;

  let disposed = false;
  const update = (state: RoadVehicleDynamicsState) => {
    if (disposed || ![state.x, state.z, state.headingRadians, state.speedMps].every(Number.isFinite)) {
      throw new Error("Invalid public transport vehicle update.");
    }
    root.position.set(state.x, origin.y, state.z);
    root.rotation.y = state.headingRadians;
  };
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    root.dispose(false, false);
    for (const mesh of meshes) if (!mesh.isDisposed()) mesh.dispose(false, false);
    interiorWindow.dispose(false, false);
    exteriorFollow.dispose(false, false);
  };
  return { root, interiorWindow, exteriorFollow, update, dispose };
}

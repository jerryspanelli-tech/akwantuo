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
  const glass = makeMaterial(scene, id + "-glass", "#24434b", 0.28);
  const tyre = makeMaterial(scene, id + "-tyre", "#17191a");
  const trim = makeMaterial(scene, id + "-trim", "#d8b34c");
  const seatFabric = makeMaterial(scene, id + "-seat-fabric", "#263a35");
  const seatTrim = makeMaterial(scene, id + "-seat-trim", "#b89a61");
  const cabinDark = makeMaterial(scene, id + "-cabin-dark", "#171d1c");
  const meshes: Mesh[] = [];
  const wheels: Mesh[] = [];
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
      wheels.push(wheel);
    }
  }
  // Visible cabin fit-out: driver controls, aisle and passenger seating.
  addBox("floor", 1.72, 0.12, 3.65, 0, 0.55, -0.18, cabinDark);
  addBox("dashboard", 1.62, 0.34, 0.42, 0, 1.28, 1.48, cabinDark);
  addBox("dashboard-fascia", 1.35, 0.12, 0.035, 0, 1.37, 1.70, trim);
  addBox("driver-seat-base", 0.62, 0.16, 0.62, -0.48, 0.93, 1.02, seatFabric);
  addBox("driver-seat-back", 0.62, 0.76, 0.18, -0.48, 1.36, 0.78, seatFabric);
  addBox("driver-seat-headrest", 0.42, 0.24, 0.16, -0.48, 1.84, 0.78, seatTrim);
  addBox("passenger-front-seat-base", 0.62, 0.16, 0.62, 0.48, 0.93, 1.02, seatFabric);
  addBox("passenger-front-seat-back", 0.62, 0.76, 0.18, 0.48, 1.36, 0.78, seatFabric);
  for (const rowZ of [-1.15, -0.28, 0.58]) {
    for (const side of [-1, 1]) {
      addBox("passenger-seat-base-" + rowZ + "-" + side, 0.68, 0.15, 0.58, side * 0.48, 0.94, rowZ, seatFabric);
      addBox("passenger-seat-back-" + rowZ + "-" + side, 0.68, 0.62, 0.16, side * 0.48, 1.32, rowZ - 0.2, seatFabric);
      addBox("passenger-seat-headrest-" + rowZ + "-" + side, 0.4, 0.2, 0.14, side * 0.48, 1.73, rowZ - 0.2, seatTrim);
    }
  }
  const steeringWheel = MeshBuilder.CreateTorus(id + "-steering-wheel", { diameter: 0.48, thickness: 0.055, tessellation: 20 }, scene);
  steeringWheel.position.set(-0.48, 1.55, 1.34);
  steeringWheel.rotation.x = Math.PI / 2;
  steeringWheel.material = trim;
  steeringWheel.parent = root;
  steeringWheel.isPickable = false;
  meshes.push(steeringWheel);
  addBox("gear-lever", 0.07, 0.3, 0.07, -0.12, 1.0, 1.18, trim);
  addBox("interior-roof-liner", 1.68, 0.08, 3.2, 0, 2.48, -0.18, cabinDark);
  addBox("left-side-door-panel", 0.08, 0.62, 2.45, -0.9, 1.1, -0.18, cabinDark);
  addBox("right-side-door-panel", 0.08, 0.62, 2.45, 0.9, 1.1, -0.18, cabinDark);
  addBox("destination-board", 1.15, 0.3, 0.1, 0, 2.62, 1.68, trim);
  addBox("front-bumper", 1.98, 0.16, 0.12, 0, 0.55, 2.28, trim);
  const interiorWindow = new TransformNode(id + "-passenger-window-anchor", scene);
  interiorWindow.position.set(0, 1.62, -0.55);
  interiorWindow.parent = root;
  const exteriorFollow = new TransformNode(id + "-exterior-follow-anchor", scene);
  exteriorFollow.position.set(0, 4.2, -8.5);
  exteriorFollow.parent = root;

  let disposed = false;
  let previousWheelPosition = { x: origin.x, z: origin.z };
  const update = (state: RoadVehicleDynamicsState) => {
    if (disposed || ![state.x, state.z, state.headingRadians, state.speedMps].every(Number.isFinite)) {
      throw new Error("Invalid public transport vehicle update.");
    }
    const travelledM = Math.hypot(state.x - previousWheelPosition.x, state.z - previousWheelPosition.z) * Math.sign(state.speedMps || 1);
    for (const wheel of wheels) wheel.rotation.x += travelledM / 0.36;
    previousWheelPosition = { x: state.x, z: state.z };
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

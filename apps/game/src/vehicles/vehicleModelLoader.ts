import "@babylonjs/loaders/glTF";
import { SceneLoader, TransformNode, type Scene } from "@babylonjs/core";

export type LoadedVehicleModel = Readonly<{
  root: TransformNode;
  wheelNodes: readonly TransformNode[];
  setPose: (x: number, y: number, z: number, headingRadians: number) => void;
  animateWheels: (travelledDistanceM: number, steeringRadians?: number) => void;
  dispose: () => void;
}>;

export type VehicleModelLoadOptions = Readonly<{
  scene: Scene;
  assetUrl: string;
  id: string;
  wheelRadiusM?: number;
}>;

/**
 * Loads a real GLB vehicle and exposes its named wheel nodes for driving animation.
 * Vehicle assets are expected to face +Z, use +Y as up, and name wheels Wheel_FL,
 * Wheel_FR, Wheel_RL and Wheel_RR (or equivalent wheel_FL-style names).
 */
export async function loadVehicleModel(
  options: VehicleModelLoadOptions
): Promise<LoadedVehicleModel> {
  if (!options.id.trim() || !options.assetUrl.trim()) {
    throw new Error("Vehicle model id and asset URL are required.");
  }
  const wheelRadiusM = options.wheelRadiusM ?? 0.34;
  if (!Number.isFinite(wheelRadiusM) || wheelRadiusM <= 0) {
    throw new Error("Vehicle wheel radius must be a positive finite number.");
  }

  const imported = await SceneLoader.ImportMeshAsync("", "", options.assetUrl, options.scene);
  const topLevel = imported.transformNodes.filter((node) => node.parent === null);
  const root = topLevel[0] ?? imported.meshes.find((mesh) => mesh.parent === null);
  if (!root) {
    for (const mesh of imported.meshes) mesh.dispose(false, false);
    throw new Error(`Vehicle model "${options.id}" contains no root node.`);
  }

  root.name = options.id;
  for (const node of topLevel) {
    if (node !== root) node.parent = root;
  }

  const wheelPattern = /wheel/i;
  const wheelNodes = root.getChildTransformNodes(true).filter((node) => wheelPattern.test(node.name));
  const frontWheels = wheelNodes.filter((node) => /(?:^|[_-])(fl|fr|front)(?:$|[_-])/i.test(node.name));
  const wheelBaseYaw = new Map(frontWheels.map((wheel) => [wheel, wheel.rotation.y]));
  let disposed = false;

  const setPose = (x: number, y: number, z: number, headingRadians: number): void => {
    if (disposed) throw new Error("Cannot move a disposed vehicle model.");
    if (![x, y, z, headingRadians].every(Number.isFinite)) {
      throw new Error("Vehicle pose contains non-finite values.");
    }
    root.position.set(x, y, z);
    root.rotation.y = headingRadians;
  };

  const animateWheels = (travelledDistanceM: number, steeringRadians = 0): void => {
    if (disposed) throw new Error("Cannot animate a disposed vehicle model.");
    if (![travelledDistanceM, steeringRadians].every(Number.isFinite)) {
      throw new Error("Vehicle wheel animation values must be finite.");
    }
    const spin = travelledDistanceM / wheelRadiusM;
    for (const wheel of wheelNodes) wheel.rotation.x += spin;
    for (const wheel of frontWheels) {
      wheel.rotation.y = (wheelBaseYaw.get(wheel) ?? 0) + steeringRadians;
    }
  };

  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    root.dispose(false, true);
  };

  return { root, wheelNodes, setPose, animateWheels, dispose };
}

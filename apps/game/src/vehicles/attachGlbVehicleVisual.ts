import "@babylonjs/loaders/glTF";
import { SceneLoader, TransformNode, type Scene } from "@babylonjs/core";

export type VehicleVisualDriver = Readonly<{
  update: (speedMps: number, steeringRadians: number, deltaSeconds: number) => void;
}>;

export type VehicleVisualOptions = Readonly<{
  scene: Scene;
  parent: TransformNode;
  assetUrl: string;
  id: string;
  scale?: number;
}>;

/**
 * Replaces procedural fallback meshes only after a remote GLB has loaded.
 * If loading fails, the original vehicle remains visible and drivable.
 */
export async function attachGlbVehicleVisual(options: VehicleVisualOptions): Promise<VehicleVisualDriver> {
  if (!options.id.trim() || !options.assetUrl.startsWith("https://")) {
    throw new Error("Vehicle id and HTTPS GLB asset URL are required.");
  }
  const scale = options.scale ?? 1;
  if (!Number.isFinite(scale) || scale <= 0) throw new Error("Vehicle model scale must be positive.");

  const fallbackMeshes = options.parent.getChildMeshes(false);
  const imported = await SceneLoader.ImportMeshAsync("", "", options.assetUrl, options.scene);
  const wrapper = new TransformNode(options.id + "-glb-root", options.scene);
  wrapper.parent = options.parent;
  wrapper.scaling.setAll(scale);

  const topLevelNodes = [...imported.transformNodes, ...imported.meshes]
    .filter((node) => node.parent === null);
  for (const node of topLevelNodes) node.parent = wrapper;

  const wheelRoll = imported.animationGroups.filter((group) => /wheel[-_ ]?roll/i.test(group.name));
  const wheelNodes = wrapper.getChildTransformNodes(true).filter((node) =>
    /^wheel-(front|rear)-(left|right)(?:$|\/)/i.test(node.name)
  );
  const frontWheels = wheelNodes.filter((node) => /wheel-front-/i.test(node.name));
  const baseSteering = new Map(frontWheels.map((wheel) => [wheel, wheel.rotation.y]));

  for (const mesh of fallbackMeshes) mesh.setEnabled(false);

  let disposed = false;
  let animationRunning = false;
  const update = (speedMps: number, steeringRadians: number, deltaSeconds: number): void => {
    if (disposed || ![speedMps, steeringRadians, deltaSeconds].every(Number.isFinite)) return;
    const speed = Math.abs(speedMps);
    if (wheelRoll.length > 0) {
      if (speed > 0.12) {
        if (!animationRunning) {
          for (const group of wheelRoll) group.start(true);
          animationRunning = true;
        }
        for (const group of wheelRoll) group.speedRatio = Math.min(2.5, speed / 4);
      } else if (animationRunning) {
        for (const group of wheelRoll) group.pause();
        animationRunning = false;
      }
    } else {
      const spin = speedMps * deltaSeconds / 0.34;
      for (const wheel of wheelNodes) wheel.rotation.x += spin;
    }
    for (const wheel of frontWheels) {
      wheel.rotation.y = (baseSteering.get(wheel) ?? 0) + steeringRadians;
    }
  };

  return { update };
}

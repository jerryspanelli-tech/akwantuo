import {
  Color3,
  HemisphericLight,
  Scene,
  Vector3,
  DirectionalLight,
  Mesh,
  ShadowGenerator,
  TransformNode
} from "@babylonjs/core";

export type AkwantuoLightingReport = Readonly<{
  ambientLightName: string;
  sunLightName: string;
  ambientIntensity: number;
  sunIntensity: number;
}>;

/**
 * Establishes a readable Ghanaian daylight setup for the entire playable
 * world. The scene previously relied on material colours without creating
 * any lights, which made StandardMaterial surfaces look flat and unlit.
 */
export function createAkwantuoDaylight(scene: Scene): AkwantuoLightingReport {
  const ambient = new HemisphericLight(
    "akwantuo-daylight-ambient",
    new Vector3(-0.22, 1, 0.18),
    scene
  );
  ambient.intensity = 0.62;
  ambient.diffuse = new Color3(0.94, 0.92, 0.86);
  ambient.groundColor = new Color3(0.31, 0.34, 0.29);
  ambient.specular = new Color3(0.16, 0.16, 0.14);

  const sun = new DirectionalLight(
    "akwantuo-daylight-sun",
    new Vector3(-0.42, -1, 0.28),
    scene
  );
  sun.position = new Vector3(180, 260, -120);
  sun.intensity = 1.15;
  sun.diffuse = new Color3(1, 0.94, 0.82);
  sun.specular = new Color3(0.42, 0.4, 0.35);

  scene.ambientColor = new Color3(0.1, 0.11, 0.1);
  scene.imageProcessingConfiguration.toneMappingEnabled = true;
  scene.imageProcessingConfiguration.exposure = 1.02;
  scene.imageProcessingConfiguration.contrast = 1.16;

  return {
    ambientLightName: ambient.name,
    sunLightName: sun.name,
    ambientIntensity: ambient.intensity,
    sunIntensity: sun.intensity
  };
}


const akwantuoShadowGenerators = new WeakMap<Scene, ShadowGenerator>();
const akwantuoShadowCasters = new WeakMap<Scene, WeakSet<Mesh>>();

/**
 * Adds a focused, mobile-safe shadow map for the player and nearby pedestrians.
 * The map is deliberately small on touch devices to avoid excessive GPU memory.
 */
export function registerAkwantuoShadowCaster(scene: Scene, root: TransformNode): void {
  const sun = scene.getLightByName("akwantuo-daylight-sun");
  if (!(sun instanceof DirectionalLight)) return;

  let generator = akwantuoShadowGenerators.get(scene);
  if (!generator) {
    const mobile = typeof window !== "undefined" && (
      window.matchMedia("(pointer: coarse)").matches ||
      Math.min(window.innerWidth, window.innerHeight) <= 820
    );
    generator = new ShadowGenerator(mobile ? 512 : 1024, sun);
    generator.usePercentageCloserFiltering = true;
    generator.filteringQuality = ShadowGenerator.QUALITY_LOW;
    generator.bias = 0.0005;
    generator.normalBias = 0.02;
    generator.darkness = 0.28;
    scene.shadowsEnabled = true;
    akwantuoShadowGenerators.set(scene, generator);
    akwantuoShadowCasters.set(scene, new WeakSet<Mesh>());
  }

  const registered = akwantuoShadowCasters.get(scene);
  if (!registered) return;
  for (const mesh of root.getChildMeshes(false)) {
    if (mesh.isDisposed() || registered.has(mesh)) continue;
    generator.addShadowCaster(mesh, false);
    registered.add(mesh);
  }
}

/** Marks a ground or road mesh as a receiver for the focused character shadows. */
export function enableAkwantuoShadowReceiver(mesh: Mesh): void {
  mesh.receiveShadows = true;
}

import {
  Color3,
  HemisphericLight,
  Scene,
  Vector3,
  DirectionalLight
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
  ambient.intensity = 0.82;
  ambient.diffuse = new Color3(0.94, 0.92, 0.86);
  ambient.groundColor = new Color3(0.31, 0.34, 0.29);
  ambient.specular = new Color3(0.16, 0.16, 0.14);

  const sun = new DirectionalLight(
    "akwantuo-daylight-sun",
    new Vector3(-0.42, -1, 0.28),
    scene
  );
  sun.position = new Vector3(180, 260, -120);
  sun.intensity = 1.35;
  sun.diffuse = new Color3(1, 0.94, 0.82);
  sun.specular = new Color3(0.42, 0.4, 0.35);

  scene.ambientColor = new Color3(0.22, 0.23, 0.21);
  scene.imageProcessingConfiguration.toneMappingEnabled = true;
  scene.imageProcessingConfiguration.exposure = 1.08;
  scene.imageProcessingConfiguration.contrast = 1.12;

  return {
    ambientLightName: ambient.name,
    sunLightName: sun.name,
    ambientIntensity: ambient.intensity,
    sunIntensity: sun.intensity
  };
}

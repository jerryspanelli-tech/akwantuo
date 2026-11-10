import {
  Color3,
  Color4,
  HemisphericLight,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3
} from "@babylonjs/core";
import { WORLD_CONFIG } from "./config";
import type { SolidArea } from "./collision";
import { createGhanaianStreetBuildings } from "./ghanaianStreetBuildings";

/**
 * Shared lighting and district building population for the playable world.
 *
 * The former centre-road, skyline and single-landmark scene was a temporary
 * prototype. It is deliberately not created here: Greater Accra transport,
 * coastline and district geography are owned by createGreaterAccraPlayableWorld.
 */
export function createPreviewWorld(scene: Scene, options: { includeGround?: boolean; includeBuildings?: boolean } = {}): SolidArea[] {
  const light = new HemisphericLight("sunlight", new Vector3(
    WORLD_CONFIG.environment.sunlightDirection.x,
    WORLD_CONFIG.environment.sunlightDirection.y,
    WORLD_CONFIG.environment.sunlightDirection.z
  ), scene);
  light.intensity = WORLD_CONFIG.environment.sunlightIntensity;

  if (options.includeGround !== false) {
    scene.clearColor = new Color4(...WORLD_CONFIG.environment.clearColor);
    const groundMaterial = new StandardMaterial("warm-earth", scene);
    groundMaterial.diffuseColor = new Color3(0.43, 0.39, 0.29);
    const ground = MeshBuilder.CreateGround("terrain", {
      width: WORLD_CONFIG.ground.width,
      height: WORLD_CONFIG.ground.depth,
      subdivisions: 2
    }, scene);
    ground.material = groundMaterial;
  }

  // District buildings are placed against Greater Accra's real game-layout
  // anchors. Keep their collision data for building entry and walking.
  if (options.includeBuildings === false) return [];
  const buildingDistrict = createGhanaianStreetBuildings(scene);
  return [...buildingDistrict.solidAreas];
}

import {
  Color3,
  Color4,
  MeshBuilder,
  Scene,
  StandardMaterial
} from "@babylonjs/core";
import { WORLD_CONFIG } from "./config";
import type { SolidArea } from "./collision";
import { createGhanaianStreetBuildings } from "./ghanaianStreetBuildings";

/**
 * Optional ground and district building population for the playable world.
 *
 * The former centre-road, skyline and single-landmark scene was a temporary
 * prototype. It is deliberately not created here: Greater Accra transport,
 * coastline and district geography are owned by createGreaterAccraPlayableWorld.
 */
export function createPreviewWorld(scene: Scene, options: { includeGround?: boolean; includeBuildings?: boolean } = {}): SolidArea[] {
  // Main-scene daylight is created once by createAkwantuoDaylight().
  // Do not add a second ambient/sun pair here: duplicate lights flatten
  // material contrast and make the environment look washed out.
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

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

/**
 * Temporary Ghana-inspired street scene used while the production map is
 * being designed. Keep preview geometry separate from the game runtime.
 */
export function createPreviewWorld(scene: Scene): SolidArea[] {
  const solidAreas: SolidArea[] = [];
  scene.clearColor = new Color4(...WORLD_CONFIG.environment.clearColor);

  const light = new HemisphericLight("sunlight", new Vector3(
    WORLD_CONFIG.environment.sunlightDirection.x,
    WORLD_CONFIG.environment.sunlightDirection.y,
    WORLD_CONFIG.environment.sunlightDirection.z
  ), scene);
  light.intensity = WORLD_CONFIG.environment.sunlightIntensity;

  const groundMaterial = new StandardMaterial("warm-earth", scene);
  groundMaterial.diffuseColor = new Color3(0.43, 0.39, 0.29);
  const ground = MeshBuilder.CreateGround("terrain", { width: WORLD_CONFIG.ground.width, height: WORLD_CONFIG.ground.depth, subdivisions: 2 }, scene);
  ground.material = groundMaterial;

  const roadMaterial = new StandardMaterial("road-surface", scene);
  roadMaterial.diffuseColor = new Color3(0.12, 0.14, 0.14);
  const road = MeshBuilder.CreateGround("preview-road", { width: WORLD_CONFIG.road.width, height: WORLD_CONFIG.road.length }, scene);
  road.position.y = 0.025;
  road.material = roadMaterial;

  const buildingPalette = [
    new Color3(0.72, 0.56, 0.39),
    new Color3(0.77, 0.72, 0.59),
    new Color3(0.48, 0.57, 0.53),
    new Color3(0.68, 0.43, 0.31)
  ];

  for (let i = 0; i < 22; i += 1) {
    const side = i % 2 === 0 ? -1 : 1;
    const depth = -72 + Math.floor(i / 2) * 13;
    const width = 7 + (i % 3) * 2;
    const buildingDepth = 8 + (i % 2) * 3;
    const height = 5 + ((i * 7) % 13);
    const material = new StandardMaterial(`building-material-${i}`, scene);
    material.diffuseColor = buildingPalette[i % buildingPalette.length];
    const building = MeshBuilder.CreateBox(`street-building-${i}`, {
      width, height, depth: buildingDepth
    }, scene);
    building.position.set(side * (15 + (i % 3) * 5), height / 2, depth);
    building.material = material;
    solidAreas.push({
      x: building.position.x,
      z: building.position.z,
      halfWidth: width / 2,
      halfDepth: buildingDepth / 2
    });
  }

  const skylineMaterial = new StandardMaterial("distant-skyline", scene);
  skylineMaterial.diffuseColor = new Color3(0.37, 0.46, 0.44);
  for (let i = 0; i < 14; i += 1) {
    const towerHeight = 12 + ((i * 11) % 22);
    const tower = MeshBuilder.CreateBox(`distant-building-${i}`, {
      width: 8, height: towerHeight, depth: 8
    }, scene);
    tower.position.set(-85 + i * 13, towerHeight / 2, -92);
    tower.material = skylineMaterial;
  }

  const centre = MeshBuilder.CreateBox("city-landmark", { width: 12, height: 29, depth: 12 }, scene);
  centre.position.set(0, 14.5, -62);
  const landmarkMaterial = new StandardMaterial("landmark-material", scene);
  landmarkMaterial.diffuseColor = new Color3(0.78, 0.67, 0.48);
  centre.material = landmarkMaterial;
  solidAreas.push({ x: 0, z: -62, halfWidth: 6, halfDepth: 6 });

  return solidAreas;
}

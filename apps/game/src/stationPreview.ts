import {
  ArcRotateCamera,
  Color3,
  Color4,
  DirectionalLight,
  Engine,
  HemisphericLight,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3
} from "@babylonjs/core";
import "./../station-preview.css";
import { createUltraModernRailStationGeometry } from "./world/railStationGeometry";

const canvas = document.querySelector<HTMLCanvasElement>("#station-preview-canvas");
const errorPanel = document.querySelector<HTMLElement>("#station-preview-error");

if (!canvas) throw new Error("Station preview canvas was not found.");

try {
  const engine = new Engine(canvas, true, { preserveDrawingBuffer: false, stencil: true }, true);
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.58, 0.69, 0.75, 1);

  const target = new Vector3(0, 5, 0);
  const camera = new ArcRotateCamera(
    "station-preview-camera",
    -Math.PI / 2.45,
    1.02,
    265,
    target,
    scene
  );
  camera.lowerRadiusLimit = 65;
  camera.upperRadiusLimit = 520;
  camera.lowerBetaLimit = 0.16;
  camera.upperBetaLimit = 1.48;
  camera.wheelPrecision = 35;
  camera.panningSensibility = 75;
  camera.attachControl(canvas, true);
  scene.activeCamera = camera;

  const sky = new HemisphericLight("station-preview-sky", new Vector3(0, 1, 0), scene);
  sky.intensity = 0.95;
  const sun = new DirectionalLight("station-preview-sun", new Vector3(-0.5, -1, 0.35), scene);
  sun.position = new Vector3(120, 180, -100);
  sun.intensity = 1.2;

  const ground = MeshBuilder.CreateGround(
    "station-preview-ground",
    { width: 420, height: 320, subdivisions: 2 },
    scene
  );
  const groundMaterial = new StandardMaterial("station-preview-ground-material", scene);
  groundMaterial.diffuseColor = new Color3(0.34, 0.4, 0.36);
  groundMaterial.specularColor = new Color3(0.03, 0.03, 0.03);
  ground.material = groundMaterial;
  ground.isPickable = false;

  createUltraModernRailStationGeometry(scene, {
    id: "akwantuo-ultra-modern-station-concept",
    centerX: 0,
    centerZ: 0,
    groundElevationM: 0,
    concourseWidthM: 34,
    concourseLengthM: 76,
    concourseHeightM: 12,
    platformLengthM: 180,
    platformWidthM: 8,
    platformCount: 2
  });

  engine.setHardwareScalingLevel(Math.max(1, window.devicePixelRatio / 1.5));
  engine.runRenderLoop(() => scene.render());
  window.addEventListener("resize", () => engine.resize());
} catch (error) {
  if (errorPanel) {
    errorPanel.hidden = false;
    errorPanel.textContent = error instanceof Error
      ? `Station preview could not start: ${error.message}`
      : "Station preview could not start.";
  }
  console.error(error);
}

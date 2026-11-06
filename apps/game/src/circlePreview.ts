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
import "./circle-preview.css";
import { createCircleInterchangeGeometry } from "./world/circleInterchangeGeometry";

const canvas = document.querySelector<HTMLCanvasElement>("#preview-canvas");
const errorPanel = document.querySelector<HTMLElement>("#preview-error");

if (!canvas) throw new Error("Circle preview canvas was not found.");

try {
  const engine = new Engine(
    canvas,
    true,
    { preserveDrawingBuffer: false, stencil: true },
    true
  );
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.58, 0.68, 0.72, 1);

  const target = new Vector3(-450, 0, 450);
  const camera = new ArcRotateCamera(
    "circle-preview-camera",
    -Math.PI / 2.35,
    0.92,
    1120,
    target,
    scene
  );
  camera.lowerRadiusLimit = 260;
  camera.upperRadiusLimit = 2100;
  camera.lowerBetaLimit = 0.18;
  camera.upperBetaLimit = 1.42;
  camera.wheelPrecision = 35;
  camera.panningSensibility = 65;
  camera.attachControl(canvas, true);
  scene.activeCamera = camera;

  const skyLight = new HemisphericLight("circle-preview-sky", new Vector3(0, 1, 0), scene);
  skyLight.intensity = 0.88;
  const sun = new DirectionalLight("circle-preview-sun", new Vector3(-0.45, -1, 0.3), scene);
  sun.position = new Vector3(400, 650, -250);
  sun.intensity = 1.25;

  const ground = MeshBuilder.CreateGround(
    "circle-preview-terrain",
    { width: 1500, height: 1500, subdivisions: 2 },
    scene
  );
  ground.position.copyFrom(target);
  const groundMaterial = new StandardMaterial("circle-preview-terrain-material", scene);
  groundMaterial.diffuseColor = new Color3(0.34, 0.39, 0.32);
  groundMaterial.specularColor = new Color3(0.04, 0.04, 0.04);
  ground.material = groundMaterial;
  ground.isPickable = false;

  createCircleInterchangeGeometry(scene);

  engine.setHardwareScalingLevel(Math.max(1, window.devicePixelRatio / 1.5));
  engine.runRenderLoop(() => scene.render());
  window.addEventListener("resize", () => engine.resize());
} catch (error) {
  if (errorPanel) {
    errorPanel.hidden = false;
    errorPanel.textContent = error instanceof Error
      ? `Circle preview could not start: ${error.message}`
      : "Circle preview could not start.";
  }
  console.error(error);
}

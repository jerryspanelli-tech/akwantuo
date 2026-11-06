import {
  ArcRotateCamera, Color3, Color4, DirectionalLight, Engine,
  HemisphericLight, MeshBuilder, Scene, StandardMaterial, Vector3
} from "@babylonjs/core";
import "./../station-preview.css";
import { createUltraModernRailStationGeometry } from "./world/railStationGeometry";
import { createStationPassengerFitout } from "./world/railStationFitout";
import { createStationInterchangeGeometry } from "./world/stationInterchangeGeometry";
import { createStationPlatformAccessGeometry } from "./world/railStationAccessGeometry";

const canvas = document.querySelector<HTMLCanvasElement>("#station-preview-canvas");
const errorPanel = document.querySelector<HTMLElement>("#station-preview-error");
if (!canvas) throw new Error("Transport preview canvas was not found.");

try {
  const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true }, true);
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.58, 0.69, 0.75, 1);
  const camera = new ArcRotateCamera("transport-preview-camera", -Math.PI / 2.5, 1.05, 300, new Vector3(0, 4, -34), scene);
  camera.lowerRadiusLimit = 70;
  camera.upperRadiusLimit = 520;
  camera.lowerBetaLimit = 0.16;
  camera.upperBetaLimit = 1.48;
  camera.wheelPrecision = 35;
  camera.panningSensibility = 75;
  camera.attachControl(canvas, true);
  scene.activeCamera = camera;
  const sky = new HemisphericLight("transport-preview-sky", new Vector3(0, 1, 0), scene);
  sky.intensity = 0.95;
  const sun = new DirectionalLight("transport-preview-sun", new Vector3(-0.5, -1, 0.35), scene);
  sun.position = new Vector3(120, 180, -100);
  sun.intensity = 1.2;
  const ground = MeshBuilder.CreateGround("transport-preview-ground", { width: 460, height: 380 }, scene);
  const groundMat = new StandardMaterial("transport-preview-ground-material", scene);
  groundMat.diffuseColor = new Color3(0.34, 0.4, 0.36);
  groundMat.specularColor = new Color3(0.03, 0.03, 0.03);
  ground.material = groundMat;
  ground.isPickable = false;

  const stationOptions = {
    id: "akwantuo-transport-hub-station",
    centerX: 0, centerZ: 50, groundElevationM: 0,
    concourseWidthM: 34, concourseLengthM: 76, concourseHeightM: 12,
    platformLengthM: 180, platformWidthM: 8, platformCount: 2
  } as const;
  createUltraModernRailStationGeometry(scene, stationOptions);
  createStationPassengerFitout(scene, stationOptions);
  createStationPlatformAccessGeometry(scene, {
    stationId: "akwantuo-transport-hub-station",
    connections: [{
      id: "sheltered-forecourt-walkway",
      mode: "sheltered_walkway",
      from: { x: 0, y: 0, z: 23 },
      to: { x: 0, y: 0, z: -49 },
      widthM: 6
    }]
  });

  createStationInterchangeGeometry(scene, {
    centerX: 0, centerZ: -85,
    roadWidthM: 116, roadLengthM: 92,
    pedestrianIslandWidthM: 13, pedestrianIslandLengthM: 70,
    bays: [
      { id: "trotro", kind: "trotro", centerX: -39, centerZ: -78, widthM: 12, lengthM: 18, operation: "both" },
      { id: "city-bus", kind: "city_bus", centerX: -17, centerZ: -78, widthM: 14, lengthM: 22, operation: "both" },
      { id: "taxi", kind: "taxi", centerX: 20, centerZ: -78, widthM: 11, lengthM: 16, operation: "both" },
      { id: "ride-hailing", kind: "ride_hailing", centerX: 39, centerZ: -78, widthM: 11, lengthM: 16, operation: "both" }
    ]
  });

  engine.setHardwareScalingLevel(Math.max(1, window.devicePixelRatio / 1.5));
  engine.resize();
  engine.runRenderLoop(() => scene.render());
  window.addEventListener("resize", () => engine.resize());
} catch (error) {
  if (errorPanel) {
    errorPanel.hidden = false;
    errorPanel.textContent = error instanceof Error ? `Transport preview could not start: ${error.message}` : "Transport preview could not start.";
  }
  console.error(error);
}

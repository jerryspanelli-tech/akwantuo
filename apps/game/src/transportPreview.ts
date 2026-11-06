import {
  ArcRotateCamera, Color3, Color4, DirectionalLight, Engine,
  HemisphericLight, MeshBuilder, Scene, StandardMaterial, Vector3
} from "@babylonjs/core";
import "./../station-preview.css";
import { createUltraModernRailStationGeometry } from "./world/railStationGeometry";
import { createStationPassengerFitout } from "./world/railStationFitout";
import { createStationInterchangeGeometry } from "./world/stationInterchangeGeometry";
import { createStationPlatformAccessGeometry } from "./world/railStationAccessGeometry";
import { createRailTrainGeometry } from "./world/railTrainGeometry";
import { createRailTrainRig } from "./world/railTrainRig";
import { advanceRailTrain, createRailTrainOperationState, isRailTrainOperationStateValid } from "./world/railTrainOperations";
import { createRailServiceConfig } from "./world/railService";
import { advanceRoadVehicleDynamics, type RoadVehicleDynamicsState } from "./vehicles/roadVehicleDynamics";
import { createRoadVehicleGeometry } from "./vehicles/roadVehicleGeometry";
import { createRoadVehicleRig } from "./vehicles/roadVehicleRig";

const canvas = document.querySelector<HTMLCanvasElement>("#station-preview-canvas");
const errorPanel = document.querySelector<HTMLElement>("#station-preview-error");
if (!canvas) throw new Error("Transport preview canvas was not found.");

try {
  // Preview-start smoke checks keep candidate-only Circle/Odaw out of live
  // service stops and reject impossible train states before rendering.
  const temaService = createRailServiceConfig("achimota-to-tema");
  const accraService = createRailServiceConfig("accra-odaw-achimota");
  if (temaService.stops.length !== 1 || temaService.stops[0]?.id !== "tema-rail-station" ||
      accraService.stops.some((stop) => stop.id === "odaw-rail-stop")) {
    throw new Error("Rail service station-status validation failed.");
  }
  const initialRailState = createRailTrainOperationState();
  if (!isRailTrainOperationStateValid(temaService, initialRailState) ||
      isRailTrainOperationStateValid(temaService, { ...initialRailState, distanceM: -1 })) {
    throw new Error("Rail operation state validation failed.");
  }

  const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true }, true);
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.58, 0.69, 0.75, 1);
  const camera = new ArcRotateCamera("transport-preview-camera", -Math.PI / 2.5, 1.05, 225, new Vector3(0, 3, -18), scene);
  camera.radius = 190;
  camera.lowerRadiusLimit = 55;
  camera.upperRadiusLimit = 420;
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
  const roadVehicleOrigin = { x: -24, y: 0, z: -120 };
  const roadVehicleGeometry = createRoadVehicleGeometry(scene, {
    id: "akwantuo-preview-saloon",
    centerX: roadVehicleOrigin.x,
    centerZ: roadVehicleOrigin.z,
    groundElevationM: roadVehicleOrigin.y,
    bodyColour: "#315a78"
  });
  const roadVehicleRig = createRoadVehicleRig(scene, roadVehicleGeometry, {
    id: "akwantuo-preview-saloon-rig", origin: roadVehicleOrigin
  });
  const roadVehicleConfig = {
    wheelbaseM: 2.65,
    maximumForwardSpeedMps: 18,
    maximumReverseSpeedMps: 5,
    maximumAccelerationMps2: 2.8,
    serviceBrakingMps2: 7,
    maximumSteeringAngleRadians: 0.55,
    rollingDragMps2: 0.35
  } as const;
  let roadVehicleState: RoadVehicleDynamicsState = {
    x: roadVehicleOrigin.x, z: roadVehicleOrigin.z, headingRadians: 0, speedMps: 0
  };
  const driveKeys = new Set<string>();
  const driveKeyDown = (event: KeyboardEvent): void => {
    const key = event.key.toLowerCase();
    if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) {
      driveKeys.add(key);
      event.preventDefault();
    }
  };
  const driveKeyUp = (event: KeyboardEvent): void => {
    driveKeys.delete(event.key.toLowerCase());
  };
  window.addEventListener("keydown", driveKeyDown);
  window.addEventListener("keyup", driveKeyUp);
  window.addEventListener("blur", () => driveKeys.clear());
  const trainGeometry = createRailTrainGeometry(scene, {
    id: "akwantuo-commuter-train", centerX: -35, centerZ: 24,
    groundElevationM: 0, carCount: 2
  });
  const trainRig = createRailTrainRig(scene, trainGeometry, {
    id: "akwantuo-commuter-train-rig",
    origin: { x: -35, y: 0, z: 24 }
  });
  // A short, clearly preview-only shuttle demonstrates the train rig and
  // deterministic stop controller without pretending to be a mapped service.
  const shuttleConfig = {
    path: [{ x: -35, z: 24 }, { x: 85, z: 24 }],
    stops: [{ id: "preview-platform-stop", distanceM: 120, dwellSeconds: 8 }],
    maximumSpeedMps: 8,
    accelerationMps2: 0.7,
    serviceBrakingMps2: 1.1
  } as const;
  let trainState = createRailTrainOperationState();
  let previousFrameTime = performance.now();
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
  engine.runRenderLoop(() => {
    const now = performance.now();
    const deltaSeconds = Math.min(1, Math.max(0, (now - previousFrameTime) / 1000));
    previousFrameTime = now;
    const frame = advanceRailTrain(shuttleConfig, trainState, deltaSeconds);
    trainState = frame.state;
    trainRig.update(frame);
    const driveDelta = Math.min(0.1, deltaSeconds);
    const forward = driveKeys.has("w") || driveKeys.has("arrowup");
    const reverse = driveKeys.has("s") || driveKeys.has("arrowdown");
    const left = driveKeys.has("a") || driveKeys.has("arrowleft");
    const right = driveKeys.has("d") || driveKeys.has("arrowright");
    roadVehicleState = advanceRoadVehicleDynamics(roadVehicleConfig, roadVehicleState, {
      throttle: forward === reverse ? 0 : forward ? 1 : -1,
      brake: driveKeys.has(" ") ? 1 : 0,
      steering: left === right ? 0 : left ? -1 : 1
    }, driveDelta);
    roadVehicleRig.update(roadVehicleState);
    scene.render();
  });
  window.addEventListener("resize", () => engine.resize());
} catch (error) {
  if (errorPanel) {
    errorPanel.hidden = false;
    errorPanel.textContent = error instanceof Error ? `Transport preview could not start: ${error.message}` : "Transport preview could not start.";
  }
  console.error(error);
}

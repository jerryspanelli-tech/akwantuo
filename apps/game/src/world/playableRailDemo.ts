import { Color3, Mesh, MeshBuilder, Scene, StandardMaterial, TransformNode, Vector3 } from "@babylonjs/core";
import { createRailTrainGeometry } from "./railTrainGeometry";
import { createRailTrainRig } from "./railTrainRig";
import { advanceRailTrain, createRailTrainOperationState, type RailTrainOperationConfig, type RailTrainOperationState } from "./railTrainOperations";
import { createUltraModernRailStationGeometry } from "./railStationGeometry";

export type PlayableRailDemo = Readonly<{
  interiorWindow: TransformNode;
  exteriorFollow: TransformNode;
  update: (deltaSeconds: number) => void;
  startService: () => void;
  getStatus: () => Readonly<{ boardingOpen: boolean; completed: boolean; position: Readonly<{ x: number; z: number }> }>;
  dispose: () => void;
}>;

const ROUTE = {
  x: -41,
  startZ: -20,
  stationZ: -20,
  endZ: -60
} as const;

/**
 * A compact, local-only railway slice inside the 180m playable test district.
 * It demonstrates an actual track, station, moving train and station dwell;
 * it is not the surveyed Greater Accra rail alignment or an operational service.
 */
export function createPlayableRailDemo(scene: Scene): PlayableRailDemo {
  const ballastMaterial = new StandardMaterial("playable-rail-ballast-material", scene);
  ballastMaterial.diffuseColor = new Color3(0.28, 0.27, 0.25);
  const railMaterial = new StandardMaterial("playable-rail-steel-material", scene);
  railMaterial.diffuseColor = new Color3(0.48, 0.51, 0.53);
  const sleeperMaterial = new StandardMaterial("playable-rail-sleeper-material", scene);
  sleeperMaterial.diffuseColor = new Color3(0.22, 0.19, 0.15);

  const ballast = MeshBuilder.CreateGround("playable-rail-ballast", {
    width: 3.2, height: ROUTE.startZ - ROUTE.endZ + 60
  }, scene);
  ballast.position.set(ROUTE.x, 0.06, (ROUTE.startZ + ROUTE.endZ) / 2);
  ballast.material = ballastMaterial;
  ballast.isPickable = false;

  const railMeshes: Mesh[] = [];
  for (const offset of [-0.5335, 0.5335]) {
    const rail = MeshBuilder.CreateTube("playable-rail-" + offset, {
      path: [
        new Vector3(ROUTE.x + offset, 0.2, ROUTE.endZ - 30),
        new Vector3(ROUTE.x + offset, 0.2, ROUTE.startZ + 30)
      ],
      radius: 0.075,
      tessellation: 8
    }, scene);
    rail.material = railMaterial;
    rail.isPickable = false;
    railMeshes.push(rail);
  }

  const sleeperMeshes: Mesh[] = [];
  const sleeperCount = Math.floor((ROUTE.startZ - ROUTE.endZ + 60) / 0.72) + 1;
  for (let index = 0; index < sleeperCount; index += 1) {
    const tie = MeshBuilder.CreateBox("playable-rail-sleeper-" + index, {
      width: 2.35, height: 0.18, depth: 0.24
    }, scene);
    tie.position.set(ROUTE.x, 0.14, ROUTE.endZ - 30 + index * 0.72);
    tie.material = sleeperMaterial;
    tie.isPickable = false;
    sleeperMeshes.push(tie);
  }

  const stationGeometry = createUltraModernRailStationGeometry(scene, {
    id: "playable-ultra-modern-rail-station",
    centerX: -60,
    centerZ: ROUTE.stationZ,
    groundElevationM: 0,
    concourseWidthM: 20,
    concourseLengthM: 30,
    concourseHeightM: 8,
    platformLengthM: 65,
    platformWidthM: 6,
    platformCount: 2
  });
  const stationRoot = new TransformNode("playable-rail-station-root", scene);
  stationRoot.position.set(-60, 0, ROUTE.stationZ);
  stationRoot.rotation.y = Math.PI / 2;
  for (const mesh of stationGeometry.allMeshes) {
    mesh.position.subtractInPlace(stationRoot.position);
    mesh.parent = stationRoot;
  }

  const trainGeometry = createRailTrainGeometry(scene, {
    id: "playable-commuter-train",
    centerX: ROUTE.x,
    centerZ: ROUTE.startZ,
    groundElevationM: 0,
    carCount: 2
  });
  const trainRig = createRailTrainRig(scene, trainGeometry, {
    id: "playable-commuter-train-rig",
    origin: { x: ROUTE.x, y: 0, z: ROUTE.startZ }
  });
  const interiorWindow = new TransformNode("playable-train-passenger-window", scene);
  interiorWindow.position.set(0, 1.8, 1.2);
  interiorWindow.parent = trainRig.root;
  const exteriorFollow = new TransformNode("playable-train-exterior-follow", scene);
  exteriorFollow.position.set(0, 4.5, -14);
  exteriorFollow.parent = trainRig.root;

  const config: RailTrainOperationConfig = {
    path: [{ x: ROUTE.x, z: ROUTE.startZ }, { x: ROUTE.x, z: ROUTE.endZ }],
    stops: [],
    maximumSpeedMps: 8,
    accelerationMps2: 1.2,
    serviceBrakingMps2: 1.6
  };
  let state: RailTrainOperationState = createRailTrainOperationState();
  let serviceStarted = false;
  let currentPosition: { x: number; z: number } = { x: ROUTE.x, z: ROUTE.startZ };
  let disposed = false;
  const update = (deltaSeconds: number) => {
    if (disposed || !serviceStarted) return;
    const frame = advanceRailTrain(config, state, Math.min(1, Math.max(0, deltaSeconds)));
    state = frame.state;
    currentPosition = frame.position;
    trainRig.update(frame);
  };
  const startService = () => {
    if (!disposed && !serviceStarted) serviceStarted = true;
  };
  const getStatus = () => ({
    boardingOpen: !serviceStarted,
    completed: state.completed,
    position: currentPosition
  });
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    trainRig.dispose();
    interiorWindow.dispose(false, false);
    exteriorFollow.dispose(false, false);
    stationRoot.dispose(false, false);
    for (const mesh of stationGeometry.allMeshes) if (!mesh.isDisposed()) mesh.dispose(false, false);
    ballast.dispose();
    for (const mesh of railMeshes) mesh.dispose();
    for (const tie of sleeperMeshes) tie.dispose();
    ballastMaterial.dispose();
    railMaterial.dispose();
    sleeperMaterial.dispose();
  };
  return { interiorWindow, exteriorFollow, update, startService, getStatus, dispose };
}

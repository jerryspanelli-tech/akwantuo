import { TransformNode, type Scene } from "@babylonjs/core";
import { createRailTrainGeometry } from "./railTrainGeometry";
import { createRailTrainRig } from "./railTrainRig";
import { createRailServiceConfigForRouteChain } from "./railService";
import {
  advanceRailTrain,
  createRailTrainOperationState,
  type RailTrainOperationFrame,
  type RailTrainOperationState
} from "./railTrainOperations";

export type MappedRailService = Readonly<{
  update: (elapsedSeconds: number) => RailTrainOperationFrame;
  getState: () => RailTrainOperationState;
  interiorWindow: TransformNode;
  exteriorFollow: TransformNode;
  isBoardingOpen: () => boolean;
  startService: () => void;
  dispose: () => void;
}>;

/**
 * Creates one moving two-car service on the schematic Accra Central–Odaw–
 * Achimota–Tema first-release rail chain. Odaw remains a pass-through corridor
 * reference, not an operational station; Tema is the planned terminal stop.
 * This visual service has no signals,
 * dispatch, block occupancy, train-to-train collision or server authority.
 */
export function createGreaterAccraMappedRailService(scene: Scene): MappedRailService {
  const config = createRailServiceConfigForRouteChain(["accra-odaw-achimota", "achimota-to-tema"]);
  if (config.stops.length !== 1 || config.stops[0].id !== "tema-rail-station") {
    throw new Error("Accra–Tema prototype service must stop only at the planned Tema terminal.");
  }

  const geometry = createRailTrainGeometry(scene, {
    id: "greater-accra-mapped-rail-train",
    centerX: 0,
    centerZ: 0,
    groundElevationM: 0,
    carCount: 2
  });
  const rig = createRailTrainRig(scene, geometry, {
    id: "greater-accra-mapped-rail-train-rig",
    origin: { x: 0, y: 0.08, z: 0 }
  });

  let state = createRailTrainOperationState();
  let frame = advanceRailTrain(config, state, 0);
  rig.update(frame, 0.08);
  let disposed = false;
  let serviceStarted = false;
  const interiorWindow = new TransformNode("greater-accra-mapped-rail-interior-window", scene);
  interiorWindow.position.set(0, 2.5, 1.55);
  interiorWindow.parent = rig.root;
  const exteriorFollow = new TransformNode("greater-accra-mapped-rail-exterior-follow", scene);
  exteriorFollow.position.set(-2, 4.8, -12);
  exteriorFollow.parent = rig.root;

  const update = (elapsedSeconds: number): RailTrainOperationFrame => {
    if (disposed) throw new Error("Cannot update a disposed mapped rail service.");
    if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) {
      throw new Error("Mapped rail elapsed time must be finite and non-negative.");
    }
    if (!serviceStarted) return frame;
    let remaining = Math.min(elapsedSeconds, 1);
    while (remaining > 0) {
      const step = Math.min(remaining, 0.1);
      frame = advanceRailTrain(config, state, step);
      state = frame.state;
      remaining -= step;
    }
    rig.update(frame, 0.08);
    return frame;
  };

  const getState = (): RailTrainOperationState => state;
  const isBoardingOpen = (): boolean => !serviceStarted && !disposed;
  const startService = (): void => {
    if (disposed) throw new Error("Cannot start a disposed mapped rail service.");
    serviceStarted = true;
  };
  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    rig.dispose();
    interiorWindow.dispose(false, false);
    exteriorFollow.dispose(false, false);
  };

  return { update, getState, interiorWindow, exteriorFollow, isBoardingOpen, startService, dispose };
}

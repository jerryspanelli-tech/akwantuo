import type { Scene } from "@babylonjs/core";
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

  const update = (elapsedSeconds: number): RailTrainOperationFrame => {
    if (disposed) throw new Error("Cannot update a disposed mapped rail service.");
    if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) {
      throw new Error("Mapped rail elapsed time must be finite and non-negative.");
    }
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
  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    rig.dispose();
  };

  return { update, getState, dispose };
}

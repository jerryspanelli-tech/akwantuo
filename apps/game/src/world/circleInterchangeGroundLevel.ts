import type { Scene } from "@babylonjs/core";
import { getMapNodePosition } from "./greaterAccraLayout";
import {
  createCircleGroundGeometry,
  type CircleGroundGeometryResult
} from "./circleGroundGeometry";

/**
 * First playable-scale concept for the ground-level Circle roundabout.
 * Coordinates are local game-design targets around the existing Greater
 * Accra map node; they are not surveyed positions or engineering dimensions.
 */
export const CIRCLE_GROUND_ROUNDABOUT_LAYOUT = {
  id: "kwame-nkrumah-circle-ground-level",
  centreNodeId: "circle-junction",
  groundElevationM: 0,
  outerRadiusM: 58,
  islandRadiusM: 18,
  approaches: [
    // Bearings follow the actual authored Greater Accra road centrelines.
    // Their ends overlap the clipped main-road ribbons at the Circle envelope.
    { id: "n1-west-approach", bearingRadians: -1.85459, roadWidthM: 24.5, roadLengthM: 675 },
    { id: "n1-tema-corridor", bearingRadians: 1.69710, roadWidthM: 24.5, roadLengthM: 675 },
    { id: "n6-circle-caprice", bearingRadians: -0.41822, roadWidthM: 24.5, roadLengthM: 443 },
    { id: "ring-road-central", bearingRadians: 2.01064, roadWidthM: 24.5, roadLengthM: 675 }
  ],
  status: "prototype",
  designNote: "The ground-level roundabout is documented in the Circle project descriptions. Radius, island size, approach bearings and widths here are provisional game-layout values chosen to make a first spatial prototype; they are not measurements of the real interchange."
} as const;

export function isCircleGroundRoundaboutLayoutValid(): boolean {
  const centre = getMapNodePosition(CIRCLE_GROUND_ROUNDABOUT_LAYOUT.centreNodeId);
  const approaches = CIRCLE_GROUND_ROUNDABOUT_LAYOUT.approaches;
  return !!centre &&
    CIRCLE_GROUND_ROUNDABOUT_LAYOUT.outerRadiusM > CIRCLE_GROUND_ROUNDABOUT_LAYOUT.islandRadiusM &&
    CIRCLE_GROUND_ROUNDABOUT_LAYOUT.islandRadiusM > 0 &&
    approaches.every((approach) => approach.roadLengthM > 0) &&
    approaches.length >= 4 &&
    new Set(approaches.map((approach) => approach.id)).size === approaches.length &&
    approaches.every((approach) =>
      Number.isFinite(approach.bearingRadians) &&
      Number.isFinite(approach.roadWidthM) &&
      approach.roadWidthM > 0
    );
}

/** Creates the ground-level Circle prototype at its Greater Accra map anchor. */
export function createCircleInterchangeGroundLevel(
  scene: Scene
): CircleGroundGeometryResult {
  const centre = getMapNodePosition(CIRCLE_GROUND_ROUNDABOUT_LAYOUT.centreNodeId);
  if (!centre) throw new Error("Circle ground layout is missing its Greater Accra map anchor.");
  if (!isCircleGroundRoundaboutLayoutValid()) {
    throw new Error("Circle ground roundabout layout failed validation.");
  }

  return createCircleGroundGeometry(scene, {
    id: CIRCLE_GROUND_ROUNDABOUT_LAYOUT.id,
    centerX: centre.x,
    centerZ: centre.z,
    groundElevationM: CIRCLE_GROUND_ROUNDABOUT_LAYOUT.groundElevationM,
    outerRadiusM: CIRCLE_GROUND_ROUNDABOUT_LAYOUT.outerRadiusM,
    islandRadiusM: CIRCLE_GROUND_ROUNDABOUT_LAYOUT.islandRadiusM,
    approaches: CIRCLE_GROUND_ROUNDABOUT_LAYOUT.approaches.map((approach) => ({
      ...approach,
      roadLengthM: approach.roadLengthM
    }))
  });
}

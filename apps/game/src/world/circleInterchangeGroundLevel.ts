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
  approachRoadLengthM: 150,
  approaches: [
    { id: "n1-west-approach", bearingRadians: -Math.PI / 2, roadWidthM: 18 },
    { id: "n1-tema-corridor", bearingRadians: Math.PI / 2, roadWidthM: 18 },
    { id: "nsawam-road", bearingRadians: 0, roadWidthM: 16 },
    { id: "kwame-nkrumah-avenue", bearingRadians: 2.35, roadWidthM: 16 },
    { id: "ring-road-west", bearingRadians: -2.2, roadWidthM: 15 },
    { id: "feo-oye-o-connection", bearingRadians: 0.78, roadWidthM: 14 }
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
    CIRCLE_GROUND_ROUNDABOUT_LAYOUT.approachRoadLengthM > 0 &&
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
      roadLengthM: CIRCLE_GROUND_ROUNDABOUT_LAYOUT.approachRoadLengthM
    }))
  });
}

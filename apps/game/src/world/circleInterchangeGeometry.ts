import type { Scene } from "@babylonjs/core";
import { createCircleInterchangeGroundLevel } from "./circleInterchangeGroundLevel";
import { createCircleInterchangeElevatedStructures } from "./circleInterchangeElevatedLayout";
import type { CircleGroundGeometryResult } from "./circleGroundGeometry";
import type { ElevatedRoadGeometryResult } from "./elevatedRoadGeometry";
import { createCircleGroundAccessGeometry, type CircleGroundAccessGeometryResult } from "./circleGroundAccessGeometry";

export type CircleInterchangeGeometryResult = Readonly<{
  groundLevel: CircleGroundGeometryResult;
  elevatedStructures: Readonly<Record<string, ElevatedRoadGeometryResult>>;
  localAccess: CircleGroundAccessGeometryResult;
}>;

/**
 * Creates the current Circle visual geometry package in the Greater Accra
 * coordinate frame. The meshes remain visual-only: no traffic simulation,
 * collision, navigation or vehicle route authority is attached.
 */
export function createCircleInterchangeGeometry(
  scene: Scene
): CircleInterchangeGeometryResult {
  const groundLevel = createCircleInterchangeGroundLevel(scene);
  const elevatedStructures = createCircleInterchangeElevatedStructures(scene);
  const localAccess = createCircleGroundAccessGeometry(scene);
  return { groundLevel, elevatedStructures, localAccess };
}

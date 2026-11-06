import type { Scene } from "@babylonjs/core";
import { createCircleInterchangeGroundLevel } from "./circleInterchangeGroundLevel";
import { createCircleInterchangeElevatedStructures } from "./circleInterchangeElevatedLayout";
import type { CircleGroundGeometryResult } from "./circleGroundGeometry";
import type { ElevatedRoadGeometryResult } from "./elevatedRoadGeometry";

export type CircleInterchangeGeometryResult = Readonly<{
  groundLevel: CircleGroundGeometryResult;
  elevatedStructures: Readonly<Record<string, ElevatedRoadGeometryResult>>;
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
  return { groundLevel, elevatedStructures };
}

import type { Scene } from "@babylonjs/core";
import { getMapNodePosition } from "./greaterAccraLayout";
import { CIRCLE_STRUCTURE_REFERENCES } from "./circleInterchange";
import {
  createElevatedRoadGeometry,
  type ElevatedRoadGeometryResult,
  type ElevatedRoadPoint
} from "./elevatedRoadGeometry";

export type CircleElevatedStructureLayout = Readonly<{
  id: string;
  referenceId: string;
  level: "first_elevated" | "second_elevated";
  deckElevationM: number;
  points: readonly Readonly<{ x: number; z: number }>[];
  supportStationsM: readonly number[];
  designNote: string;
}>;

/**
 * Conceptual 3D paths for the four principal viaducts.
 *
 * Structure lengths and deck widths come from the FHECOR 2016 project sheet.
 * XY placement, curvature, elevations and evenly spaced support stations are
 * provisional game-layout decisions, informed by the published aerial view.
 * They are not a surveyed or structural-engineering reconstruction.
 */
function stationsForSpans(lengthM: number, spanCount: number): readonly number[] {
  return Array.from({ length: spanCount - 1 }, (_, index) =>
    (lengthM / spanCount) * (index + 1)
  );
}

function makeSemicircle(lengthM: number): readonly Readonly<{ x: number; z: number }>[] {
  const segmentCount = 10;
  const radius = lengthM / (segmentCount * 2 * Math.sin(Math.PI / (2 * segmentCount)));
  const centreX = 145;
  const centreZ = -95;
  return Array.from({ length: segmentCount + 1 }, (_, index) => {
    const angle = Math.PI - (Math.PI * index) / segmentCount;
    return {
      x: centreX + Math.cos(angle) * radius,
      z: centreZ + Math.sin(angle) * radius
    };
  });
}

const ringLength = 925;
const akasanomaLength = 168.3;
const nsawamLength = 167.8;
const loopLength = 323;
const feoOyeoRampDownLength = 141.5;
const feoOyeoRampUpLength = 143;

export const CIRCLE_ELEVATED_STRUCTURE_LAYOUTS: readonly CircleElevatedStructureLayout[] = [
  {
    id: "circle-ring-road-main-viaduct-3d",
    referenceId: "circle-ring-road-main-viaduct",
    level: "second_elevated",
    deckElevationM: 13,
    points: [{ x: -370, z: -277.5 }, { x: 370, z: 277.5 }],
    supportStationsM: stationsForSpans(ringLength, 25),
    designNote: "925 m main Ring Road viaduct; stylised diagonal placement based on the published aerial view. It represents the elevated Ring Road corridor that crosses the Odaw River and railway, but those crossing positions are not georeferenced in this prototype."
  },
  {
    id: "circle-akasanoma-viaduct-3d",
    referenceId: "circle-akasanoma-viaduct",
    level: "first_elevated",
    deckElevationM: 7.5,
    points: [{ x: 90, z: -70 }, { x: -44.64, z: 30.98 }],
    supportStationsM: stationsForSpans(akasanomaLength, 5),
    designNote: "168.3 m Akasanoma viaduct connecting the Akasanoma-side approach toward the Nsawam Road / Accra Newtown junction. Horizontal placement is a game-layout approximation."
  },
  {
    id: "circle-nsawam-viaduct-3d",
    referenceId: "circle-nsawam-viaduct",
    level: "first_elevated",
    deckElevationM: 7.5,
    points: [{ x: -70, z: 110 }, { x: 64.24, z: 9.32 }],
    supportStationsM: stationsForSpans(nsawamLength, 5),
    designNote: "167.8 m Nsawam viaduct for the opposite first-level movement toward Kwame Nkrumah Avenue. Horizontal placement is a game-layout approximation."
  },
  {
    id: "circle-loop-viaduct-3d",
    referenceId: "circle-loop-viaduct",
    level: "first_elevated",
    deckElevationM: 8.5,
    points: makeSemicircle(loopLength),
    supportStationsM: stationsForSpans(loopLength, 10),
    designNote: "323 m loop viaduct represented by a smooth ten-span semicircular game path. Its actual local curvature and connection points must be replaced after detailed site alignment review."
  }
] as const;

function referenceFor(id: string) {
  const reference = CIRCLE_STRUCTURE_REFERENCES.find((item) => item.id === id);
  if (!reference) throw new Error(`Missing Circle structure reference: ${id}`);
  return reference;
}

function toWorldPoints(
  centre: Readonly<{ x: number; z: number }>,
  points: CircleElevatedStructureLayout["points"],
  elevation: number
): readonly ElevatedRoadPoint[] {
  return points.map((point) => ({
    x: centre.x + point.x,
    y: elevation,
    z: centre.z + point.z
  }));
}

function pathLength(points: readonly ElevatedRoadPoint[]): number {
  let length = 0;
  for (let index = 1; index < points.length; index += 1) {
    const a = points[index - 1];
    const b = points[index];
    length += Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
  }
  return length;
}


export type CircleFeoOyeoRampLayout = Readonly<{
  id: string;
  referenceId: "circle-feo-oye-o-ramp-down" | "circle-feo-oye-o-ramp-up";
  lengthM: number;
  deckWidthM: number;
  points: readonly ElevatedRoadPoint[];
  designNote: string;
}>;

function makeFeoOyeoRamp(
  id: string,
  referenceId: CircleFeoOyeoRampLayout["referenceId"],
  lengthM: number,
  startX: number,
  startZ: number
): CircleFeoOyeoRampLayout {
  const riseM = 7.5;
  const horizontalLengthM = Math.sqrt(lengthM * lengthM - riseM * riseM);
  const dx = horizontalLengthM * 0.8;
  const dz = horizontalLengthM * 0.6;
  const ascendingPoints = [
    { x: startX, y: 0, z: startZ },
    { x: startX + dx / 2, y: riseM / 2, z: startZ + dz / 2 },
    { x: startX + dx, y: riseM, z: startZ + dz }
  ];
  const points = id.includes("ramp-down")
    ? [...ascendingPoints].reverse()
    : ascendingPoints;
  return {
    id,
    referenceId,
    lengthM,
    deckWidthM: 6.5,
    points,
    designNote: "Published length and width; local alignment and vertical profile are provisional visual-design assumptions, not surveyed ramp geometry."
  };
}

export const CIRCLE_FEO_OYEO_RAMPS: readonly CircleFeoOyeoRampLayout[] = [
  makeFeoOyeoRamp("circle-feo-oye-ramp-down-3d", "circle-feo-oye-o-ramp-down", feoOyeoRampDownLength, 185, -160),
  makeFeoOyeoRamp("circle-feo-oye-ramp-up-3d", "circle-feo-oye-o-ramp-up", feoOyeoRampUpLength, 170, -178)
] as const;

export function isCircleFeoOyeoRampLayoutValid(): boolean {
  const ids = new Set(CIRCLE_FEO_OYEO_RAMPS.map((ramp) => ramp.id));
  const refs = new Set(CIRCLE_FEO_OYEO_RAMPS.map((ramp) => ramp.referenceId));
  return CIRCLE_FEO_OYEO_RAMPS.length === 2 && ids.size === 2 && refs.size === 2 &&
    CIRCLE_FEO_OYEO_RAMPS.every((ramp) =>
      ramp.points.length >= 2 &&
      Math.abs(pathLength(ramp.points) - ramp.lengthM) < 0.01 &&
      ramp.deckWidthM === 6.5 &&
      ramp.points.every((point) =>
        Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.z)
      )
    );
}

export function isCircleElevatedStructureLayoutValid(): boolean {
  const centre = getMapNodePosition("circle-junction");
  if (!centre || CIRCLE_ELEVATED_STRUCTURE_LAYOUTS.length !== 4 || !isCircleFeoOyeoRampLayoutValid()) return false;
  const ids = new Set(CIRCLE_ELEVATED_STRUCTURE_LAYOUTS.map((layout) => layout.id));
  const references = new Set(CIRCLE_ELEVATED_STRUCTURE_LAYOUTS.map((layout) => layout.referenceId));
  if (ids.size !== CIRCLE_ELEVATED_STRUCTURE_LAYOUTS.length || references.size !== 4) return false;

  return CIRCLE_ELEVATED_STRUCTURE_LAYOUTS.every((layout) => {
    const reference = CIRCLE_STRUCTURE_REFERENCES.find((item) => item.id === layout.referenceId);
    if (!reference || layout.points.length < 2 || layout.supportStationsM.length < 1) return false;
    const points = toWorldPoints(centre, layout.points, layout.deckElevationM);
    const length = pathLength(points);
    return Number.isFinite(length) &&
      Math.abs(length - reference.lengthM) < 0.25 &&
      layout.supportStationsM.every((station) => station > 0 && station < length) &&
      layout.points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.z));
  });
}

/**
 * Builds the four main elevated structures as visual Babylon meshes.
 * The returned decks are not yet wired to traffic, collision or navigation.
 */
export function createCircleInterchangeElevatedStructures(
  scene: Scene
): Readonly<Record<string, ElevatedRoadGeometryResult>> {
  const centre = getMapNodePosition("circle-junction");
  if (!centre) throw new Error("Circle elevated layout is missing its Greater Accra map anchor.");
  if (!isCircleElevatedStructureLayoutValid()) {
    throw new Error("Circle elevated structure layout failed validation.");
  }

  const results: Record<string, ElevatedRoadGeometryResult> = {};
  for (const layout of CIRCLE_ELEVATED_STRUCTURE_LAYOUTS) {
    const reference = referenceFor(layout.referenceId);
    const points = toWorldPoints(centre, layout.points, layout.deckElevationM);
    results[layout.id] = createElevatedRoadGeometry(scene, {
      id: layout.id,
      points,
      deckWidthM: reference.deckWidthM,
      deckThicknessM: 1.5,
      groundElevationM: 0,
      supportStationsM: layout.supportStationsM,
      supportWidthM: layout.level === "second_elevated" ? 2.2 : 1.6,
      supportDepthM: layout.level === "second_elevated" ? 2.2 : 1.6,
      guardrailHeightM: 1.15,
      guardrailInsetM: 0.3
    });
  }
  for (const ramp of CIRCLE_FEO_OYEO_RAMPS) {
    const reference = referenceFor(ramp.referenceId);
    results[ramp.id] = createElevatedRoadGeometry(scene, {
      id: ramp.id,
      points: ramp.points.map((point) => ({
        x: centre.x + point.x,
        y: point.y,
        z: centre.z + point.z
      })),
      deckWidthM: reference.deckWidthM,
      deckThicknessM: 0.8,
      groundElevationM: 0,
      guardrailHeightM: 0.9,
      guardrailInsetM: 0.25
    });
  }
  return results;
}

import {
  Color3,
  Color4,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3
} from "@babylonjs/core";
import {
  GREATER_ACCRA_COASTLINE,
  GREATER_ACCRA_MAP_EXTENT
} from "./greaterAccraLayout";
import { createGreaterAccraRoadGeometry } from "./roadGeometry";
import { createGreaterAccraRoadMarkings } from "./roadMarkingGeometry";
import { createCircleInterchangeGeometry } from "./circleInterchangeGeometry";
import { createGreaterAccraRailTrackGeometry } from "./railTrackGeometry";
import { GREATER_ACCRA_RAIL_NODES } from "./railNetwork";
import { GREATER_ACCRA_RAIL_STATIONS } from "./railStations";
import { deriveRailRoadCrossingCandidates } from "./railRoadCrossings";
import { GREATER_ACCRA_PUBLIC_TRANSPORT_ROUTE_PLANS } from "./publicTransportRoutes";

export type GreaterAccraPlayableWorldReport = Readonly<{
  roadSurfaceMeshCount: number;
  roadMarkingMeshCount: number;
  railRouteCount: number;
  plannedStationAnchorCount: number;
  circleElevatedStructureCount: number;
  railRoadCrossingCandidateCount: number;
  publicTransportCorridorCount: number;
}>;

/**
 * Adds the first Greater Accra transport corridors to the main playable scene.
 * The map is a compressed game layout, not surveyed GIS or engineering data.
 * Geometry is visual-only at this stage: road/rail collision, traffic control,
 * lane navigation and operational railway safety remain separate work.
 */
export function createGreaterAccraPlayableWorld(
  scene: Scene
): GreaterAccraPlayableWorldReport {
  scene.clearColor = new Color4(0.66, 0.76, 0.79, 1);

  const land = MeshBuilder.CreateGround("greater-accra-playable-land", {
    width: GREATER_ACCRA_MAP_EXTENT.widthM,
    height: GREATER_ACCRA_MAP_EXTENT.depthM,
    subdivisions: 2
  }, scene);
  land.position.set(
    (GREATER_ACCRA_MAP_EXTENT.minX + GREATER_ACCRA_MAP_EXTENT.maxX) / 2,
    -0.12,
    (GREATER_ACCRA_MAP_EXTENT.minZ + GREATER_ACCRA_MAP_EXTENT.maxZ) / 2
  );
  const landMaterial = new StandardMaterial("greater-accra-playable-land-material", scene);
  landMaterial.diffuseColor = new Color3(0.52, 0.55, 0.43);
  landMaterial.specularColor = new Color3(0.02, 0.02, 0.02);
  land.material = landMaterial;
  land.isPickable = false;
  land.checkCollisions = false;

  const ocean = MeshBuilder.CreateGround("greater-accra-playable-gulf", {
    width: GREATER_ACCRA_MAP_EXTENT.widthM + 1200,
    height: 7200,
    subdivisions: 1
  }, scene);
  ocean.position.set(2500, -0.08, -6900);
  const oceanMaterial = new StandardMaterial("greater-accra-playable-gulf-material", scene);
  oceanMaterial.diffuseColor = new Color3(0.12, 0.36, 0.46);
  oceanMaterial.specularColor = new Color3(0.12, 0.16, 0.18);
  ocean.material = oceanMaterial;
  ocean.isPickable = false;
  ocean.checkCollisions = false;

  const coast = MeshBuilder.CreateLines("greater-accra-playable-coastline", {
    points: GREATER_ACCRA_COASTLINE
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((point) => new Vector3(point.x, 0.08, point.z)),
    updatable: false
  }, scene);
  coast.color = new Color3(0.86, 0.83, 0.68);
  coast.isPickable = false;
  coast.checkCollisions = false;

  const roadMeshes = createGreaterAccraRoadGeometry(scene, { sampleSpacingM: 90 });
  const roadMarkingMeshes = createGreaterAccraRoadMarkings(scene, { sampleSpacingM: 35 });
  const circle = createCircleInterchangeGeometry(scene);
  const railTracks = createGreaterAccraRailTrackGeometry(scene, { sleeperSpacingM: 1.2 });
  const railCrossingCandidates = deriveRailRoadCrossingCandidates();
  const crossingReviewMaterial = new StandardMaterial("greater-accra-rail-crossing-review-material", scene);
  crossingReviewMaterial.diffuseColor = new Color3(0.92, 0.61, 0.16);
  for (const crossing of railCrossingCandidates) {
    const marker = MeshBuilder.CreateCylinder(
      "rail-road-crossing-review-" + crossing.id,
      { height: 9, diameter: 22, tessellation: 12 },
      scene
    );
    marker.position.set(crossing.position.x, 4.5, crossing.position.z);
    marker.material = crossingReviewMaterial;
    marker.isPickable = false;
    marker.checkCollisions = false;
  }

  const stationMarkerMaterial = new StandardMaterial("greater-accra-planned-station-marker-material", scene);
  stationMarkerMaterial.diffuseColor = new Color3(0.88, 0.67, 0.29);
  for (const station of GREATER_ACCRA_RAIL_STATIONS.filter((item) => item.status === "planned")) {
    const node = GREATER_ACCRA_RAIL_NODES.find((item) => item.id === station.railNodeId);
    if (!node) throw new Error("Missing Greater Accra rail anchor for " + station.id);
    const marker = MeshBuilder.CreateCylinder(
      "greater-accra-planned-station-" + station.id,
      { height: 26, diameter: 38, tessellation: 16 },
      scene
    );
    marker.position.set(node.position.x, 13, node.position.z);
    marker.material = stationMarkerMaterial;
    marker.isPickable = false;
    marker.checkCollisions = false;
  }

  return {
    roadSurfaceMeshCount: roadMeshes.length,
    roadMarkingMeshCount: roadMarkingMeshes.length,
    railRouteCount: railTracks.length,
    plannedStationAnchorCount: GREATER_ACCRA_RAIL_STATIONS.filter((item) => item.status === "planned").length,
    circleElevatedStructureCount: Object.keys(circle.elevatedStructures).length,
    railRoadCrossingCandidateCount: railCrossingCandidates.length,
    publicTransportCorridorCount: GREATER_ACCRA_PUBLIC_TRANSPORT_ROUTE_PLANS.length
  };
}

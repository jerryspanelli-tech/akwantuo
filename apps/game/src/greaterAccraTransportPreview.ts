import {
  ArcRotateCamera,
  Color3,
  Color4,
  HemisphericLight,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3,
  Engine
} from "@babylonjs/core";
import {
  GREATER_ACCRA_COASTLINE,
  GREATER_ACCRA_MAP_EXTENT,
  GREATER_ACCRA_REGION_ANCHORS
} from "./world/greaterAccraLayout";
import { createGreaterAccraRoadGeometry } from "./world/roadGeometry";
import { createGreaterAccraRoadMarkings } from "./world/roadMarkingGeometry";
import { createCircleInterchangeGeometry } from "./world/circleInterchangeGeometry";
import { createGreaterAccraRailTrackGeometry } from "./world/railTrackGeometry";
import { GREATER_ACCRA_RAIL_NODES } from "./world/railNetwork";
import { GREATER_ACCRA_RAIL_STATIONS } from "./world/railStations";
import { GREATER_ACCRA_JUNCTION_LAYOUTS } from "./world/junctionLayouts";
import "./../greater-accra-transport-preview.css";

const canvas = document.querySelector<HTMLCanvasElement>("#map-canvas");
const status = document.querySelector<HTMLElement>("#map-status");
if (!canvas) throw new Error("Greater Accra map preview canvas was not found.");

try {
  const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true }, true);
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.66, 0.76, 0.79, 1);

  const camera = new ArcRotateCamera(
    "greater-accra-map-camera",
    -Math.PI / 2,
    0.88,
    18500,
    new Vector3(2500, 0, 1600),
    scene
  );
  camera.lowerRadiusLimit = 700;
  camera.upperRadiusLimit = 26000;
  camera.maxZ = 30000;
  camera.lowerBetaLimit = 0.12;
  camera.upperBetaLimit = 1.48;
  camera.wheelPrecision = 24;
  camera.panningSensibility = 110;
  const detailView = new URLSearchParams(window.location.search).get("view") === "detail";
  if (detailView) {
    camera.setTarget(new Vector3(-450, 0, 450));
    camera.radius = 5200;
  }
  camera.attachControl(canvas, true);
  scene.activeCamera = camera;

  const light = new HemisphericLight("map-preview-light", new Vector3(0, 1, 0), scene);
  light.intensity = 1.05;

  if (status) status.textContent = "Preparing coastline and terrain…";
  const land = MeshBuilder.CreateGround("greater-accra-land", {
    width: GREATER_ACCRA_MAP_EXTENT.widthM,
    height: GREATER_ACCRA_MAP_EXTENT.depthM,
    subdivisions: 2
  }, scene);
  land.position.set(
    (GREATER_ACCRA_MAP_EXTENT.minX + GREATER_ACCRA_MAP_EXTENT.maxX) / 2,
    -0.12,
    (GREATER_ACCRA_MAP_EXTENT.minZ + GREATER_ACCRA_MAP_EXTENT.maxZ) / 2
  );
  const landMaterial = new StandardMaterial("map-land-material", scene);
  landMaterial.diffuseColor = new Color3(0.52, 0.55, 0.43);
  landMaterial.specularColor = new Color3(0.02, 0.02, 0.02);
  land.material = landMaterial;
  land.isPickable = false;

  const ocean = MeshBuilder.CreateGround("gulf-of-guinea-preview", {
    width: GREATER_ACCRA_MAP_EXTENT.widthM + 1200,
    height: 7200,
    subdivisions: 1
  }, scene);
  ocean.position.set(2500, -0.08, -6900);
  const oceanMaterial = new StandardMaterial("map-ocean-material", scene);
  oceanMaterial.diffuseColor = new Color3(0.12, 0.36, 0.46);
  oceanMaterial.specularColor = new Color3(0.12, 0.16, 0.18);
  ocean.material = oceanMaterial;
  ocean.isPickable = false;

  const coast = MeshBuilder.CreateLines("schematic-coastline", {
    points: GREATER_ACCRA_COASTLINE
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((point) => new Vector3(point.x, 0.08, point.z)),
    updatable: false
  }, scene);
  coast.color = new Color3(0.86, 0.83, 0.68);
  coast.isPickable = false;

  if (status) status.textContent = "Generating Greater Accra road corridors…";
  const roadMeshes = createGreaterAccraRoadGeometry(scene, { sampleSpacingM: 45 });
  const markingMeshes = createGreaterAccraRoadMarkings(scene, { sampleSpacingM: 22 });
  if (status) status.textContent = "Generating Circle multi-level interchange…";
  const circleGeometry = createCircleInterchangeGeometry(scene);
  if (status) status.textContent = "Generating Greater Accra Cape-gauge railway corridors…";
  const railTracks = createGreaterAccraRailTrackGeometry(scene, { sleeperSpacingM: 1.2 });
  const railStationMaterial = new StandardMaterial("rail-station-anchor-material", scene);
  railStationMaterial.diffuseColor = new Color3(0.88, 0.67, 0.29);
  const plannedRailStations = GREATER_ACCRA_RAIL_STATIONS.filter((station) => station.status === "planned");
  for (const station of plannedRailStations) {
    const node = GREATER_ACCRA_RAIL_NODES.find((candidate) => candidate.id === station.railNodeId);
    if (!node) throw new Error("Missing rail map anchor for station " + station.id);
    const marker = MeshBuilder.CreateCylinder(
      "rail-station-anchor-" + station.id,
      { height: 26, diameter: 38, tessellation: 16 },
      scene
    );
    marker.position.set(node.position.x, 13, node.position.z);
    marker.material = railStationMaterial;
    marker.isPickable = false;
  }
  const junctionMaterial = new StandardMaterial("junction-reservation-material", scene);
  junctionMaterial.diffuseColor = new Color3(0.78, 0.59, 0.28);
  junctionMaterial.alpha = 0.2;
  junctionMaterial.backFaceCulling = false;

  for (const layout of GREATER_ACCRA_JUNCTION_LAYOUTS) {
    const reservation = MeshBuilder.CreateDisc(
      "junction-reservation-" + layout.junctionId,
      { radius: Math.max(layout.reserveWidthM, layout.reserveDepthM) * 0.42, tessellation: 48 },
      scene
    );
    reservation.position.set(layout.centre.x, 0.12, layout.centre.z);
    reservation.scaling.x = 1;
    reservation.scaling.z = layout.reserveDepthM / layout.reserveWidthM;
    reservation.material = junctionMaterial;
    reservation.isPickable = false;
  }

  if (status) status.textContent = "Placing district anchors and finalising map…";
  const anchorMaterial = new StandardMaterial("district-anchor-material", scene);
  anchorMaterial.diffuseColor = new Color3(0.83, 0.76, 0.57);
  for (const anchor of GREATER_ACCRA_REGION_ANCHORS) {
    const marker = MeshBuilder.CreateCylinder(
      "district-anchor-" + anchor.regionId,
      { height: 18, diameter: 54, tessellation: 12 },
      scene
    );
    marker.position.set(anchor.x, 9, anchor.z);
    marker.material = anchorMaterial;
    marker.isPickable = false;
  }

  engine.runRenderLoop(() => scene.render());
  window.addEventListener("resize", () => engine.resize());
  if (status) {
    status.textContent = `Network preview ready · ${roadMeshes.length} road-surface meshes · ${markingMeshes.length} road-marking meshes · Circle: ${Object.keys(circleGeometry.elevatedStructures).length} elevated structures · ${railTracks.length} rail routes · ${plannedRailStations.length} planned station anchors · ${GREATER_ACCRA_REGION_ANCHORS.length} district anchors`;
  }
} catch (error) {
  if (status) status.textContent = "Map preview failed: " + (error instanceof Error ? error.message : String(error));
  throw error;
}

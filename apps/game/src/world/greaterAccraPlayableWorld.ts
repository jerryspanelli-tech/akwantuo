import {
  Color3,
  Color4,
  DynamicTexture,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3,
  VertexData
} from "@babylonjs/core";
import {
  GREATER_ACCRA_COASTLINE,
  GREATER_ACCRA_MAP_EXTENT,
  GREATER_ACCRA_REGION_ANCHORS,
  GREATER_ACCRA_ROAD_PATHS
} from "./greaterAccraLayout";
import { createGreaterAccraRoadGeometry } from "./roadGeometry";
import { enableAkwantuoShadowReceiver } from "./lighting";
import { createGreaterAccraRoadMarkings } from "./roadMarkingGeometry";
import { createCircleInterchangeGeometry } from "./circleInterchangeGeometry";
import { createGreaterAccraRailTrackGeometry } from "./railTrackGeometry";
import { GREATER_ACCRA_RAIL_NODES } from "./railNetwork";
import { GREATER_ACCRA_RAIL_STATIONS } from "./railStations";
import { deriveRailRoadCrossingCandidates } from "./railRoadCrossings";
import { GREATER_ACCRA_PUBLIC_TRANSPORT_ROUTE_PLANS } from "./publicTransportRoutes";
import { createGhanaN6SpeedLimitSigns } from "./ghanaRoadSignage";

export type GreaterAccraPlayableWorldReport = Readonly<{
  roadSurfaceMeshCount: number;
  roadMarkingMeshCount: number;
  railRouteCount: number;
  plannedStationAnchorCount: number;
  circleElevatedStructureCount: number;
  railRoadCrossingCandidateCount: number;
  publicTransportCorridorCount: number;
  n6TownSignCount: number;
  n6SpeedLimitSignCount: number;
}>;

const N6_TOWN_SIGN_LABELS = [
  ["pokuase", "POKUASE"],
  ["amasaman", "AMASAMAN"],
  ["nsawam", "NSAWAM"],
  ["suhum", "SUHUM"],
  ["bunso", "BUNSO"],
  ["anyinam", "ANYINAM"],
  ["nkawkaw", "NKAWKAW"],
  ["konongo", "KONONGO"],
  ["ejisu", "EJISU"],
  ["kumasi", "KUMASI"]
] as const;

/** Small roadside wayfinding signs make the intercity corridor readable in play. */
function createN6TownSigns(scene: Scene): number {
  const postMaterial = new StandardMaterial("n6-town-sign-post-material", scene);
  postMaterial.diffuseColor = new Color3(0.22, 0.25, 0.23);
  const labels = new Map<string, (typeof GREATER_ACCRA_REGION_ANCHORS)[number]>();
  for (const anchor of GREATER_ACCRA_REGION_ANCHORS) labels.set(anchor.regionId, anchor);
  for (const [regionId, label] of N6_TOWN_SIGN_LABELS) {
    const anchor = labels.get(regionId);
    if (!anchor) throw new Error("Missing N6 town sign anchor for " + regionId);
    const texture = new DynamicTexture(
      "n6-town-sign-texture-" + regionId,
      { width: 256, height: 96 },
      scene,
      false
    );
    const context = texture.getContext();
    context.fillStyle = "#174b3b";
    context.fillRect(0, 0, 256, 96);
    context.strokeStyle = "#f1e8c9";
    context.lineWidth = 6;
    context.strokeRect(4, 4, 248, 88);
    context.fillStyle = "#f1e8c9";
    context.font = "bold 24px Arial";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("N6", 42, 48);
    context.fillRect(76, 20, 2, 56);
    context.font = "bold 25px Arial";
    context.fillText(label, 165, 48, 166);
    texture.update(false);

    const signMaterial = new StandardMaterial("n6-town-sign-material-" + regionId, scene);
    signMaterial.diffuseTexture = texture;
    signMaterial.emissiveColor = new Color3(0.12, 0.12, 0.1);
    signMaterial.backFaceCulling = false;
    const signX = anchor.x + 30;
    const board = MeshBuilder.CreatePlane("n6-town-sign-board-" + regionId, {
      width: 5.2,
      height: 2.1,
      sideOrientation: Mesh.DOUBLESIDE
    }, scene);
    board.position.set(signX, 4.1, anchor.z);
    board.material = signMaterial;
    board.isPickable = false;
    board.checkCollisions = false;
    for (const side of [-1, 1]) {
      const post = MeshBuilder.CreateCylinder("n6-town-sign-post-" + regionId + "-" + side, {
        height: 3.4,
        diameter: 0.14,
        tessellation: 8
      }, scene);
      post.position.set(signX + side * 2.15, 1.7, anchor.z);
      post.material = postMaterial;
      post.isPickable = false;
      post.checkCollisions = false;
    }
  }
  return N6_TOWN_SIGN_LABELS.length;
}

/**
 * Adds the first Greater Accra transport corridors to the main playable scene.
 * The map is a compressed game layout, not surveyed GIS or engineering data.
 * Geometry is visual-only at this stage: road/rail collision, traffic control,
 * lane navigation and operational railway safety remain separate work.
 */

/**
 * Low-density procedural relief for the playable Greater Accra map.
 * This is a visual approximation, not surveyed elevation data. Main road
 * corridors are smoothly flattened to the established road datum.
 */
function createGreaterAccraTerrainMesh(scene: Scene): Mesh {
  // A 150m sampling interval replaces the former ~250m cells. This keeps
  // broad Ghanaian terrain relief visibly 3D at medium distance without
  // allocating a dense per-frame terrain system on mobile.
  const columns = 140;
  const rows = 250;
  const minX = GREATER_ACCRA_MAP_EXTENT.minX;
  const maxX = GREATER_ACCRA_MAP_EXTENT.maxX;
  const minZ = GREATER_ACCRA_MAP_EXTENT.minZ;
  const maxZ = GREATER_ACCRA_MAP_EXTENT.maxZ;
  const width = maxX - minX;
  const depth = maxZ - minZ;

  const distanceToSegment = (x: number, z: number, a: { x: number; z: number }, b: { x: number; z: number }): number => {
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const lengthSquared = dx * dx + dz * dz;
    const t = lengthSquared > 0
      ? Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / lengthSquared))
      : 0;
    return Math.hypot(x - (a.x + dx * t), z - (a.z + dz * t));
  };

  const distanceToRoad = (x: number, z: number): number => {
    let nearest = Number.POSITIVE_INFINITY;
    for (const road of GREATER_ACCRA_ROAD_PATHS) {
      if (!road.playableInFirstRelease) continue;
      for (let index = 1; index < road.points.length; index += 1) {
        nearest = Math.min(nearest, distanceToSegment(x, z, road.points[index - 1], road.points[index]));
      }
    }
    return nearest;
  };

  const gaussian = (x: number, z: number, cx: number, cz: number, sx: number, sz: number): number => {
    const nx = (x - cx) / sx;
    const nz = (z - cz) / sz;
    return Math.exp(-0.5 * (nx * nx + nz * nz));
  };

  const terrainHeight = (x: number, z: number): number => {
    const uplands =
      24 * gaussian(x, z, 3300, 3400, 1700, 1500) +
      19 * gaussian(x, z, -2300, 5000, 1900, 1700) +
      14 * gaussian(x, z, -1800, 2200, 1500, 1200) +
      12 * gaussian(x, z, 5700, 1700, 1900, 1300);
    const broadRelief = 2.8 * Math.sin(x / 2100) * Math.cos(z / 2800) +
      1.4 * Math.sin((x + z) / 1250);
    const coastalLowland = z < -1700 ? Math.max(-2.5, (z + 1700) * 0.0012) : 0;
    const raw = Math.max(-2, uplands + broadRelief + coastalLowland);
    const roadDistance = distanceToRoad(x, z);
    const blend = Math.max(0, Math.min(1, (roadDistance - 90) / 170));
    const smoothBlend = blend * blend * (3 - 2 * blend);
    return raw * smoothBlend;
  };

  const positions: number[] = [];
  const indices: number[] = [];
  for (let row = 0; row <= rows; row += 1) {
    const z = minZ + (depth * row) / rows;
    for (let column = 0; column <= columns; column += 1) {
      const x = minX + (width * column) / columns;
      positions.push(x, terrainHeight(x, z) - 0.12, z);
    }
  }
  const stride = columns + 1;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const a = row * stride + column;
      const b = a + 1;
      const c = a + stride;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  const normals: number[] = [];
  VertexData.ComputeNormals(positions, indices, normals);
  const vertexData = new VertexData();
  vertexData.positions = positions;
  vertexData.indices = indices;
  vertexData.normals = normals;
  const terrain = new Mesh("greater-accra-playable-land-3d", scene);
  vertexData.applyToMesh(terrain, false);
  terrain.isPickable = false;
  terrain.checkCollisions = false;
  return terrain;
}

export function createGreaterAccraPlayableWorld(
  scene: Scene
): GreaterAccraPlayableWorldReport {
  const firstNewMeshIndex = scene.meshes.length;
  scene.clearColor = new Color4(0.66, 0.76, 0.79, 1);
  // A restrained coastal distance haze softens the horizon without hiding
  // the road network or compressing distant Accra landmarks into a fog wall.
  scene.fogMode = Scene.FOGMODE_EXP2;
  scene.fogColor = new Color3(0.66, 0.76, 0.79);
  scene.fogDensity = 0.000035;

  const land = createGreaterAccraTerrainMesh(scene);
  const landMaterial = new StandardMaterial("greater-accra-playable-land-material", scene);
  // A single small, repeatable texture gives the large map readable ground
  // variation without adding thousands of terrain meshes or expensive passes.
  const terrainTexture = new DynamicTexture(
    "greater-accra-terrain-detail",
    { width: 512, height: 512 },
    scene,
    false
  );
  const terrainContext = terrainTexture.getContext();
  // Use an earthy fallback colour as well as the detail texture. If a mobile
  // WebGL context fails to upload the dynamic texture, the land must never
  // fall back to the engine default white material.
  terrainContext.fillStyle = "#85845f";
  terrainContext.fillRect(0, 0, 512, 512);
  const terrainPatchColours = ["#69764f", "#85805a", "#9a8b63", "#626f50", "#8b9066"];
  for (let index = 0; index < 460; index += 1) {
    const x = (index * 73 + 29) % 512;
    const z = (index * 191 + 47) % 512;
    const radiusX = 3 + (index * 17) % 13;
    const radiusZ = 2 + (index * 11) % 9;
    terrainContext.globalAlpha = 0.12 + (index % 5) * 0.025;
    terrainContext.fillStyle = terrainPatchColours[index % terrainPatchColours.length];
    terrainContext.beginPath();
    terrainContext.ellipse(x, z, radiusX, radiusZ, (index % 7) * 0.18, 0, Math.PI * 2);
    terrainContext.fill();
  }
  terrainContext.globalAlpha = 0.16;
  for (let index = 0; index < 2600; index += 1) {
    const x = (index * 97 + 13) % 512;
    const z = (index * 193 + 31) % 512;
    terrainContext.fillStyle = index % 2 === 0 ? "#4f6048" : "#c0aa76";
    terrainContext.fillRect(x, z, 1 + (index % 3), 1);
  }
  terrainContext.globalAlpha = 1;
  terrainTexture.update(false);
  terrainTexture.uScale = 90;
  terrainTexture.vScale = 160;
  landMaterial.diffuseTexture = terrainTexture;
  // Slightly warm olive tint keeps the ground natural under Ghanaian daylight.
  landMaterial.diffuseColor = new Color3(0.82, 0.81, 0.68);
  landMaterial.specularColor = new Color3(0.015, 0.015, 0.015);
  land.material = landMaterial;
  enableAkwantuoShadowReceiver(land);
  land.isPickable = false;
  land.checkCollisions = false;

  const ocean = MeshBuilder.CreateGround("greater-accra-playable-gulf", {
    width: GREATER_ACCRA_MAP_EXTENT.widthM + 1200,
    height: 7200,
    subdivisions: 1
  }, scene);
  ocean.position.set(2500, -0.08, -6900);
  const oceanMaterial = new StandardMaterial("greater-accra-playable-gulf-material", scene);
  const waterTexture = new DynamicTexture(
    "greater-accra-gulf-detail",
    { width: 256, height: 256 },
    scene,
    false
  );
  const waterContext = waterTexture.getContext();
  waterContext.fillStyle = "#1c5261";
  waterContext.fillRect(0, 0, 256, 256);
  for (let index = 0; index < 170; index += 1) {
    const x = (index * 47 + 19) % 256;
    const z = (index * 83 + 11) % 256;
    waterContext.globalAlpha = 0.08 + (index % 4) * 0.025;
    waterContext.strokeStyle = index % 2 === 0 ? "#9bc0bd" : "#477f88";
    waterContext.lineWidth = 1 + (index % 2);
    waterContext.beginPath();
    waterContext.moveTo(x, z);
    waterContext.quadraticCurveTo(x + 9, z - 4, x + 20, z + 1);
    waterContext.stroke();
  }
  waterContext.globalAlpha = 1;
  waterTexture.update(false);
  waterTexture.uScale = 42;
  waterTexture.vScale = 16;
  oceanMaterial.diffuseTexture = waterTexture;
  oceanMaterial.diffuseColor = new Color3(0.9, 0.97, 1);
  oceanMaterial.specularColor = new Color3(0.08, 0.12, 0.14);
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
  roadMeshes.forEach(enableAkwantuoShadowReceiver);
  const roadMarkingMeshes = createGreaterAccraRoadMarkings(scene, { sampleSpacingM: 18, dashLengthM: 4.5, dashGapM: 5.5, lineHeightM: 0.095 });
  const n6TownSignCount = createN6TownSigns(scene);
  const n6SpeedLimitSignCount = createGhanaN6SpeedLimitSigns(scene);
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

  // Roads, rail corridors, station markers and coastline are static.
  // Freeze their transforms and the materials created for this world layer.
  const staticMaterials = new Set<StandardMaterial>();
  for (const mesh of scene.meshes.slice(firstNewMeshIndex)) {
    mesh.freezeWorldMatrix();
    if (mesh.material instanceof StandardMaterial) staticMaterials.add(mesh.material);
  }
  for (const material of staticMaterials) material.freeze();

  return {
    roadSurfaceMeshCount: roadMeshes.length,
    roadMarkingMeshCount: roadMarkingMeshes.length,
    railRouteCount: railTracks.length,
    plannedStationAnchorCount: GREATER_ACCRA_RAIL_STATIONS.filter((item) => item.status === "planned").length,
    circleElevatedStructureCount: Object.keys(circle.elevatedStructures).length,
    railRoadCrossingCandidateCount: railCrossingCandidates.length,
    publicTransportCorridorCount: GREATER_ACCRA_PUBLIC_TRANSPORT_ROUTE_PLANS.length,
    n6TownSignCount,
    n6SpeedLimitSignCount
  };
}

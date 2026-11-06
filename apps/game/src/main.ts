import {
  ArcRotateCamera,
  Color3,
  Engine,
  MeshBuilder,
  Scene,
  StandardMaterial,
  TransformNode,
  Vector3
} from "@babylonjs/core";
import "./style.css";
import { COMPLEXIONS, DEFAULT_APPEARANCE, OUTFITS, resolveAppearance, type CharacterAppearance } from "./character/appearance";
import { loadAppearance, saveAppearance } from "./character/appearanceStore";
import { getHairstyle } from "./character/hairstyles";
import { WORLD_CONFIG } from "./world/config";
import { clampToWorld, isBlocked } from "./world/collision";
import { createPreviewWorld } from "./world/previewWorld";
import { createGreaterAccraPlayableWorld } from "./world/greaterAccraPlayableWorld";
import { getMapRoadPath } from "./world/greaterAccraLayout";
import { findNearestRoadProjection, getRoadLaneCenterPoint } from "./world/roadNavigation";
import { getRoadVehicleAutopilotControl } from "./vehicles/roadVehicleAutopilot";
import { advanceRoadVehicleDynamics, type RoadVehicleDynamicsState } from "./vehicles/roadVehicleDynamics";
import { createRoadVehicleGeometry } from "./vehicles/roadVehicleGeometry";
import { createRoadVehicleRig } from "./vehicles/roadVehicleRig";
import { enterVehicle, exitVehicle, type VehicleInteractionState } from "./vehicles/vehicleInteraction";
import { isVehiclePathClear } from "./vehicles/vehicleCollision";
import { PassengerCameraRig } from "./vehicles/passengerCamera";
import { createPublicTransportVehicle } from "./vehicles/publicTransportVehicle";
import { alightPublicTransport, boardPublicTransport, type PublicTransportPassengerState } from "./world/publicTransportOperations";
import { createPlayableRailDemo } from "./world/playableRailDemo";
import { createGreaterAccraMappedRailService } from "./world/mappedRailService";
import { runTransportSmokeChecks } from "./world/transportSmokeChecks";
import { DISTRICT_BUILDINGS } from "./world/ghanaianStreetBuildings";
import { DISTRICT_PROPERTIES } from "./world/districtProperties";
import { INTERIOR_BLUEPRINTS } from "./world/interiorBlueprints";
import { createInteriorRooms } from "./world/interiorRooms";

const bootScreen = document.querySelector<HTMLElement>("#boot-screen");
const gameShell = document.querySelector<HTMLElement>("#game-shell");
const bootStatus = document.querySelector<HTMLElement>("#boot-status");
const canvas = document.querySelector<HTMLCanvasElement>("#world-canvas");
const playButton = document.querySelector<HTMLButtonElement>("#play-button");
const mainMenu = document.querySelector<HTMLElement>("#main-menu");
const footerBar = document.querySelector<HTMLElement>(".footer-bar");
let startupHandoffStage = "module_loaded";
const gameHud = document.querySelector<HTMLElement>("#game-hud");
const joystick = document.querySelector<HTMLElement>("#joystick");
const joystickStick = document.querySelector<HTMLElement>("#joystick-stick");
const jumpButton = document.querySelector<HTMLButtonElement>("#jump-button");
const interactButton = document.querySelector<HTMLButtonElement>("#interact-button");
const vehicleViewButton = document.querySelector<HTMLButtonElement>("#vehicle-view-button");
const notice = document.querySelector<HTMLElement>("#notice");
const characterButton = document.querySelector<HTMLButtonElement>("#character-button");
const characterPanel = document.querySelector<HTMLElement>("#character-panel");
const characterForm = document.querySelector<HTMLFormElement>("#character-form");
const characterClose = document.querySelector<HTMLButtonElement>("#character-close");
const characterSave = document.querySelector<HTMLButtonElement>("#character-save");

const pressedKeys = new Set<string>();
const touchInput = { x: 0, z: 0 };
let jumpRequested = false;
let hasEnteredWorld = false;
let vehicleActionRequested = false;
let vehicleBrake = false;
let vehicleViewRequested = false;

function readAppearanceForm(form: HTMLFormElement): CharacterAppearance {
  const data = new FormData(form);
  return resolveAppearance({
    presentation: data.get("presentation"), age: Number(data.get("age")),
    complexionId: data.get("complexion"), bodyBuild: data.get("build"),
    hairstyleId: data.get("hairstyle"), outfitId: data.get("outfit")
  });
}

function fillAppearanceForm(form: HTMLFormElement, appearance: CharacterAppearance): void {
  const values: Record<string, string> = {
    presentation: appearance.presentation, age: String(appearance.age),
    complexion: appearance.complexionId, build: appearance.bodyBuild,
    hairstyle: appearance.hairstyleId, outfit: appearance.outfitId
  };
  for (const [name, value] of Object.entries(values)) {
    const field = form.elements.namedItem(name);
    if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement) field.value = value;
  }
}

function showNotice(message: string): void {
  if (!notice) return;
  notice.textContent = message;
  notice.classList.add("is-visible");
}

/**
 * Advance the prototype road-vehicle model in stable <=100ms slices while
 * preserving elapsed time after a temporarily slow render frame. A one-second
 * catch-up ceiling prevents a tab-resume pause from teleporting vehicles.
 */
function advanceRoadVehicleElapsed(
  config: Parameters<typeof advanceRoadVehicleDynamics>[0],
  state: RoadVehicleDynamicsState,
  input: Parameters<typeof advanceRoadVehicleDynamics>[2],
  elapsedSeconds: number
): RoadVehicleDynamicsState {
  let remaining = Math.max(0, Math.min(elapsedSeconds, 1));
  let next = state;
  while (remaining > 0) {
    const step = Math.min(remaining, 0.1);
    next = advanceRoadVehicleDynamics(config, next, input, step);
    remaining -= step;
  }
  return next;
}

function createPlayer(scene: Scene, initialAppearance: CharacterAppearance): {
  root: TransformNode;
  leftArm: TransformNode;
  rightArm: TransformNode;
  leftLeg: TransformNode;
  rightLeg: TransformNode;
  applyAppearance: (appearance: CharacterAppearance) => void;
} {
  const root = new TransformNode("player-root", scene);
  root.position.set(WORLD_CONFIG.spawn.x, WORLD_CONFIG.spawn.y, WORLD_CONFIG.spawn.z);
  root.rotation.y = Math.PI;

  const skin = new StandardMaterial("player-skin", scene);
  skin.diffuseColor = new Color3(0.38, 0.21, 0.13);
  const shirt = new StandardMaterial("player-shirt", scene);
  shirt.diffuseColor = new Color3(0.12, 0.31, 0.25);
  const trousers = new StandardMaterial("player-trousers", scene);
  trousers.diffuseColor = new Color3(0.13, 0.15, 0.17);
  const shoes = new StandardMaterial("player-shoes", scene);
  shoes.diffuseColor = new Color3(0.08, 0.08, 0.075);

  const torso = MeshBuilder.CreateCapsule("player-torso", {
    height: 1.05, radius: 0.34, tessellation: 12
  }, scene);
  torso.position.y = 1.22;
  torso.material = shirt;
  torso.parent = root;

  const head = MeshBuilder.CreateSphere("player-head", { diameter: 0.48, segments: 16 }, scene);
  head.position.y = 2.02;
  head.material = skin;
  head.parent = root;

  const hairMaterial = new StandardMaterial("player-hair", scene);
  hairMaterial.diffuseColor = new Color3(0.055, 0.045, 0.04);
  const createHairShape = (name: string, diameter: number, height: number): ReturnType<typeof MeshBuilder.CreateSphere> => {
    const mesh = MeshBuilder.CreateSphere(name, { diameter, segments: 16 }, scene);
    mesh.scaling.y = height;
    mesh.position.y = 2.23;
    mesh.material = hairMaterial;
    mesh.parent = root;
    return mesh;
  };
  const shortNaturalHair = createHairShape("hair-short-natural", 0.49, 0.48);
  const lowCutHair = createHairShape("hair-low-cut", 0.48, 0.27);
  const fadeHair = createHairShape("hair-classic-fade", 0.49, 0.37);
  const afroHair = createHairShape("hair-natural-afro", 0.56, 0.78);

  const leftArm = new TransformNode("left-arm-pivot", scene);
  leftArm.position.set(-0.39, 1.58, 0);
  leftArm.parent = root;
  const rightArm = new TransformNode("right-arm-pivot", scene);
  rightArm.position.set(0.39, 1.58, 0);
  rightArm.parent = root;

  for (const [name, pivot] of [["left-arm", leftArm], ["right-arm", rightArm]] as const) {
    const arm = MeshBuilder.CreateCapsule(name, { height: 0.78, radius: 0.13, tessellation: 10 }, scene);
    arm.position.y = -0.36;
    arm.material = skin;
    arm.parent = pivot;
  }

  const leftLeg = new TransformNode("left-leg-pivot", scene);
  leftLeg.position.set(-0.19, 0.76, 0);
  leftLeg.parent = root;
  const rightLeg = new TransformNode("right-leg-pivot", scene);
  rightLeg.position.set(0.19, 0.76, 0);
  rightLeg.parent = root;

  for (const [name, pivot] of [["left-leg", leftLeg], ["right-leg", rightLeg]] as const) {
    const leg = MeshBuilder.CreateCapsule(name, { height: 0.83, radius: 0.16, tessellation: 10 }, scene);
    leg.position.y = -0.39;
    leg.material = trousers;
    leg.parent = pivot;

    const shoe = MeshBuilder.CreateBox(`${name}-shoe`, { width: 0.28, height: 0.13, depth: 0.43 }, scene);
    shoe.position.set(0, -0.76, 0.09);
    shoe.material = shoes;
    shoe.parent = pivot;
  }

  const applyAppearance = (appearance: CharacterAppearance): void => {
    const complexion = COMPLEXIONS.find((preset) => preset.id === appearance.complexionId) ?? COMPLEXIONS[1];
    const outfit = OUTFITS.find((preset) => preset.id === appearance.outfitId) ?? OUTFITS[0];
    skin.diffuseColor = Color3.FromHexString(complexion.color);
    shirt.diffuseColor = Color3.FromHexString(outfit.topColor);
    trousers.diffuseColor = Color3.FromHexString(outfit.trouserColor);
    const buildScale = appearance.bodyBuild === "slim" ? 0.92 : appearance.bodyBuild === "broad" ? 1.1 : 1;
    const masculine = appearance.presentation === "masculine";
    const broadness = masculine ? 1.08 : 0.96;
    const hipWidth = masculine ? 0.96 : 1.08;

    // These are deliberately modest silhouette adjustments on the temporary
    // primitive avatar; final character art and rigging will replace this mesh.
    root.scaling.set(buildScale, 1, 1);
    torso.scaling.set(broadness * (appearance.bodyBuild === "broad" ? 1.06 : 1), 1, 1);
    leftArm.position.x = -0.39 * broadness;
    rightArm.position.x = 0.39 * broadness;
    leftLeg.position.x = -0.19 * hipWidth * buildScale;
    rightLeg.position.x = 0.19 * hipWidth * buildScale;
    const selectedStyle = getHairstyle(appearance.hairstyleId);
    const styleId = selectedStyle?.id ?? "short-natural";
    shortNaturalHair.isVisible = !["low-cut", "fade", "afro", "covered"].includes(styleId);
    lowCutHair.isVisible = styleId === "low-cut";
    fadeHair.isVisible = ["fade", "high-fade", "low-fade", "mid-fade", "skin-fade", "taper-fade", "waves", "line-up"].includes(styleId);
    afroHair.isVisible = ["afro", "twists", "starter-locs", "locs", "cornrows", "box-braids", "knotless-braids", "ghana-braids", "feed-in-cornrows", "fulani-braids", "faux-locs", "passion-twists", "wig-install", "natural-bun"].includes(styleId);
  };
  applyAppearance(initialAppearance);
  return { root, leftArm, rightArm, leftLeg, rightLeg, applyAppearance };
}

function installTouchControls(): void {
  if (!joystick || !joystickStick) return;

  const resetStick = (): void => {
    touchInput.x = 0;
    touchInput.z = 0;
    joystickStick.style.transform = "translate(0, 0)";
  };

  const updateStick = (event: PointerEvent): void => {
    const bounds = joystick.getBoundingClientRect();
    const centreX = bounds.left + bounds.width / 2;
    const centreY = bounds.top + bounds.height / 2;
    const max = bounds.width * 0.31;
    const dx = event.clientX - centreX;
    const dy = event.clientY - centreY;
    const distance = Math.hypot(dx, dy);
    const scale = distance > max ? max / distance : 1;
    const x = dx * scale;
    const y = dy * scale;
    touchInput.x = x / max;
    touchInput.z = -y / max;
    joystickStick.style.transform = `translate(${x}px, ${y}px)`;
  };

  joystick.addEventListener("pointerdown", (event: PointerEvent) => {
    event.preventDefault();
    joystick.setPointerCapture(event.pointerId);
    updateStick(event);
  });
  joystick.addEventListener("pointermove", (event: PointerEvent) => {
    if (joystick.hasPointerCapture(event.pointerId)) updateStick(event);
  });
  joystick.addEventListener("pointerup", resetStick);
  joystick.addEventListener("pointercancel", resetStick);
  joystick.addEventListener("lostpointercapture", resetStick);
}

function sampleRouteAtDistance(
  route: readonly { x: number; z: number }[],
  distanceM: number
): { x: number; z: number; headingRadians: number } {
  let remaining = Math.max(0, distanceM);
  for (let index = 1; index < route.length; index += 1) {
    const start = route[index - 1];
    const end = route[index];
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const length = Math.hypot(dx, dz);
    if (length <= 1e-6) continue;
    if (remaining <= length) {
      const amount = remaining / length;
      return {
        x: start.x + dx * amount,
        z: start.z + dz * amount,
        headingRadians: Math.atan2(dx, dz)
      };
    }
    remaining -= length;
  }
  const end = route[route.length - 1];
  const previous = route[route.length - 2];
  return {
    x: end.x,
    z: end.z,
    headingRadians: Math.atan2(end.x - previous.x, end.z - previous.z)
  };
}

async function start(): Promise<void> {
  if (!canvas || !bootScreen || !gameShell || !bootStatus) {
    throw new Error("The game startup interface could not be found.");
  }

  // Fail early if core fare, boarding, vehicle, or rail-operation contracts regress.
  runTransportSmokeChecks();
  document.documentElement.dataset.akwantuoBuildingCount = String(DISTRICT_BUILDINGS.length);
  document.documentElement.dataset.akwantuoPropertyCount = String(DISTRICT_PROPERTIES.length);
  document.documentElement.dataset.akwantuoInteriorBlueprintCount = String(INTERIOR_BLUEPRINTS.length);

  bootStatus.textContent = "Loading the world engine…";
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

  const engine = new Engine(canvas, true, {
    preserveDrawingBuffer: false,
    stencil: true,
    antialias: true,
    powerPreference: "high-performance"
  });
  const scene = new Scene(engine);
  const solidAreas = createPreviewWorld(scene, { includeGround: false });
  const interiorRooms = createInteriorRooms(scene);
  document.documentElement.dataset.akwantuoInteriorRoomCount = String(interiorRooms.length);
  for (const room of interiorRooms) solidAreas.push(...room.solidAreas);
  const greaterAccraTransportReport = createGreaterAccraPlayableWorld(scene);
  document.documentElement.dataset.playableRoadSurfaceMeshes = String(greaterAccraTransportReport.roadSurfaceMeshCount);
  document.documentElement.dataset.playableRoadMarkingMeshes = String(greaterAccraTransportReport.roadMarkingMeshCount);
  document.documentElement.dataset.playableRailRoutes = String(greaterAccraTransportReport.railRouteCount);
  document.documentElement.dataset.playableRailStations = String(greaterAccraTransportReport.plannedStationAnchorCount);
  document.documentElement.dataset.playableCircleStructures = String(greaterAccraTransportReport.circleElevatedStructureCount);
  document.documentElement.dataset.playableRailRoadCrossingCandidates = String(greaterAccraTransportReport.railRoadCrossingCandidateCount);
  document.documentElement.dataset.playablePublicTransportCorridors = String(greaterAccraTransportReport.publicTransportCorridorCount);
  const playableRailDemo = createPlayableRailDemo(scene);
  const greaterAccraMappedRailService = createGreaterAccraMappedRailService(scene);
  document.documentElement.dataset.playableMappedRailService = "true";
  document.documentElement.dataset.playableMappedRailBoardingOpen = String(greaterAccraMappedRailService.isBoardingOpen());
  let currentAppearance = loadAppearance(window.localStorage);
  const player = createPlayer(scene, currentAppearance);
  let activeInterior: { buildingId: string; roomId: string; exitX: number; exitZ: number } | null = null;
  const isLocalTransportTestHost = window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "localhost";
  const transportRailTestMode = isLocalTransportTestHost &&
    new URLSearchParams(window.location.search).get("akwantuoTransportTest") === "rail";
  const interiorTestMode = isLocalTransportTestHost &&
    new URLSearchParams(window.location.search).get("akwantuoInteriorTest") === "shop";
  if (transportRailTestMode) {
    // Local-only browser-test spawn; never active on a deployed game host.
    player.root.position.set(-250, 0, 150);
    document.documentElement.dataset.transportTestMode = "rail";
  } else if (interiorTestMode) {
    // Local-only spawn directly outside Osu Corner Mart for entry/exit verification.
    player.root.position.set(-12.1, 0, -72);
    document.documentElement.dataset.interiorTestMode = "shop";
  }

  // First live NPC road vehicle: follows the authored N1 Tema corridor in the
  // playable world. Speed tapers toward the route end so it stops safely rather
  // than driving beyond the authored road. This is local prototype traffic;
  // junction priority and multiplayer authority remain future work.
  const npcTrafficPath = getMapRoadPath("n1-tema-corridor");
  if (!npcTrafficPath || !npcTrafficPath.playableInFirstRelease || npcTrafficPath.points.length < 2) {
    throw new Error("The first-release N1 NPC traffic route is unavailable.");
  }
  // NPC vehicles follow the authored first lane centre, not the road
  // centreline. Restrict projection to this corridor so junction overlaps
  // cannot silently snap the traffic onto a neighbouring road.
  const npcTrafficRoute = npcTrafficPath.points.map((point) => {
    const projection = findNearestRoadProjection(point.x, point.z, {
      maxDistanceM: 1,
      roadSegmentId: npcTrafficPath.roadSegmentId
    });
    if (!projection) throw new Error("N1 NPC route could not project onto its authored road segment.");
    return getRoadLaneCenterPoint(projection, "forward", 0);
  });
  document.documentElement.dataset.npcRoadTrafficLaneCenter = "true";
  const npcTrafficRouteLengthM = npcTrafficRoute.slice(1).reduce((total, point, index) =>
    total + Math.hypot(point.x - npcTrafficRoute[index].x, point.z - npcTrafficRoute[index].z), 0);
  const npcTraffic = [0, 32, 64].map((startDistanceM, index) => {
    const start = sampleRouteAtDistance(npcTrafficRoute, startDistanceM);
    const origin = { x: start.x, y: 0, z: start.z };
    const geometry = createRoadVehicleGeometry(scene, {
      id: "npc-n1-traffic-saloon-" + (index + 1),
      centerX: origin.x,
      centerZ: origin.z,
      groundElevationM: 0,
      bodyColour: ["#b47a32", "#315a78", "#687a54"][index]
    });
    const rig = createRoadVehicleRig(scene, geometry, {
      id: "npc-n1-traffic-saloon-rig-" + (index + 1),
      origin
    });
    return {
      rig,
      state: {
        ...origin,
        headingRadians: start.headingRadians,
        speedMps: 0
      } as RoadVehicleDynamicsState,
      distanceM: startDistanceM
    };
  });
  document.documentElement.dataset.npcRoadTraffic = String(npcTraffic.length);
  document.documentElement.dataset.npcRoadTrafficRoute = npcTrafficPath.roadSegmentId;


  // First real in-world road vehicle: a nearby saloon that can be entered,
  // driven and exited from the playable scene (not only the developer preview).
  const vehicleOrigin = { x: -6, y: 0, z: 5 };
  const vehicleGeometry = createRoadVehicleGeometry(scene, {
    id: "playable-starter-saloon",
    centerX: vehicleOrigin.x,
    centerZ: vehicleOrigin.z,
    groundElevationM: 0,
    bodyColour: "#315a78"
  });
  const vehicleRig = createRoadVehicleRig(scene, vehicleGeometry, {
    id: "playable-starter-saloon-rig",
    origin: vehicleOrigin
  });
  const publicTaxiOrigin = { x: 2.8, y: 0, z: 5 };
  const publicTaxi = createPublicTransportVehicle(scene, "playable-shared-trotro", publicTaxiOrigin);
  let publicTaxiState: RoadVehicleDynamicsState = { x: publicTaxiOrigin.x, z: publicTaxiOrigin.z, headingRadians: Math.PI, speedMps: 0 };
  // One local wallet and one passenger session are shared across every public mode.
  let passengerState: PublicTransportPassengerState = { mode: "not_riding", balancePesewas: 10000 };
  let railPassengerCameraRig: PassengerCameraRig | null = null;
  let publicRideArrived = false;
  const publicRideEndZ = -45;
  let vehicleState: RoadVehicleDynamicsState = {
    x: vehicleOrigin.x, z: vehicleOrigin.z, headingRadians: 0, speedMps: 0
  };
  let interactionState: VehicleInteractionState = { mode: "on_foot" };
  const interiorWindowAnchor = new TransformNode("starter-saloon-interior-camera-anchor", scene);
  interiorWindowAnchor.position.set(0, 1.48, 0.22);
  interiorWindowAnchor.parent = vehicleRig.root;
  const exteriorFollowAnchor = new TransformNode("starter-saloon-exterior-camera-anchor", scene);
  exteriorFollowAnchor.position.set(0, 3.7, -7.5);
  exteriorFollowAnchor.parent = vehicleRig.root;
  let passengerCameraRig: PassengerCameraRig | null = null;
  const vehicleCameraModes = ["interior_window", "interior_free_look", "exterior_follow"] as const;
  let vehicleCameraModeIndex = 0;

  const camera = new ArcRotateCamera(
    "third-person-camera",
    0,
    1.18,
    8,
    new Vector3(0, 1.2, 5),
    scene
  );
  camera.lowerRadiusLimit = 5.5;
  camera.upperRadiusLimit = 11;
  camera.maxZ = 30000;
  camera.lowerBetaLimit = 0.85;
  camera.upperBetaLimit = 1.42;
  camera.wheelPrecision = 65;
  camera.panningSensibility = 0;
  camera.inertia = 0.78;
  camera.attachControl(canvas, true);

  installTouchControls();
  window.addEventListener("keydown", (event: KeyboardEvent) => {
    const key = event.key.toLowerCase();
    if (["w", "a", "s", "d", "e", "c", "arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) {
      event.preventDefault();
    }
    pressedKeys.add(key);
    document.documentElement.dataset.transportLastKey = key;
    document.documentElement.dataset.transportHasEnteredWorld = String(hasEnteredWorld);
    if (key === " " && hasEnteredWorld && interactionState.mode === "on_foot") jumpRequested = true;
    if (key === "e" && hasEnteredWorld) {
      vehicleActionRequested = true;
      document.documentElement.dataset.transportActionRequest = "keyboard_e";
      document.documentElement.dataset.transportActionRequestAt = String(performance.now());
      document.documentElement.dataset.transportVisibilityAtInput = document.visibilityState;
    }
    if (key === "c" && hasEnteredWorld && (interactionState.mode === "inside_vehicle" || passengerState.mode === "riding")) vehicleViewRequested = true;
  });
  window.addEventListener("keyup", (event: KeyboardEvent) => {
    pressedKeys.delete(event.key.toLowerCase());
  });
  window.addEventListener("blur", () => { pressedKeys.clear(); vehicleBrake = false; });
  interactButton?.addEventListener("pointerdown", (event: PointerEvent) => {
    event.preventDefault();
    vehicleActionRequested = true;
    document.documentElement.dataset.transportActionRequest = "touch_interact";
    document.documentElement.dataset.transportActionRequestAt = String(performance.now());
    document.documentElement.dataset.transportVisibilityAtInput = document.visibilityState;
  });
  vehicleViewButton?.addEventListener("pointerdown", (event: PointerEvent) => {
    event.preventDefault(); vehicleViewRequested = true;
  });
  jumpButton?.addEventListener("pointerdown", (event: PointerEvent) => {
    event.preventDefault();
    jumpRequested = true;
  });

  let verticalVelocity = 0;
  let onGround = true;
  let walkClock = 0;

  const render = (): void => {
    const rawDelta = engine.getDeltaTime() / 1000;
    const delta = Math.min(rawDelta, 0.05);

    if (hasEnteredWorld) {
      document.documentElement.dataset.transportRenderFrame = String(
        Number(document.documentElement.dataset.transportRenderFrame ?? 0) + 1
      );
      document.documentElement.dataset.transportRenderFrameAt = String(performance.now());
      // Expose lightweight live state so browser smoke checks can distinguish
      // an input failure from a proximity, fare, or vehicle-state rejection.
      document.documentElement.dataset.transportPlayerX = player.root.position.x.toFixed(2);
      document.documentElement.dataset.transportPlayerZ = player.root.position.z.toFixed(2);
      document.documentElement.dataset.transportTrotroX = publicTaxiState.x.toFixed(2);
      document.documentElement.dataset.transportTrotroZ = publicTaxiState.z.toFixed(2);
      document.documentElement.dataset.transportPassengerMode = passengerState.mode;
      // Follow the same authored corridor with a conservative headway controller.
      // The nearest vehicle ahead limits target speed so the prototype convoy
      // does not simply stack several cars at one point on the route.
      const trafficInRouteOrder = [...npcTraffic].sort((a, b) => b.distanceM - a.distanceM);
      for (let index = 0; index < trafficInRouteOrder.length; index += 1) {
        const traffic = trafficInRouteOrder[index];
        const leader = trafficInRouteOrder[index - 1];
        const gapM = leader ? Math.max(0, leader.distanceM - traffic.distanceM) : Number.POSITIVE_INFINITY;
        const routeEndSpeed = Math.sqrt(2 * 1.6 * Math.max(0, npcTrafficRouteLengthM - traffic.distanceM));
        const headwaySpeed = Number.isFinite(gapM) ? Math.sqrt(2 * 2.0 * Math.max(0, gapM - 12)) : 9;
        const npcControl = getRoadVehicleAutopilotControl({
          wheelbaseM: 2.65,
          maximumSteeringAngleRadians: 0.48,
          targetSpeedMps: Math.min(9, routeEndSpeed, headwaySpeed),
          baseLookaheadM: 9,
          speedLookaheadFactor: 0.65,
          throttleGain: 0.32,
          brakeGain: 0.55
        }, traffic.state, npcTrafficRoute);
        traffic.state = advanceRoadVehicleElapsed({
          wheelbaseM: 2.65,
          maximumForwardSpeedMps: 12,
          maximumReverseSpeedMps: 0.1,
          maximumAccelerationMps2: 2.2,
          serviceBrakingMps2: 5.5,
          maximumSteeringAngleRadians: 0.48,
          rollingDragMps2: 0.28
        }, traffic.state, {
          throttle: npcControl.throttle,
          brake: npcControl.brake,
          steering: npcControl.steering
        }, rawDelta);
        traffic.rig.update(traffic.state);
        traffic.distanceM = npcControl.routeDistanceM;
      }
      const trafficProgress = [...npcTraffic].sort((a, b) => a.distanceM - b.distanceM);
      const minimumTrafficGapM = trafficProgress.slice(1).reduce(
        (minimum, traffic, index) => Math.min(minimum, traffic.distanceM - trafficProgress[index].distanceM),
        Number.POSITIVE_INFINITY
      );
      document.documentElement.dataset.npcRoadTrafficDistanceM = trafficProgress[0].distanceM.toFixed(2);
      document.documentElement.dataset.npcRoadTrafficSpeedMps = npcTraffic.reduce(
        (total, traffic) => total + traffic.state.speedMps, 0
      ).toFixed(2);
      document.documentElement.dataset.npcRoadTrafficMinimumGapM = Number.isFinite(minimumTrafficGapM)
        ? minimumTrafficGapM.toFixed(2)
        : "";

      playableRailDemo.update(Math.min(rawDelta, 0.1));
      let mappedRailFrame = greaterAccraMappedRailService.update(rawDelta);
      if (transportRailTestMode) {
        // Advance four bounded one-second simulation slices per rendered frame
        // so the long mapped route can be verified quickly in local CI only.
        for (let testStep = 0; testStep < 4; testStep += 1) {
          mappedRailFrame = greaterAccraMappedRailService.update(1);
        }
      }
      const mappedRailState = greaterAccraMappedRailService.getState();
      document.documentElement.dataset.mappedRailBoardingOpen = String(greaterAccraMappedRailService.isBoardingOpen());
      document.documentElement.dataset.mappedRailDistanceM = mappedRailState.distanceM.toFixed(2);
      document.documentElement.dataset.mappedRailSpeedMps = mappedRailState.speedMps.toFixed(2);
      document.documentElement.dataset.mappedRailStopId = mappedRailState.currentStopId ?? "";
      document.documentElement.dataset.mappedRailCompleted = String(mappedRailState.completed);
      const railStatus = playableRailDemo.getStatus();
      if (passengerState.mode === "riding" && passengerState.vehicleId === "preview-shared-trotro") {
        const taxiStep = advanceRoadVehicleElapsed({ wheelbaseM: 2.8, maximumForwardSpeedMps: 7, maximumReverseSpeedMps: 2, maximumAccelerationMps2: 1.8, serviceBrakingMps2: 4, maximumSteeringAngleRadians: 0.35, rollingDragMps2: 0.3 }, publicTaxiState, { throttle: publicRideArrived ? 0 : 1, brake: 0, steering: 0 }, rawDelta);
        if (taxiStep.z <= publicRideEndZ) { publicTaxiState = { ...taxiStep, z: publicRideEndZ, speedMps: 0 }; publicRideArrived = true; showNotice("You have reached the final stop. Press ALIGHT to leave the trotro."); }
        else publicTaxiState = taxiStep;
        publicTaxi.update(publicTaxiState);
        document.documentElement.dataset.trotroZ = publicTaxiState.z.toFixed(3);
        document.documentElement.dataset.trotroSpeed = publicTaxiState.speedMps.toFixed(3);
        document.documentElement.dataset.trotroArrived = String(publicRideArrived);
      }
      if (vehicleActionRequested) {
        document.documentElement.dataset.transportActionConsumedAt = String(performance.now());
        document.documentElement.dataset.transportActionPassengerModeBefore = passengerState.mode;
        vehicleActionRequested = false;
        if (activeInterior) {
          const room = interiorRooms.find((item) => item.id === activeInterior?.roomId);
          room?.root.setEnabled(false);
          player.root.position.set(activeInterior.exitX, 0, activeInterior.exitZ);
          activeInterior = null;
          document.documentElement.dataset.activeInteriorId = "";
          showNotice("You stepped back outside.");
        } else if (interactionState.mode === "on_foot" && passengerState.mode === "not_riding") {
          const nearbyBuilding = DISTRICT_BUILDINGS
            .filter((building) => building.interiorId)
            .map((building) => {
              const frontX = building.side === "west"
                ? building.x + building.width / 2
                : building.x - building.width / 2;
              const exitX = frontX + (building.side === "west" ? 1.4 : -1.4);
              return {
                building,
                exitX,
                exitZ: building.z,
                distanceM: Math.hypot(player.root.position.x - exitX, player.root.position.z - building.z)
              };
            })
            .sort((a, b) => a.distanceM - b.distanceM)[0];
          if (nearbyBuilding && nearbyBuilding.distanceM <= 3.5 && nearbyBuilding.building.interiorId) {
            const room = interiorRooms.find((item) => item.id === nearbyBuilding.building.interiorId);
            if (room) {
              room.root.setEnabled(true);
              player.root.position.set(room.spawn.x, 0, room.spawn.z);
              activeInterior = {
                buildingId: nearbyBuilding.building.id,
                roomId: room.id,
                exitX: nearbyBuilding.exitX,
                exitZ: nearbyBuilding.exitZ
              };
              document.documentElement.dataset.activeInteriorId = room.id;
              showNotice("Entered " + nearbyBuilding.building.name + ". Press E to leave.");
            } else {
              showNotice("This building interior is not ready yet.");
            }
          } else {
            showNotice("Move closer to a building entrance to enter.");
          }
        } else if (passengerState.mode === "riding" && passengerState.vehicleId === "greater-accra-mapped-rail-train") {
          const atTemaTerminal = mappedRailState.completed ||
            mappedRailState.currentStopId === "tema-rail-station" ||
            mappedRailState.dwellRemainingSeconds > 0;
          const result = alightPublicTransport(passengerState, {
            id: "tema-rail-station",
            vehicleStopped: mappedRailState.speedMps <= 0.01,
            boardingOpen: false,
            alightingOpen: atTemaTerminal,
            remainingSeats: 0
          }, "greater-accra-mapped-rail-train");
          if (result.ok) {
            passengerState = result.state;
            railPassengerCameraRig?.dispose();
            railPassengerCameraRig = null;
            player.root.setEnabled(true);
            player.root.position.set(
              mappedRailFrame.position.x - Math.cos(mappedRailFrame.headingRadians) * 8,
              0,
              mappedRailFrame.position.z + Math.sin(mappedRailFrame.headingRadians) * 8
            );
            showNotice("You alighted at Tema. No preview fare was charged.");
          } else {
            showNotice("The Accra–Tema train has not reached its Tema terminal yet. Please wait.");
          }
        } else if (passengerState.mode === "riding" && passengerState.vehicleId === "preview-commuter-train") {
          const result = alightPublicTransport(passengerState, { id: "preview-rail-terminal", vehicleStopped: railStatus.alightingOpen, boardingOpen: false, alightingOpen: railStatus.alightingOpen, remainingSeats: 0 }, "preview-commuter-train");
          if (result.ok) { passengerState = result.state; railPassengerCameraRig?.dispose(); railPassengerCameraRig = null; player.root.setEnabled(true); player.root.position.set(-36, 0, railStatus.position.z); showNotice("You alighted from the train. Balance: GH₵" + (passengerState.balancePesewas / 100).toFixed(2)); }
          else showNotice("The train has not reached an alighting stop yet. Please wait.");
        } else if (interactionState.mode === "on_foot" && passengerState.mode === "not_riding" &&
          greaterAccraMappedRailService.isBoardingOpen() &&
          Math.hypot(player.root.position.x + 250, player.root.position.z - 150) <= 14) {
          const result = boardPublicTransport(
            passengerState,
            {
              id: "accra-central-rail-station",
              vehicleStopped: mappedRailState.speedMps <= 0.01,
              boardingOpen: greaterAccraMappedRailService.isBoardingOpen(),
              alightingOpen: false,
              remainingSeats: 80
            },
            "greater-accra-mapped-rail-train",
            "accra-central-tema",
            0.1,
            { baseFarePesewas: 0, perKilometrePesewas: 0 }
          );
          if (result.ok && result.state.mode === "riding") {
            passengerState = result.state;
            railPassengerCameraRig = new PassengerCameraRig(scene, {
              interiorWindow: greaterAccraMappedRailService.interiorWindow,
              exteriorFollow: greaterAccraMappedRailService.exteriorFollow
            });
            vehicleCameraModeIndex = 0;
            player.root.setEnabled(false);
            greaterAccraMappedRailService.startService();
            showNotice("Boarded the Accra–Tema train at Accra Central. Preview ride: no fare charged.");
          } else if (!result.ok) {
            showNotice("Unable to board the mapped train: " + result.reason.replaceAll("_", " ") + ".");
          }
        } else if (interactionState.mode === "on_foot" && passengerState.mode === "not_riding" && railStatus.boardingOpen && Math.hypot(player.root.position.x + 41, player.root.position.z + 20) <= 9) {
          const result = boardPublicTransport(passengerState, { id: "preview-rail-station", vehicleStopped: true, boardingOpen: true, alightingOpen: false, remainingSeats: 40 }, "preview-commuter-train", "preview-rail-route", 0.04, { baseFarePesewas: 300, perKilometrePesewas: 100 });
          if (result.ok && result.state.mode === "riding") { passengerState = result.state; railPassengerCameraRig = new PassengerCameraRig(scene, { interiorWindow: playableRailDemo.interiorWindow, exteriorFollow: playableRailDemo.exteriorFollow }); vehicleCameraModeIndex = 0; player.root.setEnabled(false); playableRailDemo.startService(); showNotice("Boarded the commuter train. Fare: GH₵" + (result.state.farePaidPesewas / 100).toFixed(2) + ". The train is departing."); }
          else if (!result.ok) showNotice("Unable to board train: " + result.reason.replaceAll("_", " ") + ".");
        } else if (passengerState.mode === "riding" && passengerState.vehicleId === "preview-shared-trotro") {
          const result = alightPublicTransport(passengerState, { id: "preview-terminal", vehicleStopped: publicRideArrived, boardingOpen: false, alightingOpen: publicRideArrived, remainingSeats: 0 }, "preview-shared-trotro");
          if (result.ok) { passengerState = result.state; passengerCameraRig?.dispose(); passengerCameraRig = null; player.root.setEnabled(true); player.root.position.set(publicTaxiState.x - 1.7, 0, publicTaxiState.z); showNotice("You alighted. Balance: GH₵" + (passengerState.balancePesewas / 100).toFixed(2)); }
          else showNotice("The trotro is still travelling. Wait for the terminal stop.");
        } else if (interactionState.mode === "on_foot" && passengerState.mode === "not_riding" && Math.hypot(player.root.position.x - (publicTaxiState.x - 1.15), player.root.position.z - publicTaxiState.z) <= 3) {
          document.documentElement.dataset.transportTrotroBranch = "entered";
          document.documentElement.dataset.transportTrotroDistance = Math.hypot(player.root.position.x - (publicTaxiState.x - 1.15), player.root.position.z - publicTaxiState.z).toFixed(3);
          const result = boardPublicTransport(passengerState, { id: "preview-origin", vehicleStopped: publicTaxiState.speedMps === 0, boardingOpen: !publicRideArrived, alightingOpen: false, remainingSeats: 8 }, "preview-shared-trotro", "preview-route", 0.05, { baseFarePesewas: 200, perKilometrePesewas: 100 });
          document.documentElement.dataset.transportTrotroBoardResult = result.ok ? "ok" : result.reason;
          if (result.ok && result.state.mode === "riding") { passengerState = result.state; passengerCameraRig = new PassengerCameraRig(scene, { interiorWindow: publicTaxi.interiorWindow, exteriorFollow: publicTaxi.exteriorFollow }); vehicleCameraModeIndex = 0; player.root.setEnabled(false); showNotice("Boarded shared trotro. Fare: GH₵" + (result.state.farePaidPesewas / 100).toFixed(2)); }
          else if (!result.ok) showNotice("Unable to board: " + result.reason.replaceAll("_", " ") + ".");
        } else if (interactionState.mode === "on_foot") {
          const entryX = vehicleState.x - Math.cos(vehicleState.headingRadians) * 1.15;
          const entryZ = vehicleState.z + Math.sin(vehicleState.headingRadians) * 1.15;
          const distanceToEntryM = Math.hypot(player.root.position.x - entryX, player.root.position.z - entryZ);
          const result = enterVehicle(interactionState, {
            id: "starter-saloon", enabled: true, speedMps: vehicleState.speedMps,
            distanceToEntryM, driverSeatAvailable: true, passengerSeatsAvailable: 3,
            safeExitAvailable: true
          }, "driver");
          if (result.ok) {
            interactionState = result.state;
            player.root.setEnabled(false);
            passengerCameraRig = new PassengerCameraRig(scene, { interiorWindow: interiorWindowAnchor, exteriorFollow: exteriorFollowAnchor });
            vehicleCameraModeIndex = 0;
            showNotice("Driving: WASD or the touch joystick controls the car. Press E to exit when stopped.");
          } else {
            showNotice(result.reason === "too_far" ? "Move closer to the driver's door to enter." : "You cannot enter this vehicle right now.");
          }
        } else {
          const result = exitVehicle(interactionState, {
            id: "starter-saloon", enabled: true, speedMps: vehicleState.speedMps,
            distanceToEntryM: 0, driverSeatAvailable: true, passengerSeatsAvailable: 3,
            safeExitAvailable: !isBlocked(vehicleState.x - 1.8, vehicleState.z, solidAreas, WORLD_CONFIG.movement.collisionRadius)
          });
          if (result.ok) {
            interactionState = result.state;
            passengerCameraRig?.dispose();
            passengerCameraRig = null;
            player.root.setEnabled(true);
            player.root.position.set(vehicleState.x - 1.8, 0, vehicleState.z);
            showNotice("You have exited the vehicle.");
          } else {
            showNotice(result.reason === "vehicle_moving" ? "Stop the vehicle before exiting." : "There is no safe space to exit here.");
          }
        }
        document.documentElement.dataset.transportPassengerMode = passengerState.mode;
        document.documentElement.dataset.transportLastNotice = notice?.textContent ?? "";
        document.documentElement.dataset.transportLastActionAt = String(performance.now());
        window.setTimeout(() => notice?.classList.remove("is-visible"), 3000);
      }

      if (interactionState.mode === "inside_vehicle" || passengerState.mode === "riding") {
        const activePassengerCameraRig = railPassengerCameraRig ?? passengerCameraRig;
        if (vehicleViewRequested && activePassengerCameraRig) {
          vehicleViewRequested = false;
          vehicleCameraModeIndex = (vehicleCameraModeIndex + 1) % vehicleCameraModes.length;
          activePassengerCameraRig.setMode(vehicleCameraModes[vehicleCameraModeIndex], canvas ?? undefined);
          showNotice(`Vehicle view: ${vehicleCameraModes[vehicleCameraModeIndex].replaceAll("_", " ")}.`);
          window.setTimeout(() => notice?.classList.remove("is-visible"), 1800);
        }
        if (passengerState.mode === "riding" && passengerState.vehicleId === "preview-shared-trotro") {
          camera.target = Vector3.Lerp(camera.target, new Vector3(publicTaxiState.x, 1.8, publicTaxiState.z), Math.min(1, delta * 8));
          camera.alpha = -Math.PI / 2 - publicTaxiState.headingRadians;
          camera.radius = 9;
        } else if (passengerState.mode === "riding" && passengerState.vehicleId === "greater-accra-mapped-rail-train") {
          camera.target = Vector3.Lerp(
            camera.target,
            new Vector3(mappedRailFrame.position.x, 2.2, mappedRailFrame.position.z),
            Math.min(1, delta * 8)
          );
          camera.radius = 16;
        } else if (passengerState.mode === "riding" && passengerState.vehicleId === "preview-commuter-train") {
          const railPosition = playableRailDemo.getStatus().position;
          camera.target = Vector3.Lerp(camera.target, new Vector3(railPosition.x, 2, railPosition.z), Math.min(1, delta * 8));
          camera.radius = 12;
        } else {
          let steering = touchInput.x;
          let throttle = touchInput.z;
          if (pressedKeys.has("a") || pressedKeys.has("arrowleft")) steering -= 1;
          if (pressedKeys.has("d") || pressedKeys.has("arrowright")) steering += 1;
          if (pressedKeys.has("w") || pressedKeys.has("arrowup")) throttle += 1;
          if (pressedKeys.has("s") || pressedKeys.has("arrowdown")) throttle -= 1;
          steering = Math.max(-1, Math.min(1, steering));
          throttle = Math.max(-1, Math.min(1, throttle));
          const next = advanceRoadVehicleElapsed({
            wheelbaseM: 2.65, maximumForwardSpeedMps: 16, maximumReverseSpeedMps: 4,
            maximumAccelerationMps2: 3.2, serviceBrakingMps2: 7,
            maximumSteeringAngleRadians: 0.48, rollingDragMps2: 0.45
          }, vehicleState, {
            throttle, brake: vehicleBrake || pressedKeys.has(" ") ? 1 : 0, steering
          }, rawDelta);
          const bounded = clampToWorld(next.x, next.z, {
            minX: WORLD_CONFIG.bounds.minX + 2.5, maxX: WORLD_CONFIG.bounds.maxX - 2.5,
            minZ: WORLD_CONFIG.bounds.minZ + 2.5, maxZ: WORLD_CONFIG.bounds.maxZ - 2.5
          });
          if (!isBlocked(bounded.x, bounded.z, solidAreas, 2.35) && isVehiclePathClear(
            { x: vehicleState.x, z: vehicleState.z, radiusM: 2.25 },
            { x: bounded.x, z: bounded.z, radiusM: 2.25 },
            { x: publicTaxiState.x, z: publicTaxiState.z, radiusM: 2.35 }
          )) {
            vehicleState = { ...next, x: bounded.x, z: bounded.z };
          } else {
            vehicleState = { ...vehicleState, speedMps: 0 };
          }
          vehicleRig.update(vehicleState);
          camera.target = Vector3.Lerp(camera.target, new Vector3(vehicleState.x, 1.4, vehicleState.z), Math.min(1, delta * 8));
          camera.alpha = -Math.PI / 2 - vehicleState.headingRadians;
          camera.radius = 9;
        }
        if (interactButton) interactButton.textContent = passengerState.mode === "riding" ? "ALIGHT" : "EXIT";
        if (jumpButton) jumpButton.classList.add("is-hidden");
        if (vehicleViewButton) vehicleViewButton.classList.remove("is-hidden");
      } else {
        const nearMappedRailBoarding = interactionState.mode === "on_foot" &&
          passengerState.mode === "not_riding" &&
          greaterAccraMappedRailService.isBoardingOpen() &&
          Math.hypot(player.root.position.x + 250, player.root.position.z - 150) <= 14;
        if (interactButton) interactButton.textContent = activeInterior ? "EXIT" : nearMappedRailBoarding ? "BOARD" : "ENTER";
        if (jumpButton) jumpButton.classList.remove("is-hidden");
        if (vehicleViewButton) vehicleViewButton.classList.add("is-hidden");
      }

      let inputX = interactionState.mode === "on_foot" && passengerState.mode !== "riding" ? touchInput.x : 0;
      let inputZ = interactionState.mode === "on_foot" && passengerState.mode !== "riding" ? touchInput.z : 0;
      if (interactionState.mode === "on_foot" && passengerState.mode !== "riding" && (pressedKeys.has("a") || pressedKeys.has("arrowleft"))) inputX -= 1;
      if (interactionState.mode === "on_foot" && passengerState.mode !== "riding" && (pressedKeys.has("d") || pressedKeys.has("arrowright"))) inputX += 1;
      if (interactionState.mode === "on_foot" && passengerState.mode !== "riding" && (pressedKeys.has("w") || pressedKeys.has("arrowup"))) inputZ += 1;
      if (interactionState.mode === "on_foot" && passengerState.mode !== "riding" && (pressedKeys.has("s") || pressedKeys.has("arrowdown"))) inputZ -= 1;

      const inputLength = Math.hypot(inputX, inputZ);
      if (inputLength > 1) {
        inputX /= inputLength;
        inputZ /= inputLength;
      }

      const forward = new Vector3(-Math.sin(camera.alpha), 0, -Math.cos(camera.alpha));
      const right = new Vector3(-forward.z, 0, forward.x);
      const direction = forward.scale(inputZ).add(right.scale(inputX));
      const moving = interactionState.mode === "on_foot" && passengerState.mode !== "riding" && direction.lengthSquared() > 0.001;

      if (moving) {
        direction.normalize();
        const stepX = direction.x * WORLD_CONFIG.movement.walkSpeed * delta;
        const stepZ = direction.z * WORLD_CONFIG.movement.walkSpeed * delta;
        const nextX = player.root.position.x + stepX;
        const nextZ = player.root.position.z + stepZ;
        if (!isBlocked(nextX, player.root.position.z, solidAreas, WORLD_CONFIG.movement.collisionRadius) && Math.hypot(nextX - vehicleState.x, player.root.position.z - vehicleState.z) >= 2.0 && Math.hypot(nextX - publicTaxiState.x, player.root.position.z - publicTaxiState.z) >= 2.0) player.root.position.x = nextX;
        if (!isBlocked(player.root.position.x, nextZ, solidAreas, WORLD_CONFIG.movement.collisionRadius) && Math.hypot(player.root.position.x - vehicleState.x, nextZ - vehicleState.z) >= 2.0 && Math.hypot(player.root.position.x - publicTaxiState.x, nextZ - publicTaxiState.z) >= 2.0) player.root.position.z = nextZ;
        player.root.rotation.y = Math.atan2(direction.x, direction.z);
        walkClock += delta * 9;
      }

      if (interactionState.mode === "on_foot" && passengerState.mode !== "riding" && jumpRequested && onGround) {
        verticalVelocity = WORLD_CONFIG.movement.jumpVelocity;
        onGround = false;
      }
      jumpRequested = false;
      if (interactionState.mode === "on_foot" && passengerState.mode !== "riding") {
        verticalVelocity -= WORLD_CONFIG.movement.gravity * delta;
        player.root.position.y += verticalVelocity * delta;
      }
      if (interactionState.mode === "on_foot" && passengerState.mode !== "riding" && player.root.position.y <= 0) {
        player.root.position.y = 0;
        verticalVelocity = 0;
        onGround = true;
      }

      if (moving && onGround) {
        const swing = Math.sin(walkClock) * 0.48;
        player.leftLeg.rotation.x = swing;
        player.rightLeg.rotation.x = -swing;
        player.leftArm.rotation.x = -swing * 0.72;
        player.rightArm.rotation.x = swing * 0.72;
      } else {
        player.leftLeg.rotation.x *= 0.82;
        player.rightLeg.rotation.x *= 0.82;
        player.leftArm.rotation.x *= 0.82;
        player.rightArm.rotation.x *= 0.82;
      }

      if (interactionState.mode === "on_foot" && passengerState.mode !== "riding") {
      const target = player.root.position.add(new Vector3(0, 1.25, 0));
      camera.target = Vector3.Lerp(camera.target, target, Math.min(1, delta * 8));
      const boundedPosition = clampToWorld(player.root.position.x, player.root.position.z, {
        minX: WORLD_CONFIG.bounds.playerMinX,
        maxX: WORLD_CONFIG.bounds.playerMaxX,
        minZ: WORLD_CONFIG.bounds.playerMinZ,
        maxZ: WORLD_CONFIG.bounds.playerMaxZ
      });
      player.root.position.x = boundedPosition.x;
      player.root.position.z = boundedPosition.z;
      }
    }

    scene.render();
  };

  document.querySelector<HTMLButtonElement>("#vehicle-brake-button")?.addEventListener("pointerdown", (event) => {
    event.preventDefault(); vehicleBrake = true;
  });
  for (const eventName of ["pointerup", "pointercancel", "lostpointercapture"] as const) {
    document.querySelector<HTMLButtonElement>("#vehicle-brake-button")?.addEventListener(eventName, () => { vehicleBrake = false; });
  }

  // Reveal the game shell before starting the continuous render loop. This
  // keeps the boot-to-menu handoff independent of frame scheduling on slower devices.
  startupHandoffStage = "show_ready_status";
  bootStatus.textContent = "Your world is ready.";
  startupHandoffStage = "hide_boot_screen";
  bootScreen.hidden = true;
  startupHandoffStage = "reveal_game_shell";
  gameShell.hidden = false;
  gameShell.classList.remove("is-hidden");
  startupHandoffStage = "resize_game_engine";
  engine.resize();

  startupHandoffStage = "start_render_loop";
  engine.runRenderLoop(render);
  startupHandoffStage = "startup_complete";
  window.addEventListener("resize", () => engine.resize());

  const openCharacterCreator = (): void => {
    if (!characterPanel || !characterForm) return;
    fillAppearanceForm(characterForm, currentAppearance);
    characterPanel.classList.remove("is-hidden");
    characterPanel.setAttribute("aria-hidden", "false");
  };
  const closeCharacterCreator = (): void => {
    characterPanel?.classList.add("is-hidden");
    characterPanel?.setAttribute("aria-hidden", "true");
  };
  characterButton?.addEventListener("click", openCharacterCreator);
  characterClose?.addEventListener("click", closeCharacterCreator);
  const updateCharacterPreview = (): void => {
    if (!characterForm) return;
    currentAppearance = readAppearanceForm(characterForm);
    player.applyAppearance(currentAppearance);
  };
  characterForm?.addEventListener("input", updateCharacterPreview);
  characterForm?.addEventListener("change", updateCharacterPreview);
  characterForm?.addEventListener("submit", (event: SubmitEvent) => {
    event.preventDefault();
    updateCharacterPreview();
    const savedLocally = saveAppearance(currentAppearance, window.localStorage);
    closeCharacterCreator();
    showNotice(savedLocally
      ? "Appearance saved on this device. Cloud account saving will come later."
      : "Appearance updated for this session, but this browser could not save it.");
    window.setTimeout(() => notice?.classList.remove("is-visible"), 4200);
  });

  playButton?.addEventListener("click", () => {
    closeCharacterCreator();
    hasEnteredWorld = true;
    mainMenu?.classList.add("is-hidden");
    footerBar?.classList.add("is-hidden");
    gameHud?.classList.remove("is-hidden");
    camera.radius = 8;
    camera.target = new Vector3(0, 1.25, 5);
    showNotice("Welcome to AKWANTUO. Explore the streets with WASD or the touch joystick.");
    window.setTimeout(() => notice?.classList.remove("is-visible"), 4200);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      engine.stopRenderLoop();
    } else {
      engine.runRenderLoop(render);
    }
  });
}

start().catch((error: unknown) => {
  console.error("AKWANTUO startup failed at " + startupHandoffStage + ":", error);
  document.documentElement.dataset.startupHandoffStage = startupHandoffStage;
  document.documentElement.dataset.startupHandoffError = error instanceof Error ? error.message : String(error);
  if (bootStatus) {
    bootStatus.textContent = "Unable to start the 3D preview. Please refresh and try again.";
  }
});

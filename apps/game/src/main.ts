import {
  ArcRotateCamera,
  Color3,
  Engine,
  MeshBuilder,
  Scene,
  SceneLoader,
  StandardMaterial,
  TransformNode,
  Vector3
} from "@babylonjs/core";
import "@babylonjs/loaders/glTF";
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
import { advanceWatercraftDynamics, WATERCRAFT_CONFIG, AKWAABA_CAY_WATER_ROUTE, isWatercraftInNavigableSea, type WatercraftKind, type WatercraftDynamicsState } from "./vehicles/watercraftDynamics";
import { PassengerCameraRig } from "./vehicles/passengerCamera";
import { createPublicTransportVehicle } from "./vehicles/publicTransportVehicle";
import { alightPublicTransport, boardPublicTransport, type PublicTransportPassengerState } from "./world/publicTransportOperations";
import { createPlayableRailDemo } from "./world/playableRailDemo";
import { createGreaterAccraMappedRailService } from "./world/mappedRailService";
import { runTransportSmokeChecks } from "./world/transportSmokeChecks";
import { DISTRICT_BUILDINGS } from "./world/ghanaianStreetBuildings";
import { DISTRICT_PROPERTIES } from "./world/districtProperties";
import { DISTRICT_BUSINESSES } from "./world/districtBusinesses";
import { INTERIOR_BLUEPRINTS } from "./world/interiorBlueprints";
import { createInteriorRooms } from "./world/interiorRooms";
import { runStage6SmokeChecks } from "./world/stage6SmokeChecks";
import { AKWAABA_VENUE_PROGRAMME, isVenueProgrammeValid } from "./world/venueProgramme";
import { AKWANTUO_RETAIL_PRODUCTS, isAkwantuoRetailCatalogueValid } from "./world/retailCatalogue";
import { AKWANTUO_PRIVATE_ISLAND, PRIVATE_ISLAND_WATERCRAFT, createAkwantuoPrivateIsland, isPrivateIslandCatalogueValid } from "./world/privateIsland";
import { getAkwantuoSession, loadPlayerProfile, savePlayerProfile, signInAkwantuo, signOutAkwantuo, signUpAkwantuo, loadEconomyState, loadShopProducts, purchaseShopItems, purchaseGameAsset, type AkwantuoSession } from "./services/supabase";

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
const accountButton = document.querySelector<HTMLButtonElement>("#account-button");
const accountPanel = document.querySelector<HTMLElement>("#account-panel");
const accountForm = document.querySelector<HTMLFormElement>("#account-form");
const accountClose = document.querySelector<HTMLButtonElement>("#account-close");
const accountSignUp = document.querySelector<HTMLButtonElement>("#account-signup");
const accountSignOut = document.querySelector<HTMLButtonElement>("#account-signout");
const accountStatus = document.querySelector<HTMLElement>("#account-status");
const accountEmail = document.querySelector<HTMLInputElement>("#account-email");
const accountPassword = document.querySelector<HTMLInputElement>("#account-password");
const accountDisplayName = document.querySelector<HTMLInputElement>("#account-display-name");

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

function advanceWatercraftElapsed(
  config: typeof WATERCRAFT_CONFIG[WatercraftKind],
  state: WatercraftDynamicsState,
  input: { throttle: number; steering: number; brake: number },
  elapsedSeconds: number
): WatercraftDynamicsState {
  let remaining = Math.max(0, Math.min(elapsedSeconds, 1));
  let next = state;
  while (remaining > 0) {
    const step = Math.min(remaining, 0.1);
    next = advanceWatercraftDynamics(config, next, input, step);
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
  setMoving: (moving: boolean) => void;
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

  // Load a real, skinned African character model. The low-cost primitive rig
  // remains only as a startup fallback while the GLB downloads.
  const fallbackMeshes = root.getChildMeshes(false);
  const fallbackPivots = [leftArm, rightArm, leftLeg, rightLeg];
  let activeModelRoots: import("@babylonjs/core").Node[] = [];
  let activeModelSkeletons: import("@babylonjs/core").Skeleton[] = [];
  let locomotionGroups: import("@babylonjs/core").AnimationGroup[] = [];
  let currentLocomotion = "idle";
  let loadGeneration = 0;
  const setMoving = (moving: boolean): void => {
    const next = moving ? "walk" : "idle";
    if (next === currentLocomotion) return;
    currentLocomotion = next;
    const selected = locomotionGroups.find((group) => group.name.toLowerCase() === next);
    if (!selected) return;
    for (const group of locomotionGroups) group.stop();
    selected.start(true);
  };
  const loadCharacterModel = async (appearance: CharacterAppearance): Promise<void> => {
    const generation = ++loadGeneration;
    const file = appearance.presentation === "feminine" ? "akwantuo-female.glb" : "akwantuo-male.glb";
    // Character GLBs are published by the dedicated asset build project.
    // Keep this stable URL separate from the game site so large models do not bloat its deployment.
    const baseUrl = "https://akwantuo-character-assets.vercel.app/";
    try {
      const imported = await SceneLoader.ImportMeshAsync("", baseUrl, file, scene);
      if (generation !== loadGeneration) {
        const staleNodes = [...(imported.transformNodes ?? []), ...imported.meshes];
        staleNodes.filter((node) => !node.parent).forEach((node) => node.dispose(false, true));
        imported.animationGroups.forEach((group) => group.dispose());
        imported.skeletons.forEach((skeleton) => skeleton.dispose());
        return;
      }

      // The character meshes and the locomotion clips are separate CC0 GLBs.
      // Retarget each clip by bone/transform-node name onto this character's rig.
      const modelNodes = new Map<string, import("@babylonjs/core").Node>();
      for (const node of [...(imported.transformNodes ?? []), ...imported.meshes]) {
        if (!modelNodes.has(node.name)) modelNodes.set(node.name, node);
      }
      // Ara character GLBs can carry their own embedded animation groups.
      // Prefer those clips: they are already bound to this exact skeleton and need
      // no cross-file retargeting. Keep the older separate-GLB path as a fallback.
      const embeddedIdle = imported.animationGroups.some((group) => group.name.toLowerCase() === "idle");
      const embeddedWalk = imported.animationGroups.some((group) => group.name.toLowerCase() === "walk");
      const animationSpecs = [
        ...(!embeddedIdle ? [{ file: "idle.glb", name: "idle" }] : []),
        ...(!embeddedWalk ? [{ file: "walk.glb", name: "walk" }] : [])
      ] as const;
      const retargetedGroups: import("@babylonjs/core").AnimationGroup[] = [];
      for (const spec of animationSpecs) {
        try {
          const source = await SceneLoader.ImportMeshAsync("", baseUrl, spec.file, scene);
          const sourceGroup = source.animationGroups[0];
          if (sourceGroup) {
            const cloned = sourceGroup.clone(
              spec.name,
              (target) => modelNodes.get(target.name) ?? null
            );
            if (cloned) retargetedGroups.push(cloned);
          }
          source.animationGroups.forEach((group) => group.dispose());
          const sourceNodes = [...(source.transformNodes ?? []), ...source.meshes];
          sourceNodes.filter((node) => !node.parent).forEach((node) => node.dispose(false, true));
          source.skeletons.forEach((skeleton) => skeleton.dispose());
        } catch (animationError) {
          console.warn(`AKWANTUO ${spec.name} animation could not be loaded:`, animationError);
        }
      }

      if (generation !== loadGeneration) {
        retargetedGroups.forEach((group) => group.dispose());
        const staleNodes = [...(imported.transformNodes ?? []), ...imported.meshes];
        staleNodes.filter((node) => !node.parent).forEach((node) => node.dispose(false, true));
        imported.animationGroups.forEach((group) => group.dispose());
        imported.skeletons.forEach((skeleton) => skeleton.dispose());
        return;
      }

      // Keep the previous model visible until the replacement and its clips load.
      for (const group of locomotionGroups) group.stop();
      for (const group of locomotionGroups) group.dispose();
      activeModelSkeletons.forEach((skeleton) => skeleton.dispose());
      activeModelRoots.forEach((node) => node.dispose(false, true));
      activeModelRoots = [];
      const importedNodes = [...(imported.transformNodes ?? []), ...imported.meshes];
      activeModelRoots = importedNodes.filter((node) => !node.parent);
      activeModelRoots.forEach((node) => { node.parent = root; });
      for (const mesh of imported.meshes) {
        mesh.isPickable = false;
        mesh.receiveShadows = true;
      }
      activeModelSkeletons = imported.skeletons;
      fallbackMeshes.forEach((mesh) => mesh.setEnabled(false));
      fallbackPivots.forEach((pivot) => pivot.setEnabled(false));
      locomotionGroups = [...imported.animationGroups, ...retargetedGroups];
      const selected = locomotionGroups.find((group) => group.name.toLowerCase() === currentLocomotion)
        ?? locomotionGroups.find((group) => group.name.toLowerCase() === "idle");
      if (selected) selected.start(true);
      const walk = locomotionGroups.find((group) => group.name.toLowerCase() === "walk");
      if (!walk) showNotice("3D character loaded, but its walking animation could not be connected.");
      document.documentElement.dataset.akwantuoCharacterModel = file;
      document.documentElement.dataset.akwantuoCharacterAnimations = String(locomotionGroups.length);
    } catch (error) {
      console.error("AKWANTUO character GLB failed to load:", error);
      document.documentElement.dataset.akwantuoCharacterModel = "fallback";
      showNotice("The 3D character could not load. Check your connection and retry.");
    }
  };
  void loadCharacterModel(initialAppearance);
  const originalApplyAppearance = applyAppearance;
  const applyModelAppearance = (appearance: CharacterAppearance): void => {
    originalApplyAppearance(appearance);
    const expected = appearance.presentation === "feminine" ? "akwantuo-female.glb" : "akwantuo-male.glb";
    if (document.documentElement.dataset.akwantuoCharacterModel !== expected) void loadCharacterModel(appearance);
  };
  return { root, leftArm, rightArm, leftLeg, rightLeg, applyAppearance: applyModelAppearance, setMoving };
}

function installTouchControls(): void {
  if (!joystick || !joystickStick) return;

  // Read layout once at the start of a touch. Pointer-move events only store
  // coordinates; visual/input updates are coalesced to one animation frame.
  let centreX = 0;
  let centreY = 0;
  let maxTravel = 1;
  let latestX = 0;
  let latestY = 0;
  let framePending = false;
  let activePointerId: number | null = null;

  const applyLatestPosition = (): void => {
    framePending = false;
    if (activePointerId === null) return;

    const dx = latestX - centreX;
    const dy = latestY - centreY;
    const distance = Math.hypot(dx, dy);
    const scale = distance > maxTravel ? maxTravel / distance : 1;
    const x = dx * scale;
    const y = dy * scale;

    touchInput.x = x / maxTravel;
    touchInput.z = -y / maxTravel;
    joystickStick.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  };

  const queuePosition = (event: PointerEvent): void => {
    latestX = event.clientX;
    latestY = event.clientY;
    if (framePending) return;
    framePending = true;
    requestAnimationFrame(applyLatestPosition);
  };

  const resetStick = (): void => {
    activePointerId = null;
    touchInput.x = 0;
    touchInput.z = 0;
    joystickStick.style.transform = "translate3d(0, 0, 0)";
  };

  joystick.addEventListener("pointerdown", (event: PointerEvent) => {
    event.preventDefault();
    activePointerId = event.pointerId;
    const bounds = joystick.getBoundingClientRect();
    centreX = bounds.left + bounds.width / 2;
    centreY = bounds.top + bounds.height / 2;
    maxTravel = Math.max(1, bounds.width * 0.31);
    joystick.setPointerCapture(event.pointerId);
    queuePosition(event);
  });

  joystick.addEventListener("pointermove", (event: PointerEvent) => {
    if (event.pointerId === activePointerId) queuePosition(event);
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
  runStage6SmokeChecks();
  if (!isVenueProgrammeValid()) throw new Error("Akwaaba Creative Arts Centre weekly programme failed validation.");
  if (!isAkwantuoRetailCatalogueValid()) throw new Error("Akwantuo convenience-store product catalogue failed validation.");
  if (!isPrivateIslandCatalogueValid()) throw new Error("Akwaaba Cay private-island catalogue failed validation.");
  document.documentElement.dataset.akwantuoBuildingCount = String(DISTRICT_BUILDINGS.length);
  document.documentElement.dataset.akwantuoBuildingDistrictCount = String(new Set(DISTRICT_BUILDINGS.map((building) => building.districtId)).size);
  document.documentElement.dataset.akwantuoPropertyCount = String(DISTRICT_PROPERTIES.length);
  document.documentElement.dataset.akwantuoBusinessCount = String(DISTRICT_BUSINESSES.length);
  document.documentElement.dataset.akwantuoVenueProgrammeCount = String(AKWAABA_VENUE_PROGRAMME.length);
  document.documentElement.dataset.akwantuoRetailProductCount = String(AKWANTUO_RETAIL_PRODUCTS.length);
  document.documentElement.dataset.akwantuoPrivateIslandName = AKWANTUO_PRIVATE_ISLAND.name;
  document.documentElement.dataset.akwantuoPrivateIslandPrice = String(AKWANTUO_PRIVATE_ISLAND.purchasePricePesewas);
  document.documentElement.dataset.akwantuoPrivateIslandWatercraftCount = String(PRIVATE_ISLAND_WATERCRAFT.length);
  document.documentElement.dataset.akwantuoInteriorBlueprintCount = String(INTERIOR_BLUEPRINTS.length);
  document.documentElement.dataset.akwantuoStage6Checks = "passed";
  document.documentElement.dataset.akwantuoBuildingInteriorLinkCount = String(DISTRICT_BUILDINGS.filter((building) => building.interiorId).length);

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
  document.documentElement.dataset.akwantuoStoreCollisionCount = String(interiorRooms.find((room) => room.id === "convenience-store")?.solidAreas.length ?? 0);
  const convenienceStoreBlueprint = INTERIOR_BLUEPRINTS.find((blueprint) => blueprint.id === "convenience-store");
  document.documentElement.dataset.akwantuoStoreFridgeCount = String(
    convenienceStoreBlueprint?.fixtures.filter((fixture) => fixture.type === "refrigerator").length ?? 0
  );
  document.documentElement.dataset.akwantuoStoreSnackRackCount = String(
    convenienceStoreBlueprint?.fixtures.filter((fixture) => fixture.type === "snack_rack").length ?? 0
  );
  document.documentElement.dataset.akwantuoStoreShopkeeperRig =
    String(!!scene.getMeshByName("shopkeeper-head") && !!scene.getMeshByName("shopkeeper-arm--1") && !!scene.getMeshByName("shopkeeper-arm-1"));
  for (const room of interiorRooms) solidAreas.push(...room.solidAreas);
  const privateIslandMeshCount = createAkwantuoPrivateIsland(scene);
  document.documentElement.dataset.akwantuoPrivateIslandMeshCount = String(privateIslandMeshCount);
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
  let activeAccountSession: AkwantuoSession | null = await getAkwantuoSession();
  let currentAppearance = loadAppearance(window.localStorage);
  let walletBalancePesewas = 0;
  let ownedGameAssetIds = new Set<string>();
  let shopStockById = new Map<string, number>();
  if (activeAccountSession) {
    try {
      const cloudProfile = await loadPlayerProfile(activeAccountSession);
      if (cloudProfile?.look) currentAppearance = resolveAppearance(cloudProfile.look);
      const economy = await loadEconomyState(activeAccountSession);
      walletBalancePesewas = economy.wallet?.balance_pesewas ?? 0;
      ownedGameAssetIds = new Set(economy.owned_assets.map((asset) => asset.asset_id));
      document.documentElement.dataset.akwantuoWalletPesewas = String(walletBalancePesewas);
      document.documentElement.dataset.akwantuoOwnedAssetCount = String(ownedGameAssetIds.size);
      const shopProducts = await loadShopProducts(activeAccountSession);
      shopStockById = new Map(shopProducts.map((item) => [item.product_id, item.stock_quantity]));
      if (accountStatus) accountStatus.textContent = `Signed in as ${activeAccountSession.user.email || "AKWANTUO player"}. Cloud saves are enabled.`;
      if (accountSignOut) accountSignOut.classList.remove("is-hidden");
      if (accountButton) accountButton.innerHTML = "ACCOUNT <small>CONNECTED</small>";
    } catch (error) {
      console.warn("AKWANTUO cloud profile could not be loaded:", error);
    }
  }
  const player = createPlayer(scene, currentAppearance);
  const mainlandMarina = { x: 2700, z: -3380 };
  let activeInterior: { buildingId: string; roomId: string; exitX: number; exitZ: number } | null = null;
  // Shop checkout and premium asset ownership are committed server-side.
  let venueInterestCount = 0;
  let selectedBusinessServiceIndex = 0;
  let retailBrowseIndex = 0;
  const retailBasket = new Map<string, number>();
  let selectedShopProductIndex = 0;
  const stage6ActionPanel = document.createElement("div");
  stage6ActionPanel.id = "stage6-action-panel";
  stage6ActionPanel.hidden = true;
  Object.assign(stage6ActionPanel.style, {
    position: "fixed", left: "50%", bottom: "104px", transform: "translateX(-50%)",
    zIndex: "30", flexWrap: "wrap", justifyContent: "center",
    gap: "8px", width: "min(94vw, 620px)", padding: "10px", display: "none",
    borderRadius: "14px", background: "rgba(10, 18, 24, 0.92)",
    border: "1px solid rgba(255,255,255,0.22)", boxSizing: "border-box"
  });
  const makeStage6Button = (id: string, label: string): HTMLButtonElement => {
    const button = document.createElement("button");
    button.id = id;
    button.type = "button";
    button.textContent = label;
    Object.assign(button.style, {
      minHeight: "42px", padding: "9px 14px", borderRadius: "9px",
      border: "1px solid rgba(255,255,255,0.35)", color: "#fff",
      background: "#24545a", font: "600 13px system-ui", cursor: "pointer"
    });
    stage6ActionPanel.append(button);
    return button;
  };
  const serviceActionButton = makeStage6Button("stage6-service-action", "Use a service");
  const propertyActionButton = makeStage6Button("stage6-property-action", "Property information");
  const retailBrowseButton = makeStage6Button("stage6-retail-browse", "Browse store products");
  const retailBasketButton = makeStage6Button("stage6-retail-basket", "Add selected item");
  const retailCheckoutButton = makeStage6Button("stage6-retail-checkout", "Checkout basket");
  const shopkeeperTalkButton = makeStage6Button("stage6-shopkeeper-talk", "Talk to shopkeeper");
  const premiumAssetsButton = makeStage6Button("stage6-premium-assets", "Browse island & boats");
  const premiumPurchaseButton = makeStage6Button("stage6-premium-purchase", "Purchase selected asset");
  let premiumAssetIndex = 0;
  const venueActionButton = makeStage6Button("stage6-venue-action", "Join event interest list");
  document.body.append(stage6ActionPanel);
  const refreshStage6Actions = (): void => {
    const buildingId = activeInterior?.buildingId;
    const business = buildingId ? DISTRICT_BUSINESSES.find((item) => item.buildingId === buildingId) : undefined;
    serviceActionButton.hidden = !business;
    const isConvenienceStore = buildingId === "osu-corner-mart" || buildingId === "akwaaba-provisions";
    retailBrowseButton.hidden = !isConvenienceStore;
    retailBasketButton.hidden = !isConvenienceStore;
    retailCheckoutButton.hidden = !isConvenienceStore;
    shopkeeperTalkButton.hidden = !isConvenienceStore;
    premiumAssetsButton.hidden = buildingId !== "district-office";
    premiumPurchaseButton.hidden = buildingId !== "district-office";
    venueActionButton.hidden = buildingId !== "akwaaba-creative-arts-centre";
    propertyActionButton.hidden = !buildingId;
    stage6ActionPanel.hidden = !buildingId;
    stage6ActionPanel.style.display = buildingId ? "flex" : "none";
  };
  serviceActionButton.addEventListener("click", () => {
    if (!activeInterior) return;
    const business = DISTRICT_BUSINESSES.find((item) => item.buildingId === activeInterior?.buildingId);
    if (!business?.services.length) return;
    const service = business.services[selectedBusinessServiceIndex % business.services.length];
    selectedBusinessServiceIndex += 1;
    document.documentElement.dataset.stage6ServiceSelections = String(selectedBusinessServiceIndex);
    showNotice("Selected service at " + business.displayName + ": " + service + ". This is a service preview; no payment or transaction has been made.");
  });
  const refreshPlayerEconomy = async (): Promise<void> => {
    if (!activeAccountSession) return;
    const [economy, products] = await Promise.all([
      loadEconomyState(activeAccountSession),
      loadShopProducts(activeAccountSession)
    ]);
    walletBalancePesewas = economy.wallet?.balance_pesewas ?? 0;
    ownedGameAssetIds = new Set(economy.owned_assets.map((asset) => asset.asset_id));
    shopStockById = new Map(products.map((item) => [item.product_id, item.stock_quantity]));
    document.documentElement.dataset.akwantuoWalletPesewas = String(walletBalancePesewas);
    document.documentElement.dataset.akwantuoOwnedAssetCount = String(ownedGameAssetIds.size);
    document.documentElement.dataset.akwantuoInventoryItemCount = String(economy.inventory.reduce((sum, item) => sum + item.quantity, 0));
  };
  retailBrowseButton.addEventListener("click", () => {
    if (activeInterior?.roomId !== "convenience-store") return;
    const visible = AKWANTUO_RETAIL_PRODUCTS.slice(retailBrowseIndex, retailBrowseIndex + 4);
    if (visible.length < 4) retailBrowseIndex = 0;
    else retailBrowseIndex += 4;
    selectedShopProductIndex = (retailBrowseIndex + AKWANTUO_RETAIL_PRODUCTS.length - 4) % AKWANTUO_RETAIL_PRODUCTS.length;
    const items = visible.map((item) => item.name + " (GH₵" + (item.pricePesewas / 100).toFixed(2) +
      "; stock " + (shopStockById.get(item.id) ?? "sign in") + ")").join(", ");
    showNotice('Shopkeeper: "Welcome! Take a look at today\'s goods." Shelves: ' + items +
      '. The first item in this group is selected; use Add selected item to put it in your basket.');
    document.documentElement.dataset.stage6RetailBrowseCount =
      String(Number(document.documentElement.dataset.stage6RetailBrowseCount ?? 0) + 1);
  });
  retailBasketButton.addEventListener("click", () => {
    if (activeInterior?.roomId !== "convenience-store") return;
    const item = AKWANTUO_RETAIL_PRODUCTS[selectedShopProductIndex];
    retailBasket.set(item.id, (retailBasket.get(item.id) ?? 0) + 1);
    const count = [...retailBasket.values()].reduce((sum, quantity) => sum + quantity, 0);
    document.documentElement.dataset.stage6RetailBasketCount = String(count);
    showNotice('Shopkeeper: "One ' + item.name + ' added. Anything else?" Basket: ' + count + ' item(s).');
  });
  shopkeeperTalkButton.addEventListener("click", () => {
    if (activeInterior?.roomId !== "convenience-store") return;
    const selectedItem = AKWANTUO_RETAIL_PRODUCTS[selectedShopProductIndex];
    const basketCount = [...retailBasket.values()].reduce((sum, quantity) => sum + quantity, 0);
    const basketTotal = [...retailBasket.entries()].reduce((sum, [id, quantity]) => {
      const product = AKWANTUO_RETAIL_PRODUCTS.find((item) => item.id === id);
      return sum + (product?.pricePesewas ?? 0) * quantity;
    }, 0);
    const lines = [
      'Shopkeeper: "Akwaaba! Welcome in. Cold drinks are in the fridges and snacks are on the racks."',
      'Shopkeeper: "You can browse the shelves, add what you need, then pay at the counter."',
      'Shopkeeper: "The selected item is ' + selectedItem.name + '. Check the price and stock before adding it."',
      'Shopkeeper: "Your basket has ' + basketCount + ' item(s), worth GH₵' + (basketTotal / 100).toFixed(2) + '."',
      'Shopkeeper: "Your AKWANTUO wallet balance is GH₵' + (walletBalancePesewas / 100).toFixed(2) + '. I will not take payment until you check out."',
      'Shopkeeper: "When you are ready, use Checkout basket. You will receive a receipt and your items will go into your inventory."'
    ];
    const index = Number(document.documentElement.dataset.stage6ShopkeeperDialogue ?? 0) % lines.length;
    document.documentElement.dataset.stage6ShopkeeperDialogue = String(index + 1);
    showNotice(lines[index]);
  });
  retailCheckoutButton.addEventListener("click", async () => {
    if (activeInterior?.roomId !== "convenience-store") return;
    if (!activeAccountSession) {
      showNotice("Please sign in to your AKWANTUO account before paying. Your basket is still on this device.");
      accountPanel?.classList.remove("is-hidden");
      accountPanel?.setAttribute("aria-hidden", "false");
      return;
    }
    const items = [...retailBasket.entries()].map(([product_id, quantity]) => ({ product_id, quantity }));
    if (!items.length) {
      showNotice("Your basket is empty. Browse the shelves and add an item first.");
      return;
    }
    retailCheckoutButton.disabled = true;
    retailCheckoutButton.textContent = "Processing…";
    try {
      const receipt = await purchaseShopItems(activeAccountSession, items);
      retailBasket.clear();
      await refreshPlayerEconomy();
      document.documentElement.dataset.stage6RetailCheckoutCount =
        String(Number(document.documentElement.dataset.stage6RetailCheckoutCount ?? 0) + 1);
      showNotice('Shopkeeper: "Medaase! Payment complete. Receipt #' + receipt.transaction_id + ". Total GH₵" +
        (receipt.total_pesewas / 100).toFixed(2) + ". Wallet balance GH₵" +
        (receipt.balance_pesewas / 100).toFixed(2) + ". Stock and inventory have been updated in AKWANTUO.");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Checkout failed. No payment was taken.");
    } finally {
      retailCheckoutButton.disabled = false;
      retailCheckoutButton.textContent = "Checkout basket";
    }
  });
  premiumAssetsButton.addEventListener("click", () => {
    if (activeInterior?.buildingId !== "district-office") return;
    const asset = [
      { id: AKWANTUO_PRIVATE_ISLAND.id, name: AKWANTUO_PRIVATE_ISLAND.name, price: AKWANTUO_PRIVATE_ISLAND.purchasePricePesewas, label: AKWANTUO_PRIVATE_ISLAND.purchasePriceLabel },
      ...PRIVATE_ISLAND_WATERCRAFT.map((item) => ({ id: item.id, name: item.name, price: item.pricePesewas, label: item.label }))
    ][premiumAssetIndex % (PRIVATE_ISLAND_WATERCRAFT.length + 1)];
    premiumAssetIndex = (premiumAssetIndex + 1) % (PRIVATE_ISLAND_WATERCRAFT.length + 1);
    document.documentElement.dataset.stage6PremiumListingViews =
      String(Number(document.documentElement.dataset.stage6PremiumListingViews ?? 0) + 1);
    const owned = ownedGameAssetIds.has(asset.id);
    const fullListing = [AKWANTUO_PRIVATE_ISLAND.name + " — " + AKWANTUO_PRIVATE_ISLAND.purchasePriceLabel,
      ...PRIVATE_ISLAND_WATERCRAFT.map((item) => item.name + " — " + item.label)].join("; ");
    showNotice("Premium listings: " + fullListing + ". Selected: " + asset.name + " — " + asset.label +
      ". " + (owned ? "You already own this asset." : "Selected for purchase. ") +
      "Wallet: GH₵" + (walletBalancePesewas / 100).toFixed(2) + ". Use Purchase selected asset to complete a secure transaction.");
    document.documentElement.dataset.akwantuoSelectedAssetId = asset.id;
  });
  premiumPurchaseButton.addEventListener("click", async () => {
    if (activeInterior?.buildingId !== "district-office") return;
    if (!activeAccountSession) {
      showNotice("Sign in to AKWANTUO to purchase and save property or watercraft ownership.");
      accountPanel?.classList.remove("is-hidden");
      accountPanel?.setAttribute("aria-hidden", "false");
      return;
    }
    const assetId = document.documentElement.dataset.akwantuoSelectedAssetId;
    if (!assetId) {
      showNotice("Browse the island and watercraft listings first, then select an asset to purchase.");
      return;
    }
    if (ownedGameAssetIds.has(assetId)) {
      showNotice("This asset is already registered to your AKWANTUO account.");
      return;
    }
    premiumPurchaseButton.disabled = true;
    premiumPurchaseButton.textContent = "Processing…";
    try {
      const receipt = await purchaseGameAsset(activeAccountSession, assetId);
      await refreshPlayerEconomy();
      document.documentElement.dataset.stage6AssetPurchaseCount =
        String(Number(document.documentElement.dataset.stage6AssetPurchaseCount ?? 0) + 1);
      showNotice("Purchase complete: " + receipt.name + ". GH₵" +
        (receipt.price_pesewas / 100).toFixed(2) + " paid. Ownership is now saved to your AKWANTUO account.");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Purchase failed. No money was taken.");
    } finally {
      premiumPurchaseButton.disabled = false;
      premiumPurchaseButton.textContent = "Purchase selected asset";
    }
  });
  propertyActionButton.addEventListener("click", () => {
    if (!activeInterior) return;
    const property = DISTRICT_PROPERTIES.find((item) => item.buildingId === activeInterior?.buildingId);
    if (!property) return;
    document.documentElement.dataset.stage6PropertyInspections =
      String(Number(document.documentElement.dataset.stage6PropertyInspections ?? 0) + 1);
    showNotice("Property information: " + property.displayName + ". Use: " + property.use.replaceAll("_", " ") +
      ". Occupancy: " + property.occupancy + ". Player purchase or rental is not enabled in this stage.");
  });
  venueActionButton.addEventListener("click", () => {
    if (activeInterior?.buildingId !== "akwaaba-creative-arts-centre") return;
    const event = AKWAABA_VENUE_PROGRAMME[venueInterestCount % AKWAABA_VENUE_PROGRAMME.length];
    venueInterestCount += 1;
    document.documentElement.dataset.stage6VenueInterestCount = String(venueInterestCount);
    showNotice("Interest noted for " + event.title + " (" + event.day + " at " + event.start + "). This is a local session preview, not a saved booking or confirmed audition.");
  });
  const isLocalTransportTestHost = window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "localhost";
  const transportRailTestMode = isLocalTransportTestHost &&
    new URLSearchParams(window.location.search).get("akwantuoTransportTest") === "rail";
  const interiorTestBuildingId = new URLSearchParams(window.location.search).get("akwantuoInteriorTest") ?? "";
  const interiorTestMode = isLocalTransportTestHost && interiorTestBuildingId.length > 0;
  const islandTestMode = isLocalTransportTestHost && new URLSearchParams(window.location.search).get("akwantuoIslandTest") === "1";
  const watercraftTestKind = new URLSearchParams(window.location.search).get("akwantuoWatercraftTest");
  const watercraftTestMode = isLocalTransportTestHost &&
    (watercraftTestKind === "speedboat" || watercraftTestKind === "jet_ski");
  if (transportRailTestMode) {
    // Local-only browser-test spawn; never active on a deployed game host.
    player.root.position.set(-250, 0, 150);
    document.documentElement.dataset.transportTestMode = "rail";
  } else if (islandTestMode) {
    player.root.position.set(AKWANTUO_PRIVATE_ISLAND.position.x, 0, AKWANTUO_PRIVATE_ISLAND.position.z + 95);
    document.documentElement.dataset.islandTestMode = "true";
  } else if (watercraftTestMode) {
    player.root.position.set(watercraftTestKind === "jet_ski" ? mainlandMarina.x + 8 : mainlandMarina.x,
      0, mainlandMarina.z + 24);
    document.documentElement.dataset.watercraftTestMode = watercraftTestKind ?? "";
  } else if (interiorTestMode) {
    // Local-only spawn outside a selected catalogued building for entry/exit verification.
    const testBuilding = DISTRICT_BUILDINGS.find((building) => building.id === interiorTestBuildingId);
    if (!testBuilding?.interiorId) throw new Error("Interior test building is missing or has no linked room: " + interiorTestBuildingId);
    const frontX = testBuilding.side === "west"
      ? testBuilding.x + testBuilding.width / 2
      : testBuilding.x - testBuilding.width / 2;
    const exitX = frontX + (testBuilding.side === "west" ? 1.4 : -1.4);
    player.root.position.set(exitX, 0, testBuilding.z);
    document.documentElement.dataset.interiorTestMode = testBuilding.id;
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
  const vehicleOrigin = { x: WORLD_CONFIG.spawn.x - 6, y: 0, z: WORLD_CONFIG.spawn.z };
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
  const watercraftHullMaterial = new StandardMaterial("akwantuo-marina-watercraft-hull", scene);
  watercraftHullMaterial.diffuseColor = new Color3(0.83, 0.86, 0.84);
  const watercraftTrimMaterial = new StandardMaterial("akwantuo-marina-watercraft-trim", scene);
  watercraftTrimMaterial.diffuseColor = new Color3(0.09, 0.22, 0.29);
  const watercraftSeatMaterial = new StandardMaterial("akwantuo-marina-watercraft-seat", scene);
  watercraftSeatMaterial.diffuseColor = new Color3(0.68, 0.32, 0.12);
  const windowMaterialForWatercraft = new StandardMaterial("akwantuo-marina-watercraft-glass", scene);
  windowMaterialForWatercraft.diffuseColor = new Color3(0.18, 0.48, 0.58);
  windowMaterialForWatercraft.alpha = 0.72;
  const createMarinaCraft = (kind: WatercraftKind, x: number, z: number): {
    root: TransformNode; interior: TransformNode; exterior: TransformNode;
  } => {
    const root = new TransformNode("akwantuo-marina-" + kind, scene);
    root.position.set(x, 0, z);
    root.rotation.y = Math.atan2(4445, -1100);
    const hull = MeshBuilder.CreateSphere("akwantuo-marina-" + kind + "-hull", { diameter: 1, segments: 20 }, scene);
    hull.scaling.set(kind === "speedboat" ? 4.5 : 1.55, 0.78, kind === "speedboat" ? 12 : 4.8);
    hull.position.y = 0.55;
    hull.parent = root;
    hull.material = watercraftHullMaterial;
    hull.isPickable = false;
    const deck = MeshBuilder.CreateBox("akwantuo-marina-" + kind + "-deck", {
      width: kind === "speedboat" ? 4.2 : 1.15, height: 0.32, depth: kind === "speedboat" ? 7.4 : 2.1
    }, scene);
    deck.position.y = 0.92;
    deck.parent = root;
    deck.material = watercraftTrimMaterial;
    deck.isPickable = false;
    const seat = MeshBuilder.CreateBox("akwantuo-marina-" + kind + "-seat", {
      width: kind === "speedboat" ? 1.9 : 0.72, height: 0.48, depth: kind === "speedboat" ? 1.5 : 1.45
    }, scene);
    seat.position.set(0, 1.22, 0.25);
    seat.parent = root;
    seat.material = watercraftSeatMaterial;
    seat.isPickable = false;
    if (kind === "speedboat") {
      const cabin = MeshBuilder.CreateBox("akwantuo-marina-speedboat-console", { width: 2.5, height: 1.5, depth: 2.1 }, scene);
      cabin.position.set(0, 1.6, -2.0);
      cabin.parent = root;
      cabin.material = watercraftTrimMaterial;
      cabin.isPickable = false;
      const windscreen = MeshBuilder.CreateBox("akwantuo-marina-speedboat-windscreen", { width: 2.3, height: 1.05, depth: 0.08 }, scene);
      windscreen.position.set(0, 2.35, -0.85);
      windscreen.parent = root;
      windscreen.material = windowMaterialForWatercraft;
      windscreen.isPickable = false;
    } else {
      const handle = MeshBuilder.CreateCylinder("akwantuo-marina-jetski-handle", { height: 1.2, diameter: 0.08, tessellation: 10 }, scene);
      handle.position.set(0, 1.65, -1.5);
      handle.rotation.z = Math.PI / 2;
      handle.parent = root;
      handle.material = watercraftTrimMaterial;
      handle.isPickable = false;
    }
    const interior = new TransformNode("akwantuo-marina-" + kind + "-interior-camera", scene);
    interior.position.set(0, 1.55, 0.45);
    interior.parent = root;
    const exterior = new TransformNode("akwantuo-marina-" + kind + "-exterior-camera", scene);
    exterior.position.set(0, 3.8, -8.5);
    exterior.parent = root;
    return { root, interior, exterior };
  };
  const islandMarina = { x: AKWANTUO_PRIVATE_ISLAND.position.x + 145, z: AKWANTUO_PRIVATE_ISLAND.position.z + 85 };
  const mainlandDock = MeshBuilder.CreateBox("akwantuo-labadi-marina-dock", { width: 30, height: 1.4, depth: 190 }, scene);
  mainlandDock.position.set(mainlandMarina.x, 0.35, -3275);
  mainlandDock.material = watercraftTrimMaterial;
  mainlandDock.isPickable = false;
  const dockSign = MeshBuilder.CreateBox("akwantuo-labadi-marina-sign", { width: 12, height: 3, depth: 0.45 }, scene);
  dockSign.position.set(mainlandMarina.x, 3, -3182);
  dockSign.material = watercraftSeatMaterial;
  dockSign.isPickable = false;
  const waterRouteBuoyMaterial = new StandardMaterial("akwantuo-cay-route-buoy-material", scene);
  waterRouteBuoyMaterial.diffuseColor = new Color3(0.96, 0.66, 0.16);
  for (let index = 1; index < AKWAABA_CAY_WATER_ROUTE.length - 1; index += 1) {
    const waypoint = AKWAABA_CAY_WATER_ROUTE[index];
    const buoy = MeshBuilder.CreateCylinder("akwantuo-cay-route-buoy-" + index, { height: 2.4, diameter: 1.1, tessellation: 10 }, scene);
    buoy.position.set(waypoint.x, 1.2, waypoint.z);
    buoy.material = waterRouteBuoyMaterial;
    buoy.isPickable = false;
  }
  const marinaWatercraft = {
    speedboat: createMarinaCraft("speedboat", mainlandMarina.x, mainlandMarina.z),
    jet_ski: createMarinaCraft("jet_ski", mainlandMarina.x + 8, mainlandMarina.z + 1)
  };
  const findNearestMarinaCraft = (): { kind: WatercraftKind; craft: typeof marinaWatercraft.speedboat; distanceM: number } =>
    (["speedboat", "jet_ski"] as const).map((kind) => ({
      kind,
      craft: marinaWatercraft[kind],
      distanceM: Math.hypot(player.root.position.x - marinaWatercraft[kind].root.position.x,
        player.root.position.z - marinaWatercraft[kind].root.position.z)
    })).sort((a, b) => a.distanceM - b.distanceM)[0];
  document.documentElement.dataset.akwantuoWatercraftCount = "2";
  document.documentElement.dataset.akwantuoWaterRouteWaypointCount = String(AKWAABA_CAY_WATER_ROUTE.length);

  const publicTaxiOrigin = { x: WORLD_CONFIG.spawn.x + 2.8, y: 0, z: WORLD_CONFIG.spawn.z };
  const publicTaxi = createPublicTransportVehicle(scene, "playable-shared-trotro", publicTaxiOrigin);
  let publicTaxiState: RoadVehicleDynamicsState = { x: publicTaxiOrigin.x, z: publicTaxiOrigin.z, headingRadians: Math.PI, speedMps: 0 };
  // One local wallet and one passenger session are shared across every public mode.
  let passengerState: PublicTransportPassengerState = { mode: "not_riding", balancePesewas: 10000 };
  let railPassengerCameraRig: PassengerCameraRig | null = null;
  let publicRideArrived = false;
  const publicRideEndZ = WORLD_CONFIG.spawn.z - 45;
  let vehicleState: RoadVehicleDynamicsState = {
    x: vehicleOrigin.x, z: vehicleOrigin.z, headingRadians: 0, speedMps: 0
  };
  let interactionState: VehicleInteractionState = { mode: "on_foot" };
  let watercraftMode = false;
  let activeWatercraftKind: WatercraftKind | null = null;
  let watercraftState: WatercraftDynamicsState = {
    x: mainlandMarina.x, z: mainlandMarina.z, headingRadians: Math.atan2(4445, -1100), speedMps: 0
  };
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
    new Vector3(WORLD_CONFIG.spawn.x, 1.2, WORLD_CONFIG.spawn.z),
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
    if (key === "c" && hasEnteredWorld && (interactionState.mode === "inside_vehicle" || passengerState.mode === "riding" || watercraftMode)) vehicleViewRequested = true;
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
        if (watercraftMode && activeWatercraftKind) {
          const mainlandDistance = Math.hypot(watercraftState.x - mainlandMarina.x, watercraftState.z - mainlandMarina.z);
          const islandDistance = Math.hypot(watercraftState.x - islandMarina.x, watercraftState.z - islandMarina.z);
          const atMainlandDock = mainlandDistance <= 38;
          const atIslandDock = islandDistance <= 45;
          if (Math.abs(watercraftState.speedMps) > 0.5) {
            showNotice("Slow down and stop at the marina before leaving your watercraft.");
          } else if (!atMainlandDock && !atIslandDock) {
            showNotice("You are offshore. Follow the marked buoys to Labadi Marina or Akwaaba Cay to disembark safely.");
          } else if (atIslandDock && !ownedGameAssetIds.has("akwaaba-cay")) {
            showNotice("Akwaaba Cay is private property. You can view the listing at the district office, but only its registered owner may come ashore.");
          } else {
            const exitPoint = atMainlandDock ? mainlandMarina : islandMarina;
            player.root.position.set(exitPoint.x + 3, 0, exitPoint.z + (atMainlandDock ? 20 : 10));
            player.root.setEnabled(true);
            watercraftMode = false;
            activeWatercraftKind = null;
            passengerCameraRig?.dispose();
            passengerCameraRig = null;
            showNotice(atMainlandDock
              ? "You are back at Labadi Marina. Your watercraft remains at the dock."
              : "Welcome to Akwaaba Cay. Your ownership has been verified against your AKWANTUO account.");
          }
        } else if (activeInterior) {
          const room = interiorRooms.find((item) => item.id === activeInterior?.roomId);
          room?.root.setEnabled(false);
          player.root.position.set(activeInterior.exitX, 0, activeInterior.exitZ);
          activeInterior = null;
          refreshStage6Actions();
          document.documentElement.dataset.activeInteriorId = "";
          document.documentElement.dataset.activeBusinessId = "";
          document.documentElement.dataset.activeBusinessServiceCount = "0";
          showNotice("You stepped back outside.");
        } else if (interactionState.mode === "on_foot" && passengerState.mode === "not_riding" &&
          DISTRICT_BUILDINGS.some((building) => {
            if (!building.interiorId) return false;
            const frontX = building.side === "west"
              ? building.x + building.width / 2
              : building.x - building.width / 2;
            const exitX = frontX + (building.side === "west" ? 1.4 : -1.4);
            return Math.hypot(player.root.position.x - exitX, player.root.position.z - building.z) <= 3.5;
          })) {
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
              refreshStage6Actions();
              selectedBusinessServiceIndex = 0;
              document.documentElement.dataset.activeInteriorId = room.id;
              const business = DISTRICT_BUSINESSES.find((item) => item.buildingId === nearbyBuilding.building.id);
              document.documentElement.dataset.activeBusinessId = business?.id ?? "";
              document.documentElement.dataset.activeBusinessServiceCount = String(business?.services.length ?? 0);
              const businessSummary = business
                ? " Services: " + business.services.join(", ") + ". Hours: " + business.opensAt + "–" + business.closesAt + "."
                : "";
              const venueProgramme = nearbyBuilding.building.id === "akwaaba-creative-arts-centre"
                ? " Weekly programme: " + AKWAABA_VENUE_PROGRAMME.filter((item) => ["monday", "tuesday", "friday", "saturday"].includes(item.day)).map((item) => item.day + " " + item.start + " " + item.title).join("; ") + "."
                : "";
              showNotice("Entered " + nearbyBuilding.building.name + "." + businessSummary + venueProgramme + " Press E to leave.");
            } else {
              showNotice("This building interior is not ready yet.");
            }
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
        } else if (interactionState.mode === "on_foot" && passengerState.mode === "not_riding" &&
          findNearestMarinaCraft().distanceM <= 26) {
          const nearbyCraft = findNearestMarinaCraft();
          activeWatercraftKind = nearbyCraft.kind;
          watercraftState = {
            x: nearbyCraft.craft.root.position.x,
            z: nearbyCraft.craft.root.position.z,
            headingRadians: nearbyCraft.craft.root.rotation.y,
            speedMps: 0
          };
          watercraftMode = true;
          player.root.setEnabled(false);
          passengerCameraRig = new PassengerCameraRig(scene, {
            interiorWindow: nearbyCraft.craft.interior,
            exteriorFollow: nearbyCraft.craft.exterior
          });
          vehicleCameraModeIndex = 0;
          document.documentElement.dataset.akwantuoActiveWatercraft = nearbyCraft.kind;
          showNotice(nearbyCraft.kind === "speedboat"
            ? "Coastline 28 speedboat ready. Use W/A/S/D or the touch joystick to steer across the Gulf. Follow the buoys to Akwaaba Cay."
            : "WaveRider jet ski ready. Use W/A/S/D or the touch joystick to steer across the Gulf. Follow the buoys to Akwaaba Cay.");
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

      if (interactionState.mode === "inside_vehicle" || passengerState.mode === "riding" || watercraftMode) {
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
        } else if (watercraftMode && activeWatercraftKind) {
          let steering = touchInput.x;
          let throttle = touchInput.z;
          if (pressedKeys.has("a") || pressedKeys.has("arrowleft")) steering -= 1;
          if (pressedKeys.has("d") || pressedKeys.has("arrowright")) steering += 1;
          if (pressedKeys.has("w") || pressedKeys.has("arrowup")) throttle += 1;
          if (pressedKeys.has("s") || pressedKeys.has("arrowdown")) throttle -= 1;
          steering = Math.max(-1, Math.min(1, steering));
          throttle = Math.max(-1, Math.min(1, throttle));
          const next = advanceWatercraftElapsed(WATERCRAFT_CONFIG[activeWatercraftKind], watercraftState, {
            throttle,
            steering,
            brake: vehicleBrake || pressedKeys.has(" ") ? 1 : 0
          }, rawDelta);
          if (isWatercraftInNavigableSea(next)) {
            watercraftState = next;
          } else {
            watercraftState = { ...watercraftState, speedMps: 0 };
          }
          const craft = marinaWatercraft[activeWatercraftKind];
          craft.root.position.set(watercraftState.x, 0.12 + Math.sin(performance.now() / 330) * 0.045, watercraftState.z);
          craft.root.rotation.y = watercraftState.headingRadians;
          document.documentElement.dataset.akwantuoWatercraftX = watercraftState.x.toFixed(2);
          document.documentElement.dataset.akwantuoWatercraftZ = watercraftState.z.toFixed(2);
          document.documentElement.dataset.akwantuoWatercraftSpeed = watercraftState.speedMps.toFixed(2);
          camera.target = Vector3.Lerp(camera.target, new Vector3(watercraftState.x, 1.6, watercraftState.z), Math.min(1, delta * 8));
          camera.alpha = -Math.PI / 2 - watercraftState.headingRadians;
          camera.radius = activeWatercraftKind === "jet_ski" ? 8 : 11;
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

      let inputX = interactionState.mode === "on_foot" && passengerState.mode !== "riding" && !watercraftMode ? touchInput.x : 0;
      let inputZ = interactionState.mode === "on_foot" && passengerState.mode !== "riding" && !watercraftMode ? touchInput.z : 0;
      if (interactionState.mode === "on_foot" && passengerState.mode !== "riding" && !watercraftMode && (pressedKeys.has("a") || pressedKeys.has("arrowleft"))) inputX -= 1;
      if (interactionState.mode === "on_foot" && passengerState.mode !== "riding" && !watercraftMode && (pressedKeys.has("d") || pressedKeys.has("arrowright"))) inputX += 1;
      if (interactionState.mode === "on_foot" && passengerState.mode !== "riding" && !watercraftMode && (pressedKeys.has("w") || pressedKeys.has("arrowup"))) inputZ += 1;
      if (interactionState.mode === "on_foot" && passengerState.mode !== "riding" && !watercraftMode && (pressedKeys.has("s") || pressedKeys.has("arrowdown"))) inputZ -= 1;

      const inputLength = Math.hypot(inputX, inputZ);
      if (inputLength > 1) {
        inputX /= inputLength;
        inputZ /= inputLength;
      }

      const forward = new Vector3(-Math.sin(camera.alpha), 0, -Math.cos(camera.alpha));
      const right = new Vector3(-forward.z, 0, forward.x);
      const direction = forward.scale(inputZ).add(right.scale(inputX));
      const moving = interactionState.mode === "on_foot" && passengerState.mode !== "riding" && !watercraftMode && direction.lengthSquared() > 0.001;

      if (moving) {
        direction.normalize();
        const stepX = direction.x * WORLD_CONFIG.movement.walkSpeed * delta;
        const stepZ = direction.z * WORLD_CONFIG.movement.walkSpeed * delta;
        const nextX = player.root.position.x + stepX;
        const nextZ = player.root.position.z + stepZ;
        const onMainlandMarinaDock = Math.abs(nextX - mainlandMarina.x) <= 16 &&
          nextZ >= -3370 && nextZ <= -3180;
        const islandDx = (nextX - AKWANTUO_PRIVATE_ISLAND.position.x) / 260;
        const islandDz = (nextZ - AKWANTUO_PRIVATE_ISLAND.position.z) / 190;
        const onIslandLand = islandDx * islandDx + islandDz * islandDz <= 1.08;
        const onIslandDock = Math.abs(nextX - islandMarina.x) <= 12 &&
          Math.abs(nextZ - islandMarina.z) <= 70;
        const onWalkableShore = nextZ >= -3310 || onMainlandMarinaDock || onIslandLand || onIslandDock;
        if (onWalkableShore && !isBlocked(nextX, player.root.position.z, solidAreas, WORLD_CONFIG.movement.collisionRadius) && Math.hypot(nextX - vehicleState.x, player.root.position.z - vehicleState.z) >= 2.0 && Math.hypot(nextX - publicTaxiState.x, player.root.position.z - publicTaxiState.z) >= 2.0) player.root.position.x = nextX;
        if (onWalkableShore && !isBlocked(player.root.position.x, nextZ, solidAreas, WORLD_CONFIG.movement.collisionRadius) && Math.hypot(player.root.position.x - vehicleState.x, nextZ - vehicleState.z) >= 2.0 && Math.hypot(player.root.position.x - publicTaxiState.x, nextZ - publicTaxiState.z) >= 2.0) player.root.position.z = nextZ;
        player.root.rotation.y = Math.atan2(direction.x, direction.z);
        walkClock += delta * 9;
      }

      if (interactionState.mode === "on_foot" && passengerState.mode !== "riding" && !watercraftMode && jumpRequested && onGround) {
        verticalVelocity = WORLD_CONFIG.movement.jumpVelocity;
        onGround = false;
      }
      jumpRequested = false;
      if (interactionState.mode === "on_foot" && passengerState.mode !== "riding") {
        verticalVelocity -= WORLD_CONFIG.movement.gravity * delta;
        player.root.position.y += verticalVelocity * delta;
      }
      if (interactionState.mode === "on_foot" && passengerState.mode !== "riding" && !watercraftMode && player.root.position.y <= 0) {
        player.root.position.y = 0;
        verticalVelocity = 0;
        onGround = true;
      }

      player.setMoving(moving && onGround);

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
  characterForm?.addEventListener("submit", async (event: SubmitEvent) => {
    event.preventDefault();
    updateCharacterPreview();
    const savedLocally = saveAppearance(currentAppearance, window.localStorage);
    let cloudSaved = false;
    if (activeAccountSession) {
      try {
        await savePlayerProfile(activeAccountSession, currentAppearance);
        cloudSaved = true;
      } catch (error) {
        console.error("AKWANTUO cloud character save failed:", error);
      }
    }
    closeCharacterCreator();
    showNotice(cloudSaved
      ? "Character saved to your AKWANTUO account and this device."
      : savedLocally
        ? "Appearance saved on this device. Sign in to enable cloud saves."
        : "Appearance updated for this session, but this browser could not save it.");
    window.setTimeout(() => notice?.classList.remove("is-visible"), 4200);
  });

  const openAccountPanel = (): void => {
    if (!accountPanel) return;
    accountPanel.classList.remove("is-hidden");
    accountPanel.setAttribute("aria-hidden", "false");
    if (activeAccountSession && accountStatus) {
      accountStatus.textContent = `Signed in as ${activeAccountSession.user.email || "AKWANTUO player"}. Character cloud saves are enabled. Wallet: GH₵${(walletBalancePesewas / 100).toFixed(2)}.`;
    }
  };
  const closeAccountPanel = (): void => {
    accountPanel?.classList.add("is-hidden");
    accountPanel?.setAttribute("aria-hidden", "true");
  };
  accountButton?.addEventListener("click", openAccountPanel);
  accountClose?.addEventListener("click", closeAccountPanel);

  accountForm?.addEventListener("submit", async (event: SubmitEvent) => {
    event.preventDefault();
    const email = accountEmail?.value.trim() || "";
    const password = accountPassword?.value || "";
    if (!email || password.length < 8) {
      if (accountStatus) accountStatus.textContent = "Enter a valid email and a password of at least 8 characters.";
      return;
    }
    const submit = document.querySelector<HTMLButtonElement>("#account-signin");
    if (submit) submit.disabled = true;
    if (accountStatus) accountStatus.textContent = "Signing in to AKWANTUO…";
    try {
      activeAccountSession = await signInAkwantuo(email, password);
      const profile = await loadPlayerProfile(activeAccountSession);
      await refreshPlayerEconomy();
      if (profile?.look) {
        currentAppearance = resolveAppearance(profile.look);
        player.applyAppearance(currentAppearance);
        if (characterForm) fillAppearanceForm(characterForm, currentAppearance);
      } else {
        await savePlayerProfile(activeAccountSession, currentAppearance);
      }
      if (accountStatus) accountStatus.textContent = `Signed in as ${email}. Your character profile is synced to AKWANTUO cloud saves. Wallet: GH₵${(walletBalancePesewas / 100).toFixed(2)}.`;
      if (accountSignOut) accountSignOut.classList.remove("is-hidden");
      if (accountButton) accountButton.innerHTML = "ACCOUNT <small>CONNECTED</small>";
      if (accountPassword) accountPassword.value = "";
    } catch (error) {
      if (accountStatus) accountStatus.textContent = error instanceof Error ? error.message : "Sign-in failed. Please try again.";
    } finally {
      if (submit) submit.disabled = false;
    }
  });

  accountSignUp?.addEventListener("click", async () => {
    const email = accountEmail?.value.trim() || "";
    const password = accountPassword?.value || "";
    const displayName = accountDisplayName?.value.trim() || "";
    if (!email || password.length < 8 || !displayName) {
      if (accountStatus) accountStatus.textContent = "Enter your email, a player name and a password of at least 8 characters.";
      return;
    }
    accountSignUp.disabled = true;
    if (accountStatus) accountStatus.textContent = "Creating your AKWANTUO account…";
    try {
      const result = await signUpAkwantuo(email, password, displayName);
      if (!result.session) {
        if (accountStatus) accountStatus.textContent = "Account created. Check your email to confirm it, then return here to sign in.";
        return;
      }
      activeAccountSession = result.session;
      await savePlayerProfile(activeAccountSession, currentAppearance, displayName);
      await refreshPlayerEconomy();
      if (accountStatus) accountStatus.textContent = `Welcome to AKWANTUO, ${displayName}. Your cloud profile is ready. Wallet: GH₵${(walletBalancePesewas / 100).toFixed(2)}.`;
      if (accountSignOut) accountSignOut.classList.remove("is-hidden");
      if (accountButton) accountButton.innerHTML = "ACCOUNT <small>CONNECTED</small>";
      if (accountPassword) accountPassword.value = "";
    } catch (error) {
      if (accountStatus) accountStatus.textContent = error instanceof Error ? error.message : "Account creation failed. Please try again.";
    } finally {
      accountSignUp.disabled = false;
    }
  });

  accountSignOut?.addEventListener("click", async () => {
    if (accountStatus) accountStatus.textContent = "Signing out…";
    try {
      await signOutAkwantuo();
      activeAccountSession = null;
      if (accountStatus) accountStatus.textContent = "Signed out. You can still play locally; sign in again to sync cloud saves.";
      accountSignOut.classList.add("is-hidden");
      if (accountButton) accountButton.innerHTML = "ACCOUNT <small>ONLINE SAVE</small>";
    } catch (error) {
      activeAccountSession = null;
      accountSignOut.classList.add("is-hidden");
      if (accountButton) accountButton.innerHTML = "ACCOUNT <small>ONLINE SAVE</small>";
      if (accountStatus) accountStatus.textContent = error instanceof Error
        ? `Signed out locally. The server ended the session with a message: ${error.message}`
        : "Signed out locally.";
    }
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

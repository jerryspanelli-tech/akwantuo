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
import { advanceRoadVehicleDynamics, type RoadVehicleDynamicsState } from "./vehicles/roadVehicleDynamics";
import { createRoadVehicleGeometry } from "./vehicles/roadVehicleGeometry";
import { createRoadVehicleRig } from "./vehicles/roadVehicleRig";
import { enterVehicle, exitVehicle, type VehicleInteractionState } from "./vehicles/vehicleInteraction";
import { PassengerCameraRig } from "./vehicles/passengerCamera";
import { createPublicTransportVehicle } from "./vehicles/publicTransportVehicle";
import { alightPublicTransport, boardPublicTransport, type PublicTransportPassengerState } from "./world/publicTransportOperations";
import { createPlayableRailDemo } from "./world/playableRailDemo";
import { runTransportSmokeChecks } from "./world/transportSmokeChecks";

const bootScreen = document.querySelector<HTMLElement>("#boot-screen");
const gameShell = document.querySelector<HTMLElement>("#game-shell");
const bootStatus = document.querySelector<HTMLElement>("#boot-status");
const canvas = document.querySelector<HTMLCanvasElement>("#world-canvas");
const playButton = document.querySelector<HTMLButtonElement>("#play-button");
const mainMenu = document.querySelector<HTMLElement>("#main-menu");
const footerBar = document.querySelector<HTMLElement>(".footer-bar");
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

async function start(): Promise<void> {
  if (!canvas || !bootScreen || !gameShell || !bootStatus) {
    throw new Error("The game startup interface could not be found.");
  }

  // Fail early if core fare, boarding, vehicle, or rail-operation contracts regress.
  runTransportSmokeChecks();

  bootStatus.textContent = "Loading the world engine…";
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

  const engine = new Engine(canvas, true, {
    preserveDrawingBuffer: false,
    stencil: true,
    antialias: true,
    powerPreference: "high-performance"
  });
  const scene = new Scene(engine);
  const solidAreas = createPreviewWorld(scene);
  const playableRailDemo = createPlayableRailDemo(scene);
  let currentAppearance = loadAppearance(window.localStorage);
  const player = createPlayer(scene, currentAppearance);

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
    if (key === " " && hasEnteredWorld && interactionState.mode === "on_foot") jumpRequested = true;
    if (key === "e" && hasEnteredWorld) vehicleActionRequested = true;
    if (key === "c" && hasEnteredWorld && interactionState.mode === "inside_vehicle") vehicleViewRequested = true;
  });
  window.addEventListener("keyup", (event: KeyboardEvent) => {
    pressedKeys.delete(event.key.toLowerCase());
  });
  window.addEventListener("blur", () => { pressedKeys.clear(); vehicleBrake = false; });
  interactButton?.addEventListener("pointerdown", (event: PointerEvent) => {
    event.preventDefault();
    vehicleActionRequested = true;
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
    const delta = Math.min(engine.getDeltaTime() / 1000, 0.05);

    if (hasEnteredWorld) {
      playableRailDemo.update(delta);
      const railStatus = playableRailDemo.getStatus();
      if (passengerState.mode === "riding" && passengerState.vehicleId === "preview-shared-trotro") {
        const taxiStep = advanceRoadVehicleDynamics({ wheelbaseM: 2.8, maximumForwardSpeedMps: 7, maximumReverseSpeedMps: 2, maximumAccelerationMps2: 1.8, serviceBrakingMps2: 4, maximumSteeringAngleRadians: 0.35, rollingDragMps2: 0.3 }, publicTaxiState, { throttle: publicRideArrived ? 0 : 1, brake: 0, steering: 0 }, Math.min(delta, 0.1));
        if (taxiStep.z <= publicRideEndZ) { publicTaxiState = { ...taxiStep, z: publicRideEndZ, speedMps: 0 }; publicRideArrived = true; showNotice("You have reached the final stop. Press ALIGHT to leave the trotro."); }
        else publicTaxiState = taxiStep;
        publicTaxi.update(publicTaxiState);
      }
      if (vehicleActionRequested) {
        vehicleActionRequested = false;
        if (passengerState.mode === "riding" && passengerState.vehicleId === "preview-commuter-train") {
          const result = alightPublicTransport(passengerState, { id: "preview-rail-terminal", vehicleStopped: railStatus.completed, boardingOpen: false, alightingOpen: railStatus.completed, remainingSeats: 0 }, "preview-commuter-train");
          if (result.ok) { passengerState = result.state; railPassengerCameraRig?.dispose(); railPassengerCameraRig = null; player.root.setEnabled(true); player.root.position.set(-36, 0, railStatus.position.z); showNotice("You alighted from the train. Balance: GH₵" + (passengerState.balancePesewas / 100).toFixed(2)); }
          else showNotice("The train is still travelling. Wait for the terminal.");
        } else if (interactionState.mode === "on_foot" && passengerState.mode === "not_riding" && railStatus.boardingOpen && Math.hypot(player.root.position.x + 41, player.root.position.z + 20) <= 9) {
          const result = boardPublicTransport(passengerState, { id: "preview-rail-station", vehicleStopped: true, boardingOpen: true, alightingOpen: false, remainingSeats: 40 }, "preview-commuter-train", "preview-rail-route", 0.04, { baseFarePesewas: 300, perKilometrePesewas: 100 });
          if (result.ok && result.state.mode === "riding") { passengerState = result.state; railPassengerCameraRig = new PassengerCameraRig(scene, { interiorWindow: playableRailDemo.interiorWindow, exteriorFollow: playableRailDemo.exteriorFollow }); vehicleCameraModeIndex = 0; player.root.setEnabled(false); playableRailDemo.startService(); showNotice("Boarded the commuter train. Fare: GH₵" + (result.state.farePaidPesewas / 100).toFixed(2) + ". The train is departing."); }
          else if (!result.ok) showNotice("Unable to board train: " + result.reason.replaceAll("_", " ") + ".");
        } else if (passengerState.mode === "riding" && passengerState.vehicleId === "preview-shared-trotro") {
          const result = alightPublicTransport(passengerState, { id: "preview-terminal", vehicleStopped: publicRideArrived, boardingOpen: false, alightingOpen: publicRideArrived, remainingSeats: 0 }, "preview-shared-trotro");
          if (result.ok) { passengerState = result.state; passengerCameraRig?.dispose(); passengerCameraRig = null; player.root.setEnabled(true); player.root.position.set(publicTaxiState.x - 1.7, 0, publicTaxiState.z); showNotice("You alighted. Balance: GH₵" + (passengerState.balancePesewas / 100).toFixed(2)); }
          else showNotice("The trotro is still travelling. Wait for the terminal stop.");
        } else if (interactionState.mode === "on_foot" && passengerState.mode === "not_riding" && Math.hypot(player.root.position.x - (publicTaxiState.x - 1.15), player.root.position.z - publicTaxiState.z) <= 3) {
          const result = boardPublicTransport(passengerState, { id: "preview-origin", vehicleStopped: publicTaxiState.speedMps === 0, boardingOpen: !publicRideArrived, alightingOpen: false, remainingSeats: 8 }, "preview-shared-trotro", "preview-route", 0.05, { baseFarePesewas: 200, perKilometrePesewas: 100 });
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
          const next = advanceRoadVehicleDynamics({
            wheelbaseM: 2.65, maximumForwardSpeedMps: 16, maximumReverseSpeedMps: 4,
            maximumAccelerationMps2: 3.2, serviceBrakingMps2: 7,
            maximumSteeringAngleRadians: 0.48, rollingDragMps2: 0.45
          }, vehicleState, {
            throttle, brake: vehicleBrake || pressedKeys.has(" ") ? 1 : 0, steering
          }, Math.min(delta, 0.1));
          const bounded = clampToWorld(next.x, next.z, {
            minX: WORLD_CONFIG.bounds.minX + 2.5, maxX: WORLD_CONFIG.bounds.maxX - 2.5,
            minZ: WORLD_CONFIG.bounds.minZ + 2.5, maxZ: WORLD_CONFIG.bounds.maxZ - 2.5
          });
          if (!isBlocked(bounded.x, bounded.z, solidAreas, 2.35) && Math.hypot(bounded.x - publicTaxiState.x, bounded.z - publicTaxiState.z) >= 3.6) {
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
        if (interactButton) interactButton.textContent = "ENTER";
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

  engine.runRenderLoop(render);
  window.addEventListener("resize", () => engine.resize());

  bootStatus.textContent = "Your world is ready.";
  await new Promise<void>((resolve) => window.setTimeout(resolve, 450));
  bootScreen.classList.add("is-hidden");
  gameShell.classList.remove("is-hidden");
  engine.resize();

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
  console.error("AKWANTUO startup failed:", error);
  if (bootStatus) {
    bootStatus.textContent = "Unable to start the 3D preview. Please refresh and try again.";
  }
});

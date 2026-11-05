import {
  ArcRotateCamera,
  Color3,
  Color4,
  Engine,
  HemisphericLight,
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
const notice = document.querySelector<HTMLElement>("#notice");
const characterButton = document.querySelector<HTMLButtonElement>("#character-button");
const characterPanel = document.querySelector<HTMLElement>("#character-panel");
const characterForm = document.querySelector<HTMLFormElement>("#character-form");
const characterClose = document.querySelector<HTMLButtonElement>("#character-close");
const characterSave = document.querySelector<HTMLButtonElement>("#character-save");

type SolidArea = { x: number; z: number; halfWidth: number; halfDepth: number };
const pressedKeys = new Set<string>();
const touchInput = { x: 0, z: 0 };
let jumpRequested = false;
let hasEnteredWorld = false;

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

function createPreviewWorld(scene: Scene): SolidArea[] {
  const solidAreas: SolidArea[] = [];
  scene.clearColor = new Color4(0.48, 0.62, 0.66, 1);

  const light = new HemisphericLight("sunlight", new Vector3(0.2, 1, 0.1), scene);
  light.intensity = 0.9;

  const groundMaterial = new StandardMaterial("warm-earth", scene);
  groundMaterial.diffuseColor = new Color3(0.43, 0.39, 0.29);
  const ground = MeshBuilder.CreateGround("terrain", { width: 180, height: 180, subdivisions: 2 }, scene);
  ground.material = groundMaterial;

  const roadMaterial = new StandardMaterial("road-surface", scene);
  roadMaterial.diffuseColor = new Color3(0.12, 0.14, 0.14);
  const road = MeshBuilder.CreateGround("preview-road", { width: 13, height: 180 }, scene);
  road.position.y = 0.025;
  road.material = roadMaterial;

  const buildingPalette = [
    new Color3(0.72, 0.56, 0.39),
    new Color3(0.77, 0.72, 0.59),
    new Color3(0.48, 0.57, 0.53),
    new Color3(0.68, 0.43, 0.31)
  ];

  for (let i = 0; i < 22; i += 1) {
    const side = i % 2 === 0 ? -1 : 1;
    const depth = -72 + Math.floor(i / 2) * 13;
    const width = 7 + (i % 3) * 2;
    const buildingDepth = 8 + (i % 2) * 3;
    const height = 5 + ((i * 7) % 13);
    const material = new StandardMaterial(`building-material-${i}`, scene);
    material.diffuseColor = buildingPalette[i % buildingPalette.length];
    const building = MeshBuilder.CreateBox(`street-building-${i}`, {
      width, height, depth: buildingDepth
    }, scene);
    building.position.set(side * (15 + (i % 3) * 5), height / 2, depth);
    building.material = material;
    solidAreas.push({
      x: building.position.x,
      z: building.position.z,
      halfWidth: width / 2,
      halfDepth: buildingDepth / 2
    });
  }

  const skylineMaterial = new StandardMaterial("distant-skyline", scene);
  skylineMaterial.diffuseColor = new Color3(0.37, 0.46, 0.44);
  for (let i = 0; i < 14; i += 1) {
    const towerHeight = 12 + ((i * 11) % 22);
    const tower = MeshBuilder.CreateBox(`distant-building-${i}`, {
      width: 8, height: towerHeight, depth: 8
    }, scene);
    tower.position.set(-85 + i * 13, towerHeight / 2, -92);
    tower.material = skylineMaterial;
  }

  const centre = MeshBuilder.CreateBox("city-landmark", { width: 12, height: 29, depth: 12 }, scene);
  centre.position.set(0, 14.5, -62);
  const landmarkMaterial = new StandardMaterial("landmark-material", scene);
  landmarkMaterial.diffuseColor = new Color3(0.78, 0.67, 0.48);
  centre.material = landmarkMaterial;
  solidAreas.push({ x: 0, z: -62, halfWidth: 6, halfDepth: 6 });

  return solidAreas;
}

function isBlocked(x: number, z: number, solidAreas: SolidArea[]): boolean {
  const radius = 0.48;
  return solidAreas.some((area) => {
    const nearestX = Math.max(area.x - area.halfWidth, Math.min(x, area.x + area.halfWidth));
    const nearestZ = Math.max(area.z - area.halfDepth, Math.min(z, area.z + area.halfDepth));
    return (x - nearestX) ** 2 + (z - nearestZ) ** 2 < radius ** 2;
  });
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
  root.position.set(0, 0, 5);
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
  let currentAppearance = loadAppearance(window.localStorage);
  const player = createPlayer(scene, currentAppearance);

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
    if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) {
      event.preventDefault();
    }
    pressedKeys.add(key);
    if (key === " " && hasEnteredWorld) jumpRequested = true;
  });
  window.addEventListener("keyup", (event: KeyboardEvent) => {
    pressedKeys.delete(event.key.toLowerCase());
  });
  window.addEventListener("blur", () => pressedKeys.clear());
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
      let inputX = touchInput.x;
      let inputZ = touchInput.z;
      if (pressedKeys.has("a") || pressedKeys.has("arrowleft")) inputX -= 1;
      if (pressedKeys.has("d") || pressedKeys.has("arrowright")) inputX += 1;
      if (pressedKeys.has("w") || pressedKeys.has("arrowup")) inputZ += 1;
      if (pressedKeys.has("s") || pressedKeys.has("arrowdown")) inputZ -= 1;

      const inputLength = Math.hypot(inputX, inputZ);
      if (inputLength > 1) {
        inputX /= inputLength;
        inputZ /= inputLength;
      }

      const forward = new Vector3(-Math.sin(camera.alpha), 0, -Math.cos(camera.alpha));
      const right = new Vector3(-forward.z, 0, forward.x);
      const direction = forward.scale(inputZ).add(right.scale(inputX));
      const moving = direction.lengthSquared() > 0.001;

      if (moving) {
        direction.normalize();
        const stepX = direction.x * 5.2 * delta;
        const stepZ = direction.z * 5.2 * delta;
        const nextX = player.root.position.x + stepX;
        const nextZ = player.root.position.z + stepZ;
        if (!isBlocked(nextX, player.root.position.z, solidAreas)) player.root.position.x = nextX;
        if (!isBlocked(player.root.position.x, nextZ, solidAreas)) player.root.position.z = nextZ;
        player.root.rotation.y = Math.atan2(direction.x, direction.z);
        walkClock += delta * 9;
      }

      if (jumpRequested && onGround) {
        verticalVelocity = 6.3;
        onGround = false;
      }
      jumpRequested = false;
      verticalVelocity -= 17 * delta;
      player.root.position.y += verticalVelocity * delta;
      if (player.root.position.y <= 0) {
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

      const target = player.root.position.add(new Vector3(0, 1.25, 0));
      camera.target = Vector3.Lerp(camera.target, target, Math.min(1, delta * 8));
      player.root.position.x = Math.max(-82, Math.min(82, player.root.position.x));
      player.root.position.z = Math.max(-82, Math.min(82, player.root.position.z));
    }

    scene.render();
  };

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

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

type MoveInput = { x: number; z: number };
const pressedKeys = new Set<string>();
const touchInput: MoveInput = { x: 0, z: 0 };
let jumpRequested = false;
let hasEnteredWorld = false;

function showNotice(message: string): void {
  if (!notice) return;
  notice.textContent = message;
  notice.classList.add("is-visible");
}

function createPreviewWorld(scene: Scene): void {
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
    const height = 5 + ((i * 7) % 13);
    const material = new StandardMaterial(`building-material-${i}`, scene);
    material.diffuseColor = buildingPalette[i % buildingPalette.length];
    const building = MeshBuilder.CreateBox(`street-building-${i}`, {
      width, height, depth: 8 + (i % 2) * 3
    }, scene);
    building.position.set(side * (15 + (i % 3) * 5), height / 2, depth);
    building.material = material;
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
}

function createPlayer(scene: Scene): {
  root: TransformNode;
  leftArm: TransformNode;
  rightArm: TransformNode;
  leftLeg: TransformNode;
  rightLeg: TransformNode;
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

  const head = MeshBuilder.CreateSphere("player-head", {
    diameter: 0.48, segments: 16
  }, scene);
  head.position.y = 2.02;
  head.material = skin;
  head.parent = root;

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

  return { root, leftArm, rightArm, leftLeg, rightLeg };
}

function installTouchControls(): void {
  if (!joystick || !joystickStick) return;

  const resetStick = (): void => {
    touchInput.x = 0;
    touchInput.z = 0;
    joystickStick.style.transform = "translate(0, 0)";
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

  function updateStick(event: PointerEvent): void {
    const bounds = joystick!.getBoundingClientRect();
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
    joystickStick!.style.transform = `translate(${x}px, ${y}px)`;
  }
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
  createPreviewWorld(scene);
  const player = createPlayer(scene);

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
        player.root.position.addInPlace(direction.scale(5.2 * delta));
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

  playButton?.addEventListener("click", () => {
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

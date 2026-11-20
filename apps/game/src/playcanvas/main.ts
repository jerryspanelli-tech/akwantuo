import {
  AppBase, AppOptions, CameraComponentSystem, LightComponentSystem, RenderComponentSystem,
  AnimComponentSystem, ContainerHandler, TextureHandler, Asset, Color, StandardMaterial,
  createGraphicsDevice, DEVICETYPE_WEBGPU, DEVICETYPE_WEBGL2, FILLMODE_FILL_WINDOW,
  RESOLUTION_AUTO, Entity
} from "playcanvas";
import "./style.css";
import { createGreaterAccraWorld } from "./world";
import { GREATER_ACCRA_ROAD_PATHS, GREATER_ACCRA_MAP_EXTENT, GREATER_ACCRA_REGION_ANCHORS } from "../world/greaterAccraLayout";

const canvas = document.querySelector<HTMLCanvasElement>("#application")!;
const loading = document.querySelector<HTMLElement>("#loading");
const loadingMessage = document.querySelector<HTMLElement>("#loading-message");
const status = document.querySelector<HTMLElement>("#world-status");
const objective = document.querySelector<HTMLElement>("#objective");
const hint = document.querySelector<HTMLElement>("#hint");
const interactButton = document.querySelector<HTMLButtonElement>("#interact");
const jumpButton = document.querySelector<HTMLButtonElement>("#jump");
const contextLabel = document.querySelector<HTMLElement>("#context-label");
const healthFill = document.querySelector<HTMLElement>("#health-fill");
const healthValue = document.querySelector<HTMLElement>("#health-value");
const exitButton = document.querySelector<HTMLButtonElement>("#exit");
const vehicleControls = document.querySelector<HTMLElement>("#vehicle-controls");
const accelerateButton = document.querySelector<HTMLButtonElement>("#accelerate");
const reverseButton = document.querySelector<HTMLButtonElement>("#reverse");
const vehicleStick = document.querySelector<HTMLElement>("#vehicle-stick");
const vehicleStickKnob = document.querySelector<HTMLElement>("#vehicle-stick-knob");
const touchUi = document.querySelector<HTMLElement>(".touch-ui");
const stick = document.querySelector<HTMLElement>("#stick");
const stickKnob = document.querySelector<HTMLElement>("#stick-knob");
const notice = document.querySelector<HTMLElement>("#notice");
const minimap = document.querySelector<HTMLCanvasElement>("#minimap");
const minimapContext = minimap?.getContext("2d") ?? null;
const mapToggle = document.querySelector<HTMLButtonElement>("#map-toggle");
const worldMapPanel = document.querySelector<HTMLElement>("#world-map-panel");
const worldMapCanvas = document.querySelector<HTMLCanvasElement>("#world-map-canvas");
const worldMapContext = worldMapCanvas?.getContext("2d") ?? null;
const worldMapClose = document.querySelector<HTMLButtonElement>("#world-map-close");
let worldMapOpen = false;
let worldMapZoom = 1;
let worldMapWaypoint: { x: number; z: number } | null = null;
const mapZoomIn = document.querySelector<HTMLButtonElement>("#map-zoom-in");
const mapZoomOut = document.querySelector<HTMLButtonElement>("#map-zoom-out");
const mapMarkClear = document.querySelector<HTMLButtonElement>("#map-mark-clear");
mapZoomIn?.addEventListener("click", () => { worldMapZoom = clamp(worldMapZoom * 1.25, 1, 4); });
mapZoomOut?.addEventListener("click", () => { worldMapZoom = clamp(worldMapZoom / 1.25, 1, 4); });
mapMarkClear?.addEventListener("click", () => { worldMapWaypoint = null; });
const setWorldMapOpen = (open: boolean) => {
  worldMapOpen = open;
  if (worldMapPanel) worldMapPanel.hidden = !open;
  if (mapToggle) mapToggle.setAttribute("aria-expanded", String(open));
  document.body.classList.toggle("world-map-open", open);
};
mapToggle?.addEventListener("click", () => setWorldMapOpen(!worldMapOpen));
worldMapClose?.addEventListener("click", () => setWorldMapOpen(false));
window.addEventListener("keydown", (event) => { if (event.key === "Escape" && worldMapOpen) setWorldMapOpen(false); });

if (!canvas) throw new Error("AKWANTUO PlayCanvas canvas is missing.");

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const showNotice = (message: string) => {
  if (!notice) return;
  notice.textContent = message;
  notice.classList.add("show");
  window.setTimeout(() => notice.classList.remove("show"), 1700);
};


const mat = (r: number, g: number, b: number) => {
  const material = new StandardMaterial();
  material.diffuse = new Color(r, g, b);
  material.specular = new Color(0.04, 0.04, 0.04);
  material.update();
  return material;
};

async function boot() {
  loadingMessage && (loadingMessage.textContent = "Starting WebGL / WebGPU renderer…");
  const device = await createGraphicsDevice(canvas, { deviceTypes: [DEVICETYPE_WEBGPU, DEVICETYPE_WEBGL2] });
  // Conservative default for older iPhones. Desktop can use a higher cap.
  device.maxPixelRatio = Math.min(window.devicePixelRatio || 1, window.matchMedia("(pointer: coarse)").matches ? 1.25 : 1.6);

  const options = new AppOptions();
  options.graphicsDevice = device;
  options.componentSystems = [RenderComponentSystem, CameraComponentSystem, LightComponentSystem, AnimComponentSystem];
  options.resourceHandlers = [ContainerHandler, TextureHandler];
  const app = new AppBase(canvas);
  app.init(options);
  app.setCanvasFillMode(FILLMODE_FILL_WINDOW);
  app.setCanvasResolution(RESOLUTION_AUTO);
  app.scene.ambientLight = new Color(0.48, 0.49, 0.46);
  // Warm Accra daylight with a soft ambient fill, avoiding harsh flat lighting.
  app.start();

  // Start downloading the unchanged player GLB immediately, in parallel with
  // world construction. Parsing/instantiation remains asynchronous below.
  const playerAssetPromise = new Promise<Asset>((resolve, reject) => {
    app.assets.loadFromUrl("/assets/characters/generated/player.glb", "container", (error, asset) => {
      if (error || !asset?.resource) reject(error ?? new Error("Player GLB returned no container resource."));
      else resolve(asset);
    });
  });

  const addBox = (name: string, x: number, y: number, z: number, sx: number, sy: number, sz: number, material: StandardMaterial, blocker = false) => {
    const entity = new Entity(name);
    entity.addComponent("render", { type: "box", material, castShadows: true, receiveShadows: true });
    entity.setPosition(x, y, z);
    entity.setLocalScale(sx, sy, sz);
    app.root.addChild(entity);
    if (blocker) blockers.push({ x, z, hx: sx * 0.52, hz: sz * 0.52 });
    return entity;
  };
  const addPlane = (name: string, x: number, y: number, z: number, sx: number, sz: number, material: StandardMaterial) => {
    const entity = new Entity(name);
    entity.addComponent("render", { type: "plane", material });
    entity.setPosition(x, y, z);
    entity.setLocalScale(sx, 1, sz);
    app.root.addChild(entity);
    return entity;
  };
  const addCylinder = (name: string, x: number, y: number, z: number, radius: number, height: number, material: StandardMaterial) => {
    const entity = new Entity(name);
    entity.addComponent("render", { type: "cylinder", material });
    entity.setPosition(x, y, z);
    entity.setLocalScale(radius * 2, height, radius * 2);
    app.root.addChild(entity);
    return entity;
  };

  const materials = {
    soil: mat(0.48, 0.38, 0.25), grass: mat(0.22, 0.34, 0.22), road: mat(0.105, 0.12, 0.12),
    lane: mat(0.88, 0.78, 0.53), kerb: mat(0.69, 0.66, 0.57), sand: mat(0.78, 0.68, 0.48),
    sea: mat(0.045, 0.25, 0.34), white: mat(0.85, 0.83, 0.75), gold: mat(0.78, 0.52, 0.19),
    green: mat(0.12, 0.31, 0.22), red: mat(0.55, 0.16, 0.12), blue: mat(0.12, 0.28, 0.42),
    concrete: mat(0.55, 0.53, 0.47), glass: mat(0.16, 0.29, 0.31), roof: mat(0.28, 0.20, 0.16),
    tyre: mat(0.025, 0.03, 0.03), vehicle: mat(0.78, 0.67, 0.34)
  };

  loadingMessage && (loadingMessage.textContent = "Building Greater Accra roads, districts and coastline…");
  const world = createGreaterAccraWorld(app);
  const blockers = world.blockers;

  loadingMessage && (loadingMessage.textContent = "Preparing the player and vehicle…");
  const player = new Entity("Player");
  player.setPosition(world.spawn.x, 0, world.spawn.z);
  app.root.addChild(player);

  // Load the rigged player through PlayCanvas' supported URL loader. Keep the
  // rendered character as a direct scene child (not a child of the movement
  // controller) so imported GLB root transforms cannot hide or offset it.
  let playerCharacter: Entity | null = null;
  let playerAnimationNames = { idle: "", walk: "", run: "" };
  let activePlayerAnimation = "";
  document.documentElement.dataset.akwantuoPlayerModel = "loading";

  const markPlayerUnavailable = (reason: string, error?: unknown) => {
    document.documentElement.dataset.akwantuoPlayerModel = "3d-unavailable";
    console.error("[AKWANTUO] Player GLB unavailable:", reason, error ?? "");
    showNotice("3D player failed to load");
  };

  void playerAssetPromise.then((loadedAsset) => {
    const container = loadedAsset.resource as any;
    try {
      if (!Array.isArray(container.renders) || container.renders.length === 0) {
        throw new Error("The GLB container has no render assets.");
      }

      const character = container.instantiateRenderEntity({ castShadows: true });
      character.name = "AKWANTUO Ghanaian 3D player";
      character.enabled = true;
      character.setPosition(world.spawn.x, 0, world.spawn.z);
      character.setLocalScale(0.92, 0.92, 0.92);
      app.root.addChild(character);
      character.syncHierarchy();

      let renderMeshCount = 0;
      const enableImportedMeshes = (node: any) => {
        node.enabled = true;
        for (const mesh of node.render?.meshInstances ?? []) {
          mesh.visible = true;
          renderMeshCount++;
        }
        for (const child of node.children ?? []) enableImportedMeshes(child);
      };
      enableImportedMeshes(character);
      if (renderMeshCount === 0) {
        character.destroy();
        throw new Error("The GLB produced no render mesh instances.");
      }

      playerCharacter = character;
      document.documentElement.dataset.akwantuoPlayerModel = "3d-visible";
      console.info("[AKWANTUO] Player render entity attached to scene", {
        renderAssets: container.renders.length,
        renderMeshCount,
        position: character.getPosition().toString()
      });

      // Animation is optional for visibility: never hide/destroy the mesh if
      // a clip or animation component cannot be bound.
      try {
        const animationAssets = Array.isArray(container.animations) ? container.animations : [];
        character.addComponent("anim", { activate: true });
        const names: string[] = [];
        for (const animationAsset of animationAssets) {
          const track = animationAsset?.resource;
          const clipName = track?.name || animationAsset?.name;
          if (!track || !clipName) continue;
          character.anim.assignAnimation(clipName, track);
          names.push(clipName);
        }
        const findClip = (pattern: RegExp) => names.find((name) => pattern.test(name)) || "";
        playerAnimationNames = {
          idle: findClip(/idle/i),
          walk: findClip(/walk/i),
          run: findClip(/run/i)
        };
        if (playerAnimationNames.idle) {
          character.anim.baseLayer.play(playerAnimationNames.idle);
          activePlayerAnimation = playerAnimationNames.idle;
        }
        document.documentElement.dataset.akwantuoPlayerModel =
          playerAnimationNames.idle && playerAnimationNames.walk && playerAnimationNames.run
            ? "animated-3d"
            : "3d-visible-animation-incomplete";
        console.info("[AKWANTUO] Player animation clips", names);
      } catch (animationError) {
        document.documentElement.dataset.akwantuoPlayerModel = "3d-visible-animation-error";
        console.error("[AKWANTUO] Character mesh is visible; animation setup failed", animationError);
      }
    } catch (renderError) {
      markPlayerUnavailable("The GLB loaded but could not be attached as a visible render entity.", renderError);
    }
  }).catch((loadError) => {
    markPlayerUnavailable("The GLB request or container parse failed.", loadError);
  });
  const camera = new Entity("Third person camera");
  camera.addComponent("camera", { clearColor: new Color(0.68, 0.78, 0.83), fov: 62, farClip: 260 });
  app.root.addChild(camera);
  const sun = new Entity("Ghana afternoon sun");
  sun.addComponent("light", { type: "directional", color: new Color(1, 0.82, 0.66), intensity: 1.35, castShadows: true, shadowDistance: 70, shadowResolution: 512 });
  sun.setEulerAngles(48, 32, 0);
  app.root.addChild(sun);

  // A slow tropical day/night cycle: keep the same sun direction but let the
  // daylight, ambient fill and sky tone change smoothly over an eight-minute loop.
  let worldClock = 0;
  const rainMaterial = mat(0.48, 0.66, 0.78);
  const rainDrops: Entity[] = [];
  for (let i = 0; i < 36; i++) {
    const drop = new Entity("Tropical rain streak");
    drop.addComponent("render", { type: "box", material: rainMaterial, castShadows: false, receiveShadows: false });
    drop.setLocalScale(0.035, 1.15, 0.035);
    drop.enabled = false;
    app.root.addChild(drop);
    rainDrops.push(drop);
  }

  // One drivable saloon/taxi prototype with separate body and wheels.
  const vehicle = new Entity("Accra taxi");
  addBox("Taxi body", 0, 1.1, 0, 2.1, 1.05, 4.2, materials.vehicle);
  const vehicleBody = app.root.findByName("Taxi body") as Entity;
  vehicle.addChild(vehicleBody);
  vehicleBody.setLocalPosition(0, 1.1, 0);
  const cab = new Entity("Taxi cabin"); cab.addComponent("render", { type: "box", material: materials.glass }); cab.setLocalScale(1.7, 0.8, 2); cab.setLocalPosition(0, 1.95, -0.15); vehicle.addChild(cab);
  for (const x of [-0.95, 0.95]) for (const z of [-1.35, 1.35]) { const wheel = new Entity("Taxi wheel"); wheel.addComponent("render", { type: "cylinder", material: materials.tyre }); wheel.setLocalScale(0.65, 0.22, 0.65); wheel.setLocalEulerAngles(0, 0, 90); wheel.setLocalPosition(x, 0.58, z); vehicle.addChild(wheel); }
  vehicle.setPosition(world.taxiSpawn.x, 0, world.taxiSpawn.z);
  app.root.addChild(vehicle);

  const keys = new Set<string>();
  window.addEventListener("keydown", (event) => { keys.add(event.code); if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].includes(event.code)) event.preventDefault(); });
  window.addEventListener("keyup", (event) => keys.delete(event.code));
  window.addEventListener("blur", () => keys.clear());

  let stickX = 0, stickY = 0, stickPointer: number | null = null;
  // Vehicle pedals and steering are held independently of the on-foot joystick.
  const vehicleInput = { accelerate: false, reverse: false };
  const bindHold = (button: HTMLButtonElement | null, key: keyof typeof vehicleInput) => {
    if (!button) return;
    const release = (event: PointerEvent) => { event.preventDefault(); vehicleInput[key] = false; button.classList.remove("pressed"); };
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      vehicleInput[key] = true;
      button.classList.add("pressed");
      button.setPointerCapture(event.pointerId);
    });
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("lostpointercapture", () => { vehicleInput[key] = false; button.classList.remove("pressed"); });
    button.addEventListener("contextmenu", (event) => event.preventDefault());
  };
  bindHold(accelerateButton, "accelerate");
  bindHold(reverseButton, "reverse");

  // Driving has its own analog steering stick. Horizontal travel maps
  // continuously from full-left (-1) to full-right (+1).
  let vehicleStickX = 0, vehicleStickPointer: number | null = null;
  const updateVehicleStick = (event: PointerEvent) => {
    if (!vehicleStick) return;
    const rect = vehicleStick.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    const radius = rect.width * 0.36;
    const length = Math.hypot(dx, dy);
    const scale = length > radius ? radius / length : 1;
    const x = dx * scale, y = dy * scale;
    vehicleStickX = Math.abs(x / radius) < 0.06 ? 0 : clamp(-x / radius, -1, 1);
    if (vehicleStickKnob) vehicleStickKnob.style.transform = `translate(${x}px,${y}px)`;
  };
  vehicleStick?.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    vehicleStickPointer = event.pointerId;
    vehicleStick.setPointerCapture(event.pointerId);
    updateVehicleStick(event);
  });
  vehicleStick?.addEventListener("pointermove", (event) => {
    if (event.pointerId === vehicleStickPointer) updateVehicleStick(event);
  });
  const resetVehicleStick = (event: PointerEvent) => {
    if (event.pointerId !== vehicleStickPointer) return;
    vehicleStickPointer = null;
    vehicleStickX = 0;
    if (vehicleStickKnob) vehicleStickKnob.style.transform = "";
  };
  vehicleStick?.addEventListener("pointerup", resetVehicleStick);
  vehicleStick?.addEventListener("pointercancel", resetVehicleStick);
  vehicleStick?.addEventListener("lostpointercapture", resetVehicleStick);
  let jumpRequested = false, verticalVelocity = 0, grounded = true;
  const groundHeight = 0;
  const requestJump = () => { if (!inVehicle && grounded) { jumpRequested = true; jumpButton?.classList.add("pressed"); } };
  jumpButton?.addEventListener("pointerdown", (event) => { event.preventDefault(); requestJump(); });
  jumpButton?.addEventListener("pointerup", () => jumpButton.classList.remove("pressed"));
  jumpButton?.addEventListener("pointercancel", () => jumpButton.classList.remove("pressed"));
  const updateStick = (event: PointerEvent) => {
    const rect = stick!.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    const radius = rect.width * 0.36;
    const length = Math.hypot(dx, dy);
    const scale = length > radius ? radius / length : 1;
    const x = dx * scale, y = dy * scale;
    stickX = Math.abs(x / radius) < 0.12 ? 0 : -x / radius;
    stickY = Math.abs(y / radius) < 0.12 ? 0 : y / radius;
    stickKnob!.style.transform = `translate(${x}px,${y}px)`;
  };
  stick?.addEventListener("pointerdown", (event) => { stickPointer = event.pointerId; stick!.setPointerCapture(event.pointerId); updateStick(event); });
  stick?.addEventListener("pointermove", (event) => { if (event.pointerId === stickPointer) updateStick(event); });
  const resetStick = (event: PointerEvent) => { if (event.pointerId !== stickPointer) return; stickPointer = null; stickX = stickY = 0; stickKnob!.style.transform = ""; };
  stick?.addEventListener("pointerup", resetStick); stick?.addEventListener("pointercancel", resetStick); stick?.addEventListener("lostpointercapture", resetStick);

  let cameraYaw = 0, cameraPitch = 13, dragPointer: number | null = null, lastX = 0, lastY = 0;
  canvas.addEventListener("pointerdown", (event) => { dragPointer = event.pointerId; lastX = event.clientX; lastY = event.clientY; });
  window.addEventListener("pointermove", (event) => { if (dragPointer !== event.pointerId) return; cameraYaw -= (event.clientX - lastX) * 0.22; cameraPitch = clamp(cameraPitch + (event.clientY - lastY) * 0.12, -2, 30); lastX = event.clientX; lastY = event.clientY; });
  window.addEventListener("pointerup", (event) => { if (dragPointer === event.pointerId) dragPointer = null; });

  const walkSpeed = 4.6, sprintSpeed = 8.2;
  let inVehicle = false, vehicleSpeed = 0, vehicleYaw = 0;
  worldMapCanvas?.addEventListener("pointerdown", (event) => {
    if (!worldMapCanvas || !worldMapOpen) return;
    event.preventDefault();
    const rect = worldMapCanvas.getBoundingClientRect();
    // Account for object-fit:contain letterboxing so taps map to the
    // same coordinates the player sees on both narrow phones and desktop.
    const aspect = worldMapCanvas.width / worldMapCanvas.height;
    const displayWidth = Math.min(rect.width, rect.height * aspect);
    const displayHeight = displayWidth / aspect;
    const offsetX = (rect.width - displayWidth) / 2;
    const offsetY = (rect.height - displayHeight) / 2;
    const localX = event.clientX - rect.left - offsetX;
    const localY = event.clientY - rect.top - offsetY;
    if (localX < 0 || localY < 0 || localX > displayWidth || localY > displayHeight) return;
    const px = localX * (worldMapCanvas.width / displayWidth);
    const py = localY * (worldMapCanvas.height / displayHeight);
    const bounds = GREATER_ACCRA_MAP_EXTENT, pad = 54;
    const baseScale = Math.min((worldMapCanvas.width - pad * 2) / bounds.widthM, (worldMapCanvas.height - pad * 2) / bounds.depthM);
    const mapWidth = bounds.widthM * baseScale, mapHeight = bounds.depthM * baseScale;
    const ox = (worldMapCanvas.width - mapWidth) / 2, oy = (worldMapCanvas.height - mapHeight) / 2;
    const current = inVehicle ? vehicle.getPosition() : player.getPosition();
    const playerBaseX = ox + (current.x - bounds.minX) * baseScale;
    const playerBaseY = oy + (bounds.maxZ - current.z) * baseScale;
    worldMapWaypoint = {
      x: current.x + (px - playerBaseX) / (baseScale * worldMapZoom),
      z: current.z - (py - playerBaseY) / (baseScale * worldMapZoom)
    };
    showNotice("Map location marked");
  });
  let nearbyInteraction: { id: string; label: string; x: number; z: number; radius: number } | null = null;
  const overlaps = (x: number, z: number) => {
    const buildingCollision = blockers.some((b) => Math.abs(x - b.x) < b.hx + 0.38 && Math.abs(z - b.z) < b.hz + 0.38);
    const vehiclePosition = vehicle.getPosition();
    const vehicleCollision = !inVehicle && Math.abs(x - vehiclePosition.x) < 1.55 && Math.abs(z - vehiclePosition.z) < 2.45;
    return buildingCollision || vehicleCollision;
  };
  const canEnter = () => Math.hypot(player.getPosition().x - vehicle.getPosition().x, player.getPosition().z - vehicle.getPosition().z) < 4.3;
  const findNearbyInteraction = () => {
    const p = player.getPosition();
    let nearest: typeof nearbyInteraction = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const target of world.interactables) {
      const distance = Math.hypot(p.x - target.x, p.z - target.z);
      if (distance <= target.radius && distance < nearestDistance) { nearest = target; nearestDistance = distance; }
    }
    return nearest;
  };
  const updateButtons = () => {
    nearbyInteraction = inVehicle ? null : findNearbyInteraction();
    const taxiAvailable = !inVehicle && canEnter();
    const available = !inVehicle && (taxiAvailable || !!nearbyInteraction);
    if (interactButton) {
      interactButton.hidden = !available;
      interactButton.classList.toggle("available", available && !inVehicle);
      interactButton.setAttribute("aria-label", inVehicle ? "Drive" : taxiAvailable ? "Enter taxi" : nearbyInteraction?.label ?? "Interact");
    }
    if (contextLabel) {
      const label = inVehicle ? "" : taxiAvailable ? "ENTER TAXI" : nearbyInteraction?.label ?? "";
      contextLabel.textContent = label;
      contextLabel.classList.toggle("visible", !!label);
    }
    if (exitButton) exitButton.hidden = !inVehicle;
    if (vehicleControls) vehicleControls.hidden = !inVehicle;
    if (!inVehicle && vehicleStickKnob) vehicleStickKnob.style.transform = "";
    touchUi?.classList.toggle("vehicle-mode", inVehicle);
    if (jumpButton) jumpButton.hidden = inVehicle;
    if (stick) stick.classList.toggle("sprinting", !inVehicle && Math.hypot(stickX, stickY) >= 0.84);
  };
  const enter = () => {
    if (inVehicle) { inVehicle = false; const p = vehicle.getPosition(); player.setPosition(p.x - 2.4, 0, p.z); player.enabled = true; vehicleSpeed = 0; grounded = true; if (playerCharacter) playerCharacter.enabled = true; showNotice("You exited the taxi"); }
    else if (canEnter()) { inVehicle = true; const p = vehicle.getPosition(); player.setPosition(p.x, 0, p.z); player.enabled = false; vehicleSpeed = 0; if (playerCharacter) playerCharacter.enabled = false; showNotice("Taxi entered · use accelerator, reverse and steering controls"); }
    else if (nearbyInteraction) { showNotice(nearbyInteraction.label === "USE BENCH" ? "Bench interaction selected" : nearbyInteraction.label); }
    updateButtons();
  };
  interactButton?.addEventListener("click", enter);
  exitButton?.addEventListener("click", enter);
  window.addEventListener("keydown", (event) => {
    if (event.code === "KeyE" && !event.repeat) enter();
    if (event.code === "Space" && !event.repeat) requestJump();
  });

  let elapsed = 0, mapElapsed = 0, worldMapElapsed = 1;
  app.on("update", (dt: number) => {
    const step = Math.min(dt, 0.05);
    world.update(step);
    worldClock += step;
    const daylight = 0.5 + 0.5 * Math.sin((worldClock / 480) * Math.PI * 2 - Math.PI / 2);
    if (sun.light) sun.light.intensity = 0.22 + daylight * 1.16;
    app.scene.ambientLight = new Color(
      0.12 + daylight * 0.36,
      0.14 + daylight * 0.35,
      0.20 + daylight * 0.27
    );
    if (camera.camera) {
      camera.camera.clearColor = new Color(
        0.025 + daylight * 0.63,
        0.045 + daylight * 0.70,
        0.085 + daylight * 0.72
      );
    }
    // Short tropical showers recur during the weather cycle. Keep the particle
    // count deliberately low for older mobile GPUs and move drops around the player.
    const weatherPhase = worldClock % 240;
    const raining = weatherPhase >= 150 && weatherPhase < 198;
    const weatherFocus = inVehicle ? vehicle.getPosition() : player.getPosition();
    for (const drop of rainDrops) {
      if (!raining) {
        if (drop.enabled) drop.enabled = false;
        continue;
      }
      if (!drop.enabled) {
        drop.enabled = true;
        drop.setPosition(
          weatherFocus.x + (Math.random() - 0.5) * 34,
          weatherFocus.y + 7 + Math.random() * 17,
          weatherFocus.z + (Math.random() - 0.5) * 34
        );
      } else {
        const position = drop.getPosition();
        const nextY = position.y - 24 * step;
        if (nextY < weatherFocus.y + 0.6) {
          drop.setPosition(
            weatherFocus.x + (Math.random() - 0.5) * 34,
            weatherFocus.y + 7 + Math.random() * 17,
            weatherFocus.z + (Math.random() - 0.5) * 34
          );
        } else {
          drop.setPosition(position.x - 1.5 * step, nextY, position.z + 0.8 * step);
        }
      }
    }
    worldMapElapsed += step;
    const forward = (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0) - (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0) - stickY;
    const strafe = (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) - (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0) + stickX;
    if (inVehicle) {
      // Dedicated vehicle controls: pedals set longitudinal force; steering
      // buttons set yaw. The on-foot joystick never drives the vehicle.
      const accelerating = vehicleInput.accelerate || keys.has("KeyW") || keys.has("ArrowUp");
      const reversing = vehicleInput.reverse || keys.has("KeyS") || keys.has("ArrowDown");
      const keyboardSteer = Number(keys.has("KeyD") || keys.has("ArrowRight")) - Number(keys.has("KeyA") || keys.has("ArrowLeft"));
      const steer = clamp(vehicleStickX + keyboardSteer, -1, 1);
      const throttle = accelerating === reversing ? 0 : accelerating ? 1 : -1;
      const acceleration = throttle > 0 ? 10.5 : throttle < 0 ? 7.5 : 0;
      vehicleSpeed = clamp(vehicleSpeed + throttle * acceleration * step, -6.5, 16);
      // Coasting drag, with stronger resistance near a standstill.
      if (throttle === 0) {
        vehicleSpeed *= Math.max(0, 1 - step * (Math.abs(vehicleSpeed) < 0.45 ? 5 : 0.68));
      }
      const steeringGrip = 0.3 + Math.min(Math.abs(vehicleSpeed) / 8, 1) * 0.7;
      // Proportional analog steering: small thumb movements make gentle turns.
      vehicleYaw += steer * steeringGrip * (vehicleSpeed >= 0 ? 1 : -1) * step * 1.75;
      const nextX = vehicle.getPosition().x + Math.sin(vehicleYaw) * vehicleSpeed * step;
      const nextZ = vehicle.getPosition().z + Math.cos(vehicleYaw) * vehicleSpeed * step;
      if (!overlaps(nextX, nextZ) && nextX > -8000 && nextX < 13000 && nextZ > -4050 && nextZ < 8500) vehicle.setPosition(nextX, 0, nextZ);
      vehicle.setEulerAngles(0, vehicleYaw * 180 / Math.PI, 0);
      const vehiclePosition = vehicle.getPosition();
      player.setPosition(vehiclePosition.x, vehiclePosition.y, vehiclePosition.z);
      if (exitButton) exitButton.hidden = false;
    } else {
      const rawMagnitude = Math.hypot(forward, strafe);
      const magnitude = Math.min(1, rawMagnitude);
      const joystickMagnitude = Math.hypot(stickX, stickY);
      const sprinting = joystickMagnitude >= 0.84;
      const speed = sprinting ? sprintSpeed : walkSpeed;
      if (jumpRequested && grounded) { verticalVelocity = 6.2; grounded = false; }
      jumpRequested = false;
      if (!grounded) {
        verticalVelocity -= 17.5 * step;
        const nextY = player.getPosition().y + verticalVelocity * step;
        if (nextY <= groundHeight) { player.setPosition(player.getPosition().x, groundHeight, player.getPosition().z); verticalVelocity = 0; grounded = true; }
        else player.setPosition(player.getPosition().x, nextY, player.getPosition().z);
      }
      if (magnitude > 0.04) {
        const angle = cameraYaw * Math.PI / 180;
        const normalizer = rawMagnitude > 1 ? 1 / rawMagnitude : 1;
        const moveForward = forward * normalizer, moveStrafe = strafe * normalizer;
        // Camera forward is (sin(yaw), 0, cos(yaw)); camera screen-right
        // is (cos(yaw), 0, -sin(yaw)). Positive joystick X must follow that
        // screen-right basis, not the opposite direction.
        const dx = (moveForward * Math.sin(angle) + moveStrafe * Math.cos(angle)) * speed * step;
        const dz = (moveForward * Math.cos(angle) - moveStrafe * Math.sin(angle)) * speed * step;
        const p = player.getPosition();
        const nx = clamp(p.x + dx, -8000, 13000), nz = clamp(p.z + dz, -4050, 8500);
        if (!overlaps(nx, p.z)) player.setPosition(nx, p.y, p.z);
        if (!overlaps(player.getPosition().x, nz)) player.setPosition(player.getPosition().x, p.y, nz);
        player.setEulerAngles(0, Math.atan2(dx, dz) * 180 / Math.PI, 0);
      } else {
      }
      const desiredAnimation = magnitude <= 0.04
        ? playerAnimationNames.idle
        : sprinting ? playerAnimationNames.run : playerAnimationNames.walk;
      const playerAnimationLayer = playerCharacter?.anim?.baseLayer;
      if (playerAnimationLayer && desiredAnimation && desiredAnimation !== activePlayerAnimation) {
        playerAnimationLayer.transition(desiredAnimation, 0.18);
        activePlayerAnimation = desiredAnimation;
      }
      if (playerCharacter?.anim) playerCharacter.anim.speed = sprinting ? 1.45 : 1;
    }
    // The GLB is a separate scene entity so its imported hierarchy is not
    // affected by the movement controller's parent transforms. Mirror the
    // controller transform every frame while the player is on foot.
    if (playerCharacter && !inVehicle) {
      const playerPosition = player.getPosition();
      playerCharacter.setPosition(playerPosition.x, playerPosition.y, playerPosition.z);
      playerCharacter.setEulerAngles(player.getEulerAngles());
    }
    const focus = inVehicle ? vehicle.getPosition() : player.getPosition();
    const yaw = cameraYaw * Math.PI / 180;
    const distance = inVehicle ? 10 : 7.5;
    const height = inVehicle ? 4.4 : 3.6;
    camera.setPosition(focus.x - Math.sin(yaw) * distance, focus.y + height + cameraPitch * 0.08, focus.z - Math.cos(yaw) * distance);
    camera.lookAt(focus.x, focus.y + 1.15, focus.z);
    if (elapsed > 0.10) { updateButtons(); elapsed = 0; }
    elapsed += step;
    mapElapsed += step;
    if (mapElapsed > 0.14 && minimapContext && minimap) {
      mapElapsed = 0;
      const map = minimapContext;
      const center = player.getPosition();
      const width = minimap.width, height = minimap.height;
      const radius = Math.min(width, height) * 0.47;
      const scale = 0.16;
      const heading = (inVehicle ? vehicle.getEulerAngles().y : player.getEulerAngles().y) * Math.PI / 180;
      map.clearRect(0, 0, width, height);
      map.fillStyle = "#091511"; map.fillRect(0, 0, width, height);
      map.save();
      map.beginPath(); map.arc(width / 2, height / 2, radius, 0, Math.PI * 2); map.clip();
      map.fillStyle = "#182a22"; map.fillRect(0, 0, width, height);
      // Rotate the world around the player so the direction of travel stays up,
      // as in a GTA radar. Coordinates are the same metres used by the 3D world.
      map.translate(width / 2, height / 2);
      map.rotate(-heading);
      const plot = (x: number, z: number) => ({ x: x * scale, y: -z * scale });
      // Draw nearby authored building / landmark footprints from the same
      // collision bounds used by gameplay, so the radar reflects the 3D city.
      map.fillStyle = "#34483d";
      for (const building of blockers) {
        const p = plot(building.x - center.x, building.z - center.z);
        const footprintWidth = building.hx * 2 * scale;
        const footprintDepth = building.hz * 2 * scale;
        if (Math.abs(p.x) > radius + footprintWidth || Math.abs(p.y) > radius + footprintDepth) continue;
        map.fillRect(p.x - footprintWidth / 2, p.y - footprintDepth / 2, footprintWidth, footprintDepth);
      }
      // Major Greater Accra routes.
      for (const road of GREATER_ACCRA_ROAD_PATHS) {
        if (!road.playableInFirstRelease) continue;
        map.beginPath();
        road.points.forEach((point, index) => {
          const p = plot(point.x - center.x, point.z - center.z);
          if (index === 0) map.moveTo(p.x, p.y); else map.lineTo(p.x, p.y);
        });
        const highway = /^(n1|n4|n6)-/.test(road.roadSegmentId);
        map.strokeStyle = highway ? "#c6a66c" : "#87958b";
        map.lineWidth = highway ? 3.2 : 2;
        map.lineCap = "round"; map.lineJoin = "round"; map.stroke();
      }
      const poi = [
        { name: "OSU", x: 1450, z: -1180, kind: "district" },
        { name: "MAKOLA", x: -400, z: 450, kind: "market" },
        { name: "CIRCLE", x: -450, z: 450, kind: "transport" },
        { name: "37", x: 1250, z: -350, kind: "district" },
        { name: "AIRPORT CITY", x: 1050, z: 850, kind: "landmark" },
        { name: "TETTEH QUARSHIE", x: 3650, z: 1750, kind: "transport" },
        { name: "EAST LEGON", x: 3900, z: 2100, kind: "district" },
        { name: "MADINA", x: 5000, z: 1750, kind: "market" },
        { name: "LABADI BEACH", x: 2750, z: -2100, kind: "beach" },
        { name: "SPINTEX", x: 5600, z: -1150, kind: "district" },
        { name: "TEMA", x: 8700, z: -850, kind: "district" }
      ];
      for (const place of poi) {
        const p = plot(place.x - center.x, place.z - center.z);
        if (Math.hypot(p.x, p.y) > radius - 8) continue;
        map.beginPath(); map.arc(p.x, p.y, place.kind === "landmark" || place.kind === "beach" ? 4 : 3, 0, Math.PI * 2);
        map.fillStyle = place.kind === "market" ? "#f0bd67" : place.kind === "beach" ? "#58c5d1" : place.kind === "transport" ? "#a7c8ef" : "#e9e5d8";
        map.fill();
        if (Math.hypot(p.x, p.y) < radius - 22) {
          map.font = "bold 7px system-ui, sans-serif";
          map.textAlign = "center"; map.textBaseline = "bottom";
          map.fillStyle = "#f2eee2"; map.shadowColor = "#06100c"; map.shadowBlur = 3;
          map.fillText(place.name, p.x, p.y - 6); map.shadowBlur = 0;
        }
      }
      // Active waypoint guidance: the radar rotates with the player, so
      // this line and marker always point toward the selected destination.
      if (worldMapWaypoint) {
        const dx = worldMapWaypoint.x - center.x;
        const dz = worldMapWaypoint.z - center.z;
        const distance = Math.hypot(dx, dz);
        const target = plot(dx, dz);
        const targetLength = Math.hypot(target.x, target.y) || 1;
        const visibleLength = Math.min(targetLength, radius - 15);
        const endX = target.x / targetLength * visibleLength;
        const endY = target.y / targetLength * visibleLength;
        map.save();
        map.beginPath(); map.arc(0, 0, radius - 2, 0, Math.PI * 2); map.clip();
        map.beginPath(); map.moveTo(0, 0); map.lineTo(endX, endY);
        map.strokeStyle = "#ffdf76"; map.lineWidth = 3; map.setLineDash([5, 4]); map.stroke(); map.setLineDash([]);
        map.restore();
        map.save(); map.translate(endX, endY);
        map.fillStyle = "#ffdf76"; map.strokeStyle = "#342710"; map.lineWidth = 2;
        map.beginPath(); map.arc(0, 0, 6, 0, Math.PI * 2); map.fill(); map.stroke();
        map.beginPath(); map.moveTo(0, -11); map.lineTo(0, -19); map.stroke();
        map.restore();
        map.save(); map.rotate(heading);
        map.fillStyle = "#ffdf76"; map.font = "bold 10px system-ui,sans-serif";
        map.textAlign = "center"; map.textBaseline = "bottom";
        map.fillText(distance >= 1000 ? `${(distance / 1000).toFixed(1)} KM TO MARK` : `${Math.round(distance)} M TO MARK`, 0, radius - 5);
        map.restore();
      }
      map.restore();
      // Player direction arrow remains fixed at the centre of the rotating map.
      map.save(); map.translate(width / 2, height / 2);
      map.beginPath(); map.moveTo(0, -9); map.lineTo(6, 7); map.lineTo(0, 4); map.lineTo(-6, 7); map.closePath();
      map.fillStyle = "#f3c56f"; map.fill(); map.strokeStyle = "#fff4d8"; map.lineWidth = 1.3; map.stroke();
      map.restore();
      // Radar rim and north/heading tick.
      map.beginPath(); map.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
      map.strokeStyle = "#e3bd7a"; map.lineWidth = 3; map.stroke();
    }
    if (status) status.textContent = inVehicle ? "TAXI · DRIVING" : "GREATER ACCRA · GHANA";

    if (worldMapOpen && worldMapContext && worldMapCanvas && worldMapElapsed >= 0.25) {
      worldMapElapsed = 0;
      const map = worldMapContext, width = worldMapCanvas.width, height = worldMapCanvas.height;
      const bounds = GREATER_ACCRA_MAP_EXTENT, pad = 54;
      const sx = (width - pad * 2) / bounds.widthM, sy = (height - pad * 2) / bounds.depthM;
      const baseScale = Math.min(sx, sy);
      const mapWidth = bounds.widthM * baseScale, mapHeight = bounds.depthM * baseScale;
      const ox = (width - mapWidth) / 2, oy = (height - mapHeight) / 2;
      const current = player.getPosition();
      const playerBaseX = ox + (current.x - bounds.minX) * baseScale;
      const playerBaseY = oy + (bounds.maxZ - current.z) * baseScale;
      const point = (x: number, z: number) => {
        const baseX = ox + (x - bounds.minX) * baseScale;
        const baseY = oy + (bounds.maxZ - z) * baseScale;
        return {
          x: playerBaseX + (baseX - playerBaseX) * worldMapZoom,
          y: playerBaseY + (baseY - playerBaseY) * worldMapZoom
        };
      };
      map.clearRect(0, 0, width, height);
      map.fillStyle = "#10251f"; map.fillRect(0, 0, width, height);
      map.fillStyle = "#123b4a"; map.fillRect(0, oy + (bounds.maxZ + 3050) * baseScale, width, height - oy - (bounds.maxZ + 3050) * baseScale);
      map.fillStyle = "#263c2d"; map.fillRect(ox, oy, mapWidth, mapHeight);
      map.strokeStyle = "#3a5543"; map.lineWidth = 1;
      for (let x = 0; x <= width; x += 55) { map.beginPath(); map.moveTo(x, oy); map.lineTo(x, oy + mapHeight); map.stroke(); }
      for (let y = oy; y <= oy + mapHeight; y += 55) { map.beginPath(); map.moveTo(ox, y); map.lineTo(ox + mapWidth, y); map.stroke(); }
      for (const road of GREATER_ACCRA_ROAD_PATHS) {
        if (!road.playableInFirstRelease) continue;
        map.beginPath();
        road.points.forEach((p, index) => { const q = point(p.x, p.z); if (index === 0) map.moveTo(q.x, q.y); else map.lineTo(q.x, q.y); });
        map.strokeStyle = /^(n1|n4|n6)-/.test(road.roadSegmentId) ? "#e0bd79" : "#aeb9aa";
        map.lineWidth = /^(n1|n4|n6)-/.test(road.roadSegmentId) ? 5 : 2.6;
        map.lineCap = "round"; map.lineJoin = "round"; map.stroke();
      }
      const locations = [
        { name:"MAKOLA MARKET",x:-500,z:350 }, { name:"KANESHIE",x:-2800,z:-250 },
        { name:"CIRCLE",x:-450,z:450 }, { name:"37 / RIDGE",x:1250,z:-350 },
        { name:"AIRPORT CITY",x:1100,z:350 }, { name:"OSU",x:1100,z:-1250 },
        { name:"LABADI BEACH",x:2550,z:-1950 }, { name:"CANTONMENTS",x:1850,z:-250 },
        { name:"EAST LEGON",x:3900,z:2100 }, { name:"TETTEH QUARSHIE",x:3650,z:1750 },
        { name:"MADINA",x:5700,z:1700 }, { name:"ACHIMOTA",x:-1800,z:2200 },
        { name:"DANSOMAN",x:-5100,z:-850 }, { name:"SPINTEX",x:5400,z:-1200 },
        { name:"TEMA",x:8700,z:-850 }, { name:"LEGON",x:3300,z:3400 }
      ];
      for (const place of locations) {
        const p = point(place.x, place.z);
        map.fillStyle = "#f0c574"; map.beginPath(); map.arc(p.x,p.y,5,0,Math.PI*2); map.fill();
        map.font = "bold 13px system-ui,sans-serif"; map.textAlign = "left"; map.textBaseline = "middle";
        map.fillStyle = "#fff4dc"; map.shadowColor = "#07130f"; map.shadowBlur = 4;
        map.fillText(place.name,p.x+9,p.y-2); map.shadowBlur = 0;
      }
      const you = point(current.x,current.z);
      map.fillStyle = "#68e2a0"; map.beginPath(); map.arc(you.x,you.y,9,0,Math.PI*2); map.fill();
      map.strokeStyle = "#f3fff7"; map.lineWidth = 3; map.stroke();
      map.fillStyle = "#f4f0e4"; map.font = "bold 14px system-ui,sans-serif"; map.fillText("YOU",you.x+13,you.y);
      if (worldMapWaypoint) {
        const marked = point(worldMapWaypoint.x, worldMapWaypoint.z);
        map.save();
        map.strokeStyle = "#ffdf76"; map.lineWidth = 4;
        map.beginPath(); map.arc(marked.x,marked.y,11,0,Math.PI*2); map.stroke();
        map.beginPath(); map.moveTo(marked.x-16,marked.y); map.lineTo(marked.x+16,marked.y);
        map.moveTo(marked.x,marked.y-16); map.lineTo(marked.x,marked.y+16); map.stroke();
        map.fillStyle = "#ffdf76"; map.font = "bold 14px system-ui,sans-serif";
        map.textAlign = "left"; map.textBaseline = "bottom"; map.fillText("WAYPOINT",marked.x+15,marked.y-10);
        map.restore();
      }
      const topLeft=point(bounds.minX,bounds.maxZ), bottomRight=point(bounds.maxX,bounds.minZ);
      map.strokeStyle = "#d3b477"; map.lineWidth = 2; map.strokeRect(topLeft.x,topLeft.y,bottomRight.x-topLeft.x,bottomRight.y-topLeft.y);
    }
    if (healthFill) healthFill.style.width = "100%";
    if (healthValue) healthValue.textContent = "100";
  });

  window.addEventListener("resize", () => app.resizeCanvas());
  if (status) status.textContent = "GREATER ACCRA · GHANA";
  loadingMessage && (loadingMessage.textContent = "Ready — welcome to Accra.");
  window.setTimeout(() => loading?.classList.add("done"), 400);
  document.documentElement.dataset.akwantuoPlayCanvasReady = "true";
  document.documentElement.dataset.akwantuoWorldSlice = "osu-labadi-prototype";
}

boot().catch((error) => {
  console.error("AKWANTUO PlayCanvas startup failed", error);
  loadingMessage && (loadingMessage.textContent = "The world could not start. Refresh to retry.");
  document.documentElement.dataset.akwantuoPlayCanvasReady = "false";
});

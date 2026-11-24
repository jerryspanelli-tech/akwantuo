import {
  AppBase, AppOptions, CameraComponentSystem, LightComponentSystem, RenderComponentSystem,
  AnimComponentSystem, ContainerHandler, TextureHandler, Asset, Color, StandardMaterial,
  createGraphicsDevice, DEVICETYPE_WEBGPU, DEVICETYPE_WEBGL2, FILLMODE_FILL_WINDOW,
  RESOLUTION_AUTO, Entity
} from "playcanvas";
import "./style.css";
import { createGreaterAccraWorld } from "./world";
import { GREATER_ACCRA_COASTLINE, GREATER_ACCRA_MAP_EXTENT, GREATER_ACCRA_REGION_ANCHORS, GREATER_ACCRA_ROAD_PATHS } from "../world/greaterAccraLayout";
import { GREATER_ACCRA_LANDMARK_FOOTPRINTS } from "../world/greaterAccraLandmarkData";

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
const navigationGuidance = document.querySelector<HTMLElement>("#navigation-guidance");
const navigationArrow = document.querySelector<HTMLElement>("#navigation-arrow");
const navigationDistance = document.querySelector<HTMLElement>("#navigation-distance");
let navigationTarget: { x: number; z: number; label: string } | null = null;
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
    if (blocker) blockers.push({ x, z, hx: sx * 0.52, hz: sz * 0.52, yaw: 0 });
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
  // ZENVIA Maps receives the same authored Greater Accra geometry and live
  // player transform as the running game; no duplicate map is maintained.
  const zenviaMapStatic = {
    extent: GREATER_ACCRA_MAP_EXTENT,
    coastline: GREATER_ACCRA_COASTLINE.map(({ x, z }) => ({ x, z })),
    roads: GREATER_ACCRA_ROAD_PATHS
      .filter((road) => road.playableInFirstRelease)
      .map((road) => ({ id: road.roadSegmentId, points: road.points })),
    regions: GREATER_ACCRA_REGION_ANCHORS.map((region) => ({
      id: region.regionId, label: region.regionId.replace(/-/g, " ").toUpperCase(), x: region.x, z: region.z
    })),
    landmarks: GREATER_ACCRA_LANDMARK_FOOTPRINTS.map((landmark) => ({
      id: landmark.id, label: landmark.label, x: landmark.x, z: landmark.z,
      minX: landmark.minX, maxX: landmark.maxX, minZ: landmark.minZ, maxZ: landmark.maxZ
    })),
    buildings: blockers.map(({ x, z, hx, hz, yaw }) => ({ x, z, hx, hz, yaw }))
  };

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
  camera.addComponent("camera", { clearColor: new Color(0.68, 0.78, 0.83), fov: 62, farClip: 520 });
  app.root.addChild(camera);

  // Both map modes reuse the existing world camera. No second camera or
  // competing render pass is created; map mode temporarily changes its view.
  const sun = new Entity("Ghana moving sun");
  sun.addComponent("light", { type: "directional", color: new Color(1, 0.82, 0.66), intensity: 1.35, castShadows: true, shadowDistance: 70, shadowResolution: 512 });
  app.root.addChild(sun);

  const sunDiscMaterial = mat(1, 0.78, 0.43);
  sunDiscMaterial.emissive = new Color(1, 0.58, 0.22);
  sunDiscMaterial.update();
  const sunDisc = new Entity("Visible sun");
  sunDisc.addComponent("render", { type: "sphere", material: sunDiscMaterial, castShadows: false, receiveShadows: false });
  sunDisc.setLocalScale(10, 10, 10);
  app.root.addChild(sunDisc);

  const moonMaterial = mat(0.78, 0.84, 0.96);
  moonMaterial.emissive = new Color(0.34, 0.40, 0.58);
  moonMaterial.update();
  const moon = new Entity("Visible moon");
  moon.addComponent("render", { type: "sphere", material: moonMaterial, castShadows: false, receiveShadows: false });
  moon.setLocalScale(7, 7, 7);
  app.root.addChild(moon);
  const moonLight = new Entity("Moonlight");
  moonLight.addComponent("light", { type: "directional", color: new Color(0.48, 0.58, 0.82), intensity: 0.18, castShadows: false });
  app.root.addChild(moonLight);

  // A lightweight fixed star field. The stars follow the player so they remain
  // visible on the sky dome without requiring an expensive skybox on mobile.
  const starMaterial = mat(0.78, 0.84, 1);
  starMaterial.emissive = new Color(0.68, 0.76, 1);
  starMaterial.update();
  const stars: Entity[] = [];
  for (let i = 0; i < 54; i++) {
    const star = new Entity("Night sky star");
    star.addComponent("render", { type: "sphere", material: starMaterial, castShadows: false, receiveShadows: false });
    const size = i % 7 === 0 ? 1.15 : 0.62;
    star.setLocalScale(size, size, size);
    star.enabled = false;
    app.root.addChild(star);
    stars.push(star);
  }

  // Start at the real local time in Accra (GMT), then run the in-game clock
  // at 60x so a complete Ghana day/night cycle lasts 24 real-world minutes.
  const accraTimeParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Accra", hour: "2-digit", minute: "2-digit",
    second: "2-digit", hourCycle: "h23"
  }).formatToParts(new Date());
  const timePart = (type: string) => Number(accraTimeParts.find((part) => part.type === type)?.value ?? 0);
  let worldClock = timePart("hour") * 3600 + timePart("minute") * 60 + timePart("second");
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

  // Drivable sports car. Keep a lightweight fallback until the detailed GLB
  // is ready, then replace only the visual child; the vehicle controller,
  // collision footprint, enter/exit and camera remain unchanged.
  const vehicle = new Entity("AKWANTUO Sports Car");
  const vehiclePlaceholder = new Entity("Sports car loading fallback");
  vehicle.addChild(vehiclePlaceholder);
  // Do not show box/cylinder stand-ins: the drivable vehicle visual is the imported sports-car GLB.
  vehiclePlaceholder.enabled = false;
  const vehicleBody = new Entity("Fallback sports car body");
  vehicleBody.addComponent("render", { type: "box", material: materials.vehicle, castShadows: true, receiveShadows: true });
  vehicleBody.setLocalScale(2.06, 0.62, 4.6);
  vehicleBody.setLocalPosition(0, 0.64, 0);
  vehiclePlaceholder.addChild(vehicleBody);
  const fallbackCabin = new Entity("Fallback sports car cabin");
  fallbackCabin.addComponent("render", { type: "box", material: materials.glass });
  fallbackCabin.setLocalScale(1.55, 0.56, 1.8);
  fallbackCabin.setLocalPosition(0, 1.17, -0.12);
  vehiclePlaceholder.addChild(fallbackCabin);
  for (const x of [-0.94, 0.94]) for (const z of [-1.48, 1.48]) {
    const wheel = new Entity("Fallback sports car wheel");
    wheel.addComponent("render", { type: "cylinder", material: materials.tyre, castShadows: true, receiveShadows: true });
    wheel.setLocalScale(0.66, 0.24, 0.66);
    wheel.setLocalEulerAngles(0, 0, 90);
    wheel.setLocalPosition(x, 0.36, z);
    vehiclePlaceholder.addChild(wheel);
  }
  vehicle.setPosition(world.taxiSpawn.x, 0, world.taxiSpawn.z);
  app.root.addChild(vehicle);

  // CC0 mid-engine supercar, LOD1 (44,632 triangles / about 1.9 MB):
  // detailed body, glass engine cover, lights, intakes, rims and brake details.
  // Fit the imported model from its measured bounds so its lowest point
  // (the tyres) rests just above the road plane instead of hovering or clipping.
  const sportsCarAssetPromise = new Promise<Asset>((resolve, reject) => {
    app.assets.loadFromUrl(
      "https://tevy.dev/models/supercar/v2/lod1.glb",
      "container",
      (error, asset) => {
        if (error || !asset?.resource) reject(error ?? new Error("Sports car GLB returned no container resource."));
        else resolve(asset);
      }
    );
  });
  void sportsCarAssetPromise.then((loadedAsset) => {
    const container = loadedAsset.resource as any;
    const sportsCar = container.instantiateRenderEntity({ castShadows: true });
    sportsCar.name = "Detailed pearl-orange mid-engine sports car";
    sportsCar.enabled = true;
    vehicle.addChild(sportsCar);
    sportsCar.syncHierarchy();

    const meshInstances: any[] = [];
    const collectMeshes = (node: any) => {
      node.enabled = true;
      for (const meshInstance of node.render?.meshInstances ?? []) {
        meshInstance.visible = true;
        meshInstances.push(meshInstance);
      }
      for (const child of node.children ?? []) collectMeshes(child);
    };
    collectMeshes(sportsCar);
    if (meshInstances.length === 0) {
      sportsCar.destroy();
      throw new Error("Sports car GLB contains no visible render meshes.");
    }

    // Mesh AABBs are measured after hierarchy sync. Center the model over the
    // vehicle controller and lift/lower it by its actual lowest mesh point.
    let minX = Number.POSITIVE_INFINITY, maxX = Number.NEGATIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY, maxY = Number.NEGATIVE_INFINITY;
    let minZ = Number.POSITIVE_INFINITY, maxZ = Number.NEGATIVE_INFINITY;
    for (const meshInstance of meshInstances) {
      const bounds = meshInstance.aabb;
      minX = Math.min(minX, bounds.getMin().x);
      minY = Math.min(minY, bounds.getMin().y);
      minZ = Math.min(minZ, bounds.getMin().z);
      maxX = Math.max(maxX, bounds.getMax().x);
      maxY = Math.max(maxY, bounds.getMax().y);
      maxZ = Math.max(maxZ, bounds.getMax().z);
    }
    const vehicleOrigin = vehicle.getPosition();
    // AABBs are world-space because the parent vehicle is already at its
    // spawn coordinates; convert the measured correction back to local space.
    sportsCar.setLocalPosition(
      vehicleOrigin.x - (minX + maxX) * 0.5,
      vehicleOrigin.y - minY + 0.035,
      vehicleOrigin.z - (minZ + maxZ) * 0.5
    );
    sportsCar.syncHierarchy();
    vehiclePlaceholder.enabled = false;
    document.documentElement.dataset.akwantuoVehicleModel = "sports-car-3d";
    console.info("[AKWANTUO] Detailed sports car loaded and grounded", {
      meshCount: meshInstances.length,
      bounds: { width: maxX - minX, height: maxY - minY, length: maxZ - minZ },
      groundClearance: 0.035
    });
  }).catch((error) => {
    document.documentElement.dataset.akwantuoVehicleModel = "fallback";
    console.error("[AKWANTUO] Sports car GLB failed to load; retaining drivable fallback.", error);
  });

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
  canvas.addEventListener("pointerdown", (event) => {
    dragPointer = event.pointerId; lastX = event.clientX; lastY = event.clientY;
  });
  window.addEventListener("pointermove", (event) => {
    if (dragPointer !== event.pointerId) return;
    cameraYaw -= (event.clientX - lastX) * 0.22;
    cameraPitch = clamp(cameraPitch + (event.clientY - lastY) * 0.12, -35, 65);
    lastX = event.clientX; lastY = event.clientY;
  });
  window.addEventListener("pointerup", (event) => {
    if (dragPointer === event.pointerId) dragPointer = null;
  });

  const walkSpeed = 4.6, sprintSpeed = 8.2;
  let inVehicle = false, vehicleSpeed = 0, vehicleYaw = 0;

  const zenviaMapSubscribers = new Set<Window>();
  window.addEventListener("message", (event: MessageEvent) => {
    if (event.origin !== window.location.origin || !event.source || event.source === window) return;
    const message = event.data as { type?: string; payload?: { x?: number; z?: number; label?: string } | null };
    const source = event.source as Window;
    if (message?.type === "ZENVIA_MAP_DESTINATION") {
      const payload = message.payload;
      if (payload === null) {
        navigationTarget = null;
        if (navigationGuidance) navigationGuidance.hidden = true;
      } else if (payload && Number.isFinite(payload.x) && Number.isFinite(payload.z)) {
        navigationTarget = { x: Number(payload.x), z: Number(payload.z), label: String(payload.label || "Destination") };
        if (navigationGuidance) navigationGuidance.hidden = false;
      }
      return;
    }
    if (message?.type === "ZENVIA_MAP_CLOSE") {
      zenviaMapSubscribers.delete(source);
      return;
    }
    if (message?.type !== "ZENVIA_MAP_REQUEST") return;
    zenviaMapSubscribers.add(source);
    source.postMessage({ type: "ZENVIA_MAP_STATIC", payload: zenviaMapStatic }, event.origin);
    const position = inVehicle ? vehicle.getPosition() : player.getPosition();
    const rawHeading = inVehicle ? vehicle.getEulerAngles().y : cameraYaw;
    const heading = ((rawHeading % 360) + 360) % 360;
    source.postMessage({ type: "ZENVIA_MAP_STATE", payload: { x: position.x, z: position.z, heading, inVehicle } }, event.origin);
  });
  let zenviaMapElapsed = 0;
  let nearbyInteraction: { id: string; label: string; x: number; z: number; radius: number } | null = null;
  const overlaps = (x: number, z: number) => {
    // Test the player's position in each building's local footprint. Rotated
    // buildings must not create oversized invisible collision barriers.
    const buildingCollision = blockers.some((b) => {
      const radians = b.yaw * Math.PI / 180;
      const dx = x - b.x, dz = z - b.z;
      const localX = dx * Math.cos(radians) - dz * Math.sin(radians);
      const localZ = dx * Math.sin(radians) + dz * Math.cos(radians);
      return Math.abs(localX) < b.hx + 0.38 && Math.abs(localZ) < b.hz + 0.38;
    });
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

  let elapsed = 0;
  app.on("update", (dt: number) => {
    const step = Math.min(dt, 0.05);
    worldClock = (worldClock + step * 60) % 86400;
    const hourOfDay = worldClock / 3600;
    // Accra sunrise is around 06:00 and sunset around 18:00. Smooth the
    // transition through golden hour and twilight rather than switching abruptly.
    const solarAngle = ((hourOfDay - 6) / 12) * Math.PI;
    const sunElevation = Math.sin(solarAngle);
    const daylightRaw = clamp((sunElevation + 0.14) / 0.38, 0, 1);
    const daylight = daylightRaw * daylightRaw * (3 - 2 * daylightRaw);
    const night = 1 - daylight;
    world.update(step, night);
    if (sun.light) {
      sun.light.intensity = 0.025 + daylight * 1.45;
      sun.setEulerAngles(90 - sunElevation * 72, hourOfDay * 15 + 90, 0);
    }
    if (moonLight.light) moonLight.light.intensity = 0.025 + night * 0.24;
    const focusForSky = inVehicle ? vehicle.getPosition() : player.getPosition();
    const sunX = Math.cos(solarAngle) * 210;
    const sunY = Math.max(-35, sunElevation * 175);
    sunDisc.setPosition(focusForSky.x + sunX, focusForSky.y + sunY + 35, focusForSky.z - 35);
    moon.setPosition(focusForSky.x - sunX, focusForSky.y + Math.max(20, -sunElevation * 155) + 35, focusForSky.z + 35);
    moonLight.setEulerAngles(42, hourOfDay * 15 + 270, 0);
    const starsVisible = night > 0.48;
    const starFade = clamp((night - 0.35) / 0.5, 0, 1);
    for (let i = 0; i < stars.length; i++) {
      const star = stars[i];
      star.enabled = starsVisible;
      if (starsVisible) {
        // Deterministic golden-angle distribution across the upper sky.
        const angle = i * 2.399963229728653;
        const y = 55 + (i % 9) * 15;
        const ring = Math.sqrt(Math.max(0, 1 - (y / 220) ** 2)) * 205;
        star.setPosition(focusForSky.x + Math.cos(angle) * ring, focusForSky.y + y, focusForSky.z + Math.sin(angle) * ring);
      }
    }
    app.scene.ambientLight = new Color(
      0.035 + daylight * 0.445 + starFade * 0.025,
      0.045 + daylight * 0.405 + starFade * 0.035,
      0.085 + daylight * 0.305 + starFade * 0.075
    );
    if (camera.camera) {
      camera.camera.clearColor = new Color(
        0.006 + daylight * 0.57 + starFade * 0.018,
        0.012 + daylight * 0.66 + starFade * 0.025,
        0.035 + daylight * 0.68 + starFade * 0.055
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
        const playerHeading = Math.atan2(dx, dz);
        player.setEulerAngles(0, playerHeading * 180 / Math.PI, 0);
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
    if (navigationTarget && navigationGuidance && navigationArrow) {
      const dx = navigationTarget.x - focus.x;
      const dz = navigationTarget.z - focus.z;
      const distance = Math.hypot(dx, dz);
      const bearing = Math.atan2(dx, dz) * 180 / Math.PI;
      const relativeBearing = ((bearing - cameraYaw) % 360 + 360) % 360;
      navigationArrow.style.transform = "rotate(" + relativeBearing + "deg)";
      if (navigationDistance) {
        navigationDistance.textContent = distance <= 5
          ? "DESTINATION REACHED"
          : Math.round(distance).toLocaleString() + " m · " + navigationTarget.label;
      }
      navigationGuidance.classList.toggle("arrived", distance <= 5);
      navigationGuidance.hidden = false;
    }
    const height = inVehicle ? 4.4 : 3.6;
    const cameraYawRadians = cameraYaw * Math.PI / 180;
    const cameraPitchRadians = cameraPitch * Math.PI / 180;
    const cameraDistance = inVehicle ? 10 : 7.5;
    const cameraHorizontal = cameraDistance * Math.cos(cameraPitchRadians);
    camera.setPosition(
      focus.x - Math.sin(cameraYawRadians) * cameraHorizontal,
      focus.y + height + cameraDistance * Math.sin(cameraPitchRadians),
      focus.z - Math.cos(cameraYawRadians) * cameraHorizontal
    );
    camera.lookAt(focus.x, focus.y + (inVehicle ? 1.2 : 1.5), focus.z);
    if (elapsed > 0.10) { updateButtons(); elapsed = 0; }
    elapsed += step;
    zenviaMapElapsed += step;
    if (zenviaMapElapsed >= 0.08 && zenviaMapSubscribers.size) {
      zenviaMapElapsed = 0;
      const mapPosition = inVehicle ? vehicle.getPosition() : player.getPosition();
      const rawMapHeading = inVehicle ? vehicle.getEulerAngles().y : cameraYaw;
      const mapHeading = ((rawMapHeading % 360) + 360) % 360;
      const mapState = { type: "ZENVIA_MAP_STATE", payload: { x: mapPosition.x, z: mapPosition.z, heading: mapHeading, inVehicle } };
      for (const subscriber of zenviaMapSubscribers) {
        try {
          if (subscriber.closed) zenviaMapSubscribers.delete(subscriber);
          else subscriber.postMessage(mapState, window.location.origin);
        } catch { zenviaMapSubscribers.delete(subscriber); }
      }
    }
    if (status) status.textContent = inVehicle ? "TAXI · DRIVING" : "GREATER ACCRA · GHANA";

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

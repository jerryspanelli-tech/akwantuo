import {
  AppBase, AppOptions, CameraComponentSystem, LightComponentSystem, RenderComponentSystem,
  AnimComponentSystem, ContainerHandler, TextureHandler, Asset, Color, StandardMaterial,
  createGraphicsDevice, DEVICETYPE_WEBGPU, DEVICETYPE_WEBGL2, FILLMODE_FILL_WINDOW,
  RESOLUTION_AUTO, Entity
} from "playcanvas";
import "./style.css";
import { createGreaterAccraWorld } from "./world";
import { GREATER_ACCRA_ROAD_PATHS } from "../world/greaterAccraLayout";

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
const stick = document.querySelector<HTMLElement>("#stick");
const stickKnob = document.querySelector<HTMLElement>("#stick-knob");
const notice = document.querySelector<HTMLElement>("#notice");
const minimap = document.querySelector<HTMLCanvasElement>("#minimap");
const minimapContext = minimap?.getContext("2d") ?? null;

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
    skin: mat(0.31, 0.16, 0.095), shirt: mat(0.12, 0.29, 0.20), trousers: mat(0.07, 0.09, 0.10),
    tyre: mat(0.025, 0.03, 0.03), vehicle: mat(0.78, 0.67, 0.34)
  };

  loadingMessage && (loadingMessage.textContent = "Building Greater Accra roads, districts and coastline…");
  const world = createGreaterAccraWorld(app);
  const blockers = world.blockers;

  loadingMessage && (loadingMessage.textContent = "Preparing the player and vehicle…");
  const player = new Entity("Player");
  const fallback = new Entity("Player fallback body");
  const torso = new Entity("Torso"); torso.addComponent("render", { type: "capsule", material: materials.shirt }); torso.setLocalScale(0.55, 0.9, 0.38); torso.setPosition(0, 1.2, 0); fallback.addChild(torso);
  const head = new Entity("Head"); head.addComponent("render", { type: "sphere", material: materials.skin }); head.setLocalScale(0.34, 0.34, 0.34); head.setPosition(0, 1.9, 0); fallback.addChild(head);
  const leftLeg = new Entity("Left leg"); leftLeg.addComponent("render", { type: "capsule", material: materials.trousers }); leftLeg.setLocalScale(0.19, 0.58, 0.2); leftLeg.setPosition(-0.16, 0.55, 0); fallback.addChild(leftLeg);
  const rightLeg = new Entity("Right leg"); rightLeg.addComponent("render", { type: "capsule", material: materials.trousers }); rightLeg.setLocalScale(0.19, 0.58, 0.2); rightLeg.setPosition(0.16, 0.55, 0); fallback.addChild(rightLeg);
  const leftArm = new Entity("Left arm"); leftArm.addComponent("render", { type: "capsule", material: materials.skin }); leftArm.setLocalScale(0.15, 0.68, 0.16); leftArm.setPosition(-0.39, 1.2, 0); fallback.addChild(leftArm);
  const rightArm = new Entity("Right arm"); rightArm.addComponent("render", { type: "capsule", material: materials.skin }); rightArm.setLocalScale(0.15, 0.68, 0.16); rightArm.setPosition(0.39, 1.2, 0); fallback.addChild(rightArm);
  player.addChild(fallback);
  player.setPosition(world.spawn.x, 0, world.spawn.z);
  app.root.addChild(player);

  // Load the project's own CC0 character model when it is present. The visible
  // fallback remains until the GLB is fully instantiated and never disappears on failure.
  const modelUrl = new URL("./assets/characters/akwantuo-male.glb", window.location.href).toString();
  const modelAsset = new Asset("AKWANTUO player character", "container", { url: modelUrl });
  let loadedCharacter: Entity | null = null;
  let idleClipName: string | null = null;
  let walkClipName: string | null = null;
  let activeClipName: string | null = null;
  app.assets.add(modelAsset);
  modelAsset.ready(() => {
    try {
      const container = modelAsset.resource as any;
      const model = container.instantiateRenderEntity({ castShadows: true });
      model.name = "Loaded Ghanaian player character";
      model.setLocalScale(1, 1, 1);
      model.enabled = false;
      model.addComponent("anim", { activate: true });
      player.addChild(model);
      loadedCharacter = model;
      const loadClipContainer = (file: string) => new Promise<any>((resolve, reject) => {
        const clipAsset = new Asset(file, "container", { url: new URL(`./assets/characters/${file}`, window.location.href).toString() });
        clipAsset.ready(() => resolve(clipAsset.resource));
        clipAsset.on("error", (error: unknown) => reject(error));
        app.assets.add(clipAsset);
        app.assets.load(clipAsset);
      });
      void Promise.allSettled([loadClipContainer("idle.glb"), loadClipContainer("walk.glb")]).then((clipResults) => {
        const idleContainer = clipResults[0].status === "fulfilled" ? clipResults[0].value : null;
        const walkContainer = clipResults[1].status === "fulfilled" ? clipResults[1].value : null;
        const clips = [...(idleContainer?.animations ?? []), ...(walkContainer?.animations ?? []), ...(container.animations ?? [])];
        for (const animation of clips) model.anim.assignAnimation(animation.resource.name, animation.resource);
        idleClipName = clips.find((a: any) => /idle/i.test(a.resource.name))?.resource.name ?? null;
        walkClipName = clips.find((a: any) => /walk|run/i.test(a.resource.name))?.resource.name ?? null;
        if (idleClipName) {
          model.anim.baseLayer.play(idleClipName);
          activeClipName = idleClipName;
          model.enabled = true;
          fallback.enabled = false;
          showNotice("Player character and idle animation loaded");
          document.documentElement.dataset.akwantuoPlayerModel = "animated";
        } else {
          console.warn("No compatible idle animation was found; keeping the animated fallback visible.");
          document.documentElement.dataset.akwantuoPlayerModel = "fallback";
        }
      });
    } catch (error) {
      console.error("AKWANTUO character instantiation failed", error);
      document.documentElement.dataset.akwantuoPlayerModel = "fallback";
    }
  });
  modelAsset.on("error", (error: unknown) => {
    console.warn("AKWANTUO character GLB unavailable; keeping visible fallback", error);
    document.documentElement.dataset.akwantuoPlayerModel = "fallback";
  });
  app.assets.load(modelAsset);

  const camera = new Entity("Third person camera");
  camera.addComponent("camera", { clearColor: new Color(0.68, 0.78, 0.83), fov: 62, farClip: 260 });
  app.root.addChild(camera);
  const sun = new Entity("Ghana afternoon sun");
  sun.addComponent("light", { type: "directional", color: new Color(1, 0.82, 0.66), intensity: 1.35, castShadows: true, shadowDistance: 70, shadowResolution: 512 });
  sun.setEulerAngles(48, 32, 0);
  app.root.addChild(sun);

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
  let jumpRequested = false, verticalVelocity = 0, grounded = true;
  const groundHeight = 0;
  const requestJump = () => { if (!inVehicle && grounded) { jumpRequested = true; jumpButton?.classList.add("pressed"); } };
  jumpButton?.addEventListener("pointerdown", (event) => { event.preventDefault(); requestJump(); });
  jumpButton?.addEventListener("pointerup", () => jumpButton.classList.remove("pressed"));
  jumpButton?.addEventListener("pointercancel", () => jumpButton.classList.remove("pressed"));
  jumpButton?.addEventListener("click", requestJump);
  const updateStick = (event: PointerEvent) => {
    const rect = stick!.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    const radius = rect.width * 0.36;
    const length = Math.hypot(dx, dy);
    const scale = length > radius ? radius / length : 1;
    const x = dx * scale, y = dy * scale;
    stickX = Math.abs(x / radius) < 0.12 ? 0 : x / radius;
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
  let inVehicle = false, vehicleSpeed = 0, vehicleYaw = 0, gaitTime = 0;
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
    const available = inVehicle || taxiAvailable || !!nearbyInteraction;
    if (interactButton) {
      interactButton.hidden = !available;
      interactButton.classList.toggle("available", available && !inVehicle);
      interactButton.setAttribute("aria-label", inVehicle ? "Drive" : taxiAvailable ? "Enter taxi" : nearbyInteraction?.label ?? "Interact");
    }
    if (contextLabel) {
      const label = inVehicle ? "DRIVING" : taxiAvailable ? "ENTER TAXI" : nearbyInteraction?.label ?? "";
      contextLabel.textContent = label;
      contextLabel.classList.toggle("visible", !!label);
    }
    if (exitButton) exitButton.hidden = !inVehicle;
    if (jumpButton) jumpButton.hidden = inVehicle;
    if (stick) stick.classList.toggle("sprinting", !inVehicle && Math.hypot(stickX, stickY) >= 0.84);
  };
  const enter = () => {
    if (inVehicle) { inVehicle = false; const p = vehicle.getPosition(); player.setPosition(p.x - 2.4, 0, p.z); player.enabled = true; vehicleSpeed = 0; grounded = true; showNotice("You exited the taxi"); }
    else if (canEnter()) { inVehicle = true; const p = vehicle.getPosition(); player.setPosition(p.x, 0, p.z); player.enabled = false; vehicleSpeed = 0; showNotice("Taxi entered · drive with the joystick"); }
    else if (nearbyInteraction) { showNotice(nearbyInteraction.label === "USE BENCH" ? "Bench interaction selected" : nearbyInteraction.label); }
    updateButtons();
  };
  interactButton?.addEventListener("click", enter);
  exitButton?.addEventListener("click", enter);
  window.addEventListener("keydown", (event) => {
    if (event.code === "KeyE" && !event.repeat) enter();
    if (event.code === "Space" && !event.repeat) requestJump();
  });

  let elapsed = 0, mapElapsed = 0;
  app.on("update", (dt: number) => {
    const step = Math.min(dt, 0.05);
    const forward = (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0) - (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0) - stickY;
    const strafe = (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) - (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0) + stickX;
    if (inVehicle) {
      const throttle = clamp(forward, -1, 1);
      const steer = clamp(strafe, -1, 1);
      vehicleSpeed = clamp(vehicleSpeed + throttle * 8 * step, -3, 14);
      vehicleSpeed *= Math.max(0, 1 - step * (Math.abs(throttle) < 0.1 ? 1.6 : 0.22));
      vehicleYaw += steer * (vehicleSpeed / 4.2) * step;
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
        const dx = (moveStrafe * Math.cos(angle) - moveForward * Math.sin(angle)) * speed * step;
        const dz = (moveForward * Math.cos(angle) + moveStrafe * Math.sin(angle)) * speed * step;
        const p = player.getPosition();
        const nx = clamp(p.x + dx, -8000, 13000), nz = clamp(p.z + dz, -4050, 8500);
        if (!overlaps(nx, p.z)) player.setPosition(nx, p.y, p.z);
        if (!overlaps(player.getPosition().x, nz)) player.setPosition(player.getPosition().x, p.y, nz);
        player.setEulerAngles(0, Math.atan2(dx, dz) * 180 / Math.PI, 0);
        gaitTime += step * 9;
        if (loadedCharacter?.anim && walkClipName && activeClipName !== walkClipName) { loadedCharacter.anim.baseLayer?.transition(walkClipName, 0.18); activeClipName = walkClipName; }
        leftLeg.setLocalEulerAngles(Math.sin(gaitTime) * 26, 0, 0);
        rightLeg.setLocalEulerAngles(-Math.sin(gaitTime) * 26, 0, 0);
        leftArm.setLocalEulerAngles(-Math.sin(gaitTime) * 18, 0, 0);
        rightArm.setLocalEulerAngles(Math.sin(gaitTime) * 18, 0, 0);
      } else {
        if (loadedCharacter?.anim && idleClipName && activeClipName !== idleClipName) { loadedCharacter.anim.baseLayer?.transition(idleClipName, 0.2); activeClipName = idleClipName; }
        leftLeg.setLocalEulerAngles(0, 0, 0); rightLeg.setLocalEulerAngles(0, 0, 0);
        leftArm.setLocalEulerAngles(0, 0, 0); rightArm.setLocalEulerAngles(0, 0, 0);
      }
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
      const center = inVehicle ? vehicle.getPosition() : player.getPosition();
      const width = minimap.width, height = minimap.height, scale = 0.105;
      map.clearRect(0, 0, width, height);
      map.fillStyle = "#10231d"; map.fillRect(0, 0, width, height);
      map.save(); map.beginPath(); map.arc(width / 2, height / 2, width * 0.46, 0, Math.PI * 2); map.clip();
      for (const path of GREATER_ACCRA_ROAD_PATHS) {
        if (!path.playableInFirstRelease) continue;
        map.beginPath();
        path.points.forEach((point, index) => {
          const x = width / 2 + (point.x - center.x) * scale;
          const y = height / 2 - (point.z - center.z) * scale;
          if (index === 0) map.moveTo(x, y); else map.lineTo(x, y);
        });
        map.strokeStyle = /^(n1|n4|n6)-/.test(path.roadSegmentId) ? "#d0b477" : "#82918a";
        map.lineWidth = /^(n1|n4|n6)-/.test(path.roadSegmentId) ? 3.5 : 2;
        map.stroke();
      }
      if (!inVehicle) {
        const vp = vehicle.getPosition();
        map.fillStyle = "#61b88b"; map.beginPath(); map.arc(width / 2 + (vp.x - center.x) * scale, height / 2 - (vp.z - center.z) * scale, 4, 0, Math.PI * 2); map.fill();
      }
      map.fillStyle = "#f0c36e"; map.beginPath(); map.arc(width / 2, height / 2, 5, 0, Math.PI * 2); map.fill();
      map.strokeStyle = "#fff2d2"; map.lineWidth = 1.5; map.stroke();
      map.restore();
    }
    if (status) status.textContent = inVehicle ? "TAXI · DRIVING" : "OSU · EXPLORATION";
    if (objective) objective.textContent = inVehicle ? "Drive towards Labadi Beach" : "Explore Osu and find the taxi";
    if (hint) hint.textContent = inVehicle ? "Joystick: steer and accelerate · EXIT to leave" : "Push fully to sprint · Tap ↑ to jump · Drag to look";
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

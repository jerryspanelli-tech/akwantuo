import {
  AppBase, AppOptions, CameraComponentSystem, LightComponentSystem, RenderComponentSystem,
  AnimComponentSystem, ContainerHandler, TextureHandler, Asset, Color, StandardMaterial,
  createGraphicsDevice, DEVICETYPE_WEBGPU, DEVICETYPE_WEBGL2, FILLMODE_FILL_WINDOW,
  RESOLUTION_AUTO, Entity
} from "playcanvas";
import "./style.css";

const canvas = document.querySelector<HTMLCanvasElement>("#application")!;
const loading = document.querySelector<HTMLElement>("#loading");
const loadingMessage = document.querySelector<HTMLElement>("#loading-message");
const status = document.querySelector<HTMLElement>("#world-status");
const objective = document.querySelector<HTMLElement>("#objective");
const hint = document.querySelector<HTMLElement>("#hint");
const interactButton = document.querySelector<HTMLButtonElement>("#interact");
const exitButton = document.querySelector<HTMLButtonElement>("#exit");
const stick = document.querySelector<HTMLElement>("#stick");
const stickKnob = document.querySelector<HTMLElement>("#stick-knob");
const notice = document.querySelector<HTMLElement>("#notice");

if (!canvas) throw new Error("AKWANTUO PlayCanvas canvas is missing.");

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const showNotice = (message: string) => {
  if (!notice) return;
  notice.textContent = message;
  notice.classList.add("show");
  window.setTimeout(() => notice.classList.remove("show"), 1700);
};

type Blocker = { x: number; z: number; hx: number; hz: number };
const blockers: Blocker[] = [];
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
  app.scene.ambientLight = new Color(0.38, 0.39, 0.34);
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

  loadingMessage && (loadingMessage.textContent = "Shaping the Accra coastline…");
  addPlane("Greater Accra ground", 0, -0.16, 0, 180, 180, materials.soil);
  addPlane("Osu green verge west", -30, -0.08, 2, 22, 100, materials.grass);
  addPlane("Osu green verge east", 30, -0.08, 2, 22, 100, materials.grass);
  addPlane("Gulf of Guinea", 0, -0.12, -78, 180, 70, materials.sea);
  addPlane("Labadi beach sand", 0, -0.04, -42, 180, 22, materials.sand);
  // A compact, connected two-street slice with Ghana-style road markings.
  addPlane("Oxford Street / Osu", 0, 0.01, 5, 13, 112, materials.road);
  addPlane("Coastal road", 0, 0.015, -24, 110, 10, materials.road);
  for (let z = -48; z < 55; z += 8) addBox("Road centre dash", 0, 0.035, z, 0.16, 0.025, 3.8, materials.lane);
  for (let x = -48; x < 50; x += 8) addBox("Coastal centre dash", x, 0.04, -24, 3.8, 0.025, 0.16, materials.lane);
  for (const x of [-6.8, 6.8]) addBox("Raised road kerb", x, 0.12, 5, 0.28, 0.24, 112, materials.kerb);
  for (const z of [-29, -19]) addBox("Coastal road edge", 0, 0.12, z, 110, 0.24, 0.22, materials.kerb);

  loadingMessage && (loadingMessage.textContent = "Building Osu streets and landmarks…");
  // Dense mixed-use street fronts: shops, flats, kiosks and a market court.
  const buildings = [
    [-15, 6, 10, 12, 9, 15, "Shop block"], [-27, 9, 10, 18, 12, 14, "Apartment block"],
    [15, 7, 10, 13, 11, 16, "Mixed-use block"], [28, 8, 10, 18, 13, 14, "Office block"],
    [-17, 6, -7, 12, 9, 11, "Corner shop"], [17, 6, -7, 12, 9, 11, "Restaurant"],
    [-34, 7, -5, 15, 11, 18, "Market hall"], [35, 8, -5, 15, 13, 18, "Hotel"]
  ] as const;
  for (const [x, y, z, sx, sy, sz, name] of buildings) {
    addBox(name, x, y, z, sx, sy, sz, materials.concrete, true);
    addBox(name + " roof", x, y + sy / 2 + 0.18, z, sx + 0.3, 0.35, sz + 0.3, materials.roof);
    for (let floor = 0; floor < Math.max(2, Math.floor(sy / 3)); floor++) {
      addBox(name + " facade window band", x, 2.2 + floor * 2.5, z + sz / 2 + 0.025, sx * 0.72, 0.75, 0.08, materials.glass);
    }
  }
  // Ghanaian roadside kiosk and fuel station forecourt.
  addBox("Roadside kiosk", -10, 1.2, 36, 5, 2.4, 4, materials.green, true);
  addBox("Kiosk awning", -10, 2.55, 36, 5.8, 0.22, 4.8, materials.red);
  addPlane("Fuel station forecourt", 43, 0.02, 31, 25, 20, materials.concrete);
  addBox("Fuel station canopy", 43, 4.5, 31, 22, 0.45, 14, materials.red);
  for (const x of [37, 43, 49]) addBox("Fuel pump", x, 1.1, 31, 0.8, 2.2, 0.8, materials.white, true);
  // Landmark: original AKWANTUO Creative Arts Centre, not a copy of a real venue.
  addCylinder("Creative arts centre main hall", 0, 5, 66, 11, 10, materials.concrete);
  addCylinder("Creative arts centre roof ring", 0, 10.3, 66, 12, 0.7, materials.gold);
  addBox("Arts centre entrance", 0, 2.1, 54, 8, 4.2, 1.1, materials.glass);
  // Beach access, palms, kiosks, lifeguard hut and marina.
  for (const x of [-65, -48, 48, 65]) {
    addCylinder("Palm trunk", x, 3.4, -42, 0.34, 6.8, materials.roof);
    addCylinder("Palm crown", x, 7.1, -42, 2.4, 1.2, materials.green);
  }
  addBox("Beach kiosk", -22, 1.3, -42, 5, 2.6, 4, materials.red, true);
  addBox("Lifeguard hut", 22, 1.8, -42, 4, 3.6, 4, materials.white, true);
  addBox("Labadi marina pier", 42, 0.15, -58, 4, 0.3, 25, materials.roof);
  // Sign structures; labels are also mirrored in the accessible HUD.
  addBox("Osu district sign post", -8, 2.4, 48, 0.35, 4.8, 0.35, materials.roof);
  addBox("Osu district sign board", -8, 4.4, 48, 6.5, 1.4, 0.25, materials.green);
  addBox("Labadi beach sign post", 9, 2.4, -36, 0.3, 4.8, 0.3, materials.roof);
  addBox("Labadi beach sign board", 9, 4.4, -36, 6.8, 1.4, 0.25, materials.gold);

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
  player.setPosition(-1.8, 0, 28);
  app.root.addChild(player);

  // Load the project's own CC0 character model when it is present. The visible
  // fallback remains until the GLB is fully instantiated and never disappears on failure.
  const presentation: "masculine" | "feminine" = "masculine";
  const modelUrl = new URL(`./assets/characters/akwantuo-${presentation === "feminine" ? "female" : "male"}.glb`, window.location.href).toString();
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
  camera.addComponent("camera", { clearColor: new Color(0.55, 0.68, 0.72), fov: 62, farClip: 260 });
  app.root.addChild(camera);
  const sun = new Entity("Ghana afternoon sun");
  sun.addComponent("light", { type: "directional", color: new Color(1, 0.88, 0.72), intensity: 1.5, castShadows: true, shadowDistance: 95, shadowResolution: 1024 });
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
  vehicle.setPosition(5, 0, 16);
  app.root.addChild(vehicle);

  const keys = new Set<string>();
  window.addEventListener("keydown", (event) => { keys.add(event.code); if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].includes(event.code)) event.preventDefault(); });
  window.addEventListener("keyup", (event) => keys.delete(event.code));
  window.addEventListener("blur", () => keys.clear());

  let stickX = 0, stickY = 0, stickPointer: number | null = null;
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

  let inVehicle = false, vehicleSpeed = 0, vehicleYaw = 0, gaitTime = 0;
  const playerSpeed = 5.1;
  const overlaps = (x: number, z: number) => blockers.some((b) => Math.abs(x - b.x) < b.hx + 0.38 && Math.abs(z - b.z) < b.hz + 0.38);
  const canEnter = () => Math.hypot(player.getPosition().x - vehicle.getPosition().x, player.getPosition().z - vehicle.getPosition().z) < 4.3;
  const updateButtons = () => {
    if (interactButton) { interactButton.hidden = !inVehicle && !canEnter(); interactButton.textContent = inVehicle ? "DRIVE" : "ENTER TAXI"; }
    if (exitButton) exitButton.hidden = !inVehicle;
  };
  const enter = () => {
    if (inVehicle) { inVehicle = false; const p = vehicle.getPosition(); player.setPosition(p.x - 2.4, 0, p.z); player.enabled = true; vehicleSpeed = 0; showNotice("You exited the taxi"); }
    else if (canEnter()) { inVehicle = true; const p = vehicle.getPosition(); player.setPosition(p.x, 0, p.z); player.enabled = false; vehicleSpeed = 0; showNotice("Taxi entered · drive with the joystick"); }
    else showNotice("Walk closer to the taxi to enter");
    updateButtons();
  };
  interactButton?.addEventListener("click", enter);
  exitButton?.addEventListener("click", enter);
  window.addEventListener("keydown", (event) => { if (event.code === "KeyE" && !event.repeat) enter(); });

  let elapsed = 0;
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
      if (!overlaps(nextX, nextZ) && Math.abs(nextX) < 82 && nextZ > -68 && nextZ < 82) vehicle.setPosition(nextX, 0, nextZ);
      vehicle.setEulerAngles(0, vehicleYaw * 180 / Math.PI, 0);
      const vehiclePosition = vehicle.getPosition();
      player.setPosition(vehiclePosition.x, vehiclePosition.y, vehiclePosition.z);
      if (exitButton) exitButton.hidden = false;
    } else {
      const magnitude = Math.min(1, Math.hypot(forward, strafe));
      if (magnitude > 0.04) {
        const angle = cameraYaw * Math.PI / 180;
        const dx = (strafe * Math.cos(angle) - forward * Math.sin(angle)) * playerSpeed * step;
        const dz = (forward * Math.cos(angle) + strafe * Math.sin(angle)) * playerSpeed * step;
        const p = player.getPosition();
        const nx = clamp(p.x + dx, -82, 82), nz = clamp(p.z + dz, -65, 82);
        if (!overlaps(nx, p.z)) player.setPosition(nx, p.y, p.z);
        if (!overlaps(player.getPosition().x, nz)) player.setPosition(player.getPosition().x, p.y, nz);
        player.setEulerAngles(0, Math.atan2(dx, dz) * 180 / Math.PI, 0);
        gaitTime += step * 9;
        if (loadedCharacter?.anim && walkClipName && activeClipName !== walkClipName) { loadedCharacter.anim.baseLayer.transition(walkClipName, 0.18); activeClipName = walkClipName; }
        leftLeg.setLocalEulerAngles(Math.sin(gaitTime) * 26, 0, 0);
        rightLeg.setLocalEulerAngles(-Math.sin(gaitTime) * 26, 0, 0);
        leftArm.setLocalEulerAngles(-Math.sin(gaitTime) * 18, 0, 0);
        rightArm.setLocalEulerAngles(Math.sin(gaitTime) * 18, 0, 0);
      } else {
        if (loadedCharacter?.anim && idleClipName && activeClipName !== idleClipName) { loadedCharacter.anim.baseLayer.transition(idleClipName, 0.2); activeClipName = idleClipName; }
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
    if (elapsed > 0.12) { updateButtons(); elapsed = 0; }
    elapsed += step;
    if (status) status.textContent = inVehicle ? "TAXI · DRIVING" : "OSU · EXPLORATION";
    if (objective) objective.textContent = inVehicle ? "Drive towards Labadi Beach" : "Explore Osu and find the taxi";
    if (hint) hint.textContent = inVehicle ? "Joystick: steer and accelerate · EXIT to leave" : "Joystick: move · Drag: camera · E: enter / exit";
  });

  window.addEventListener("resize", () => app.resizeCanvas());
  if (status) status.textContent = "OSU · ACCRA";
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

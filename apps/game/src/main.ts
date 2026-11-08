import {
  ArcRotateCamera, Color3, Color4, DirectionalLight, Engine, HemisphericLight,
  MeshBuilder, Scene, StandardMaterial, Vector3
} from "@babylonjs/core";
import "./style.css";

const byId = <T extends HTMLElement>(id: string) => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing required interface element: #${id}`);
  return element as T;
};

const loading = byId<HTMLElement>("loading");
const menu = byId<HTMLElement>("menu");
const world = byId<HTMLElement>("world");
const settingsPanel = byId<HTMLElement>("settings-panel");
const errorBox = byId<HTMLElement>("world-error");
let engine: Engine | null = null;
let scene: Scene | null = null;
let resizeHandler: (() => void) | null = null;

function showMenu() {
  world.hidden = true;
  menu.hidden = false;
  settingsPanel.hidden = true;
}

function material(sceneRef: Scene, name: string, color: Color3, roughness = 1) {
  const mat = new StandardMaterial(name, sceneRef);
  mat.diffuseColor = color;
  mat.specularColor = new Color3(0.08, 0.08, 0.08);
  mat.roughness = roughness;
  return mat;
}

function addBuilding(sceneRef: Scene, x: number, z: number, width: number, depth: number, height: number, wall: StandardMaterial, roof: StandardMaterial) {
  const body = MeshBuilder.CreateBox("Ghanaian low-rise building", { width, depth, height }, sceneRef);
  body.position.set(x, height / 2, z);
  body.material = wall;
  const top = MeshBuilder.CreateBox("Flat concrete roof", { width: width + 0.16, depth: depth + 0.16, height: 0.22 }, sceneRef);
  top.position.set(x, height + 0.11, z);
  top.material = roof;
  const door = MeshBuilder.CreateBox("Shop entrance", { width: 0.85, height: 1.85, depth: 0.06 }, sceneRef);
  door.position.set(x, 0.93, z - depth / 2 - 0.035);
  door.material = material(sceneRef, "Door paint", new Color3(0.16, 0.22, 0.18));
  for (let i = -1; i <= 1; i++) {
    const window = MeshBuilder.CreateBox("Window", { width: 0.72, height: 0.65, depth: 0.05 }, sceneRef);
    window.position.set(x + i * Math.min(1.35, width / 3), 2.1, z - depth / 2 - 0.04);
    window.material = material(sceneRef, "Window glass", new Color3(0.2, 0.38, 0.42));
  }
}

function createWorld(canvas: HTMLCanvasElement): Scene {
  const gameEngine = new Engine(canvas, true, { preserveDrawingBuffer: false, stencil: true, antialias: true });
  engine = gameEngine;
  const sceneRef = new Scene(gameEngine);
  scene = sceneRef;
  sceneRef.clearColor = new Color4(0.66, 0.78, 0.79, 1);
  sceneRef.ambientColor = new Color3(0.35, 0.35, 0.35);
  const camera = new ArcRotateCamera("player camera", -Math.PI / 2, 1.12, 19, new Vector3(0, 1.3, 0), sceneRef);
  camera.lowerRadiusLimit = 8;
  camera.upperRadiusLimit = 30;
  camera.wheelPrecision = 55;
  camera.panningSensibility = 0;
  camera.attachControl(canvas, true);
  camera.inputs.attached.pointers!.buttons = [0, 1, 2];
  new HemisphericLight("Ghana daylight", new Vector3(0, 1, 0), sceneRef).intensity = 0.82;
  const sun = new DirectionalLight("Sun", new Vector3(-0.5, -1, 0.4), sceneRef);
  sun.position = new Vector3(25, 45, -25);
  sun.intensity = 1.15;

  const earth = material(sceneRef, "Laterite earth", new Color3(0.48, 0.29, 0.17));
  const road = material(sceneRef, "Asphalt", new Color3(0.13, 0.15, 0.15));
  const roadMark = material(sceneRef, "Road markings", new Color3(0.88, 0.78, 0.53));
  const grass = material(sceneRef, "Tropical vegetation", new Color3(0.22, 0.36, 0.2));
  const cream = material(sceneRef, "Painted shopfront", new Color3(0.78, 0.67, 0.49));
  const coral = material(sceneRef, "Coral shopfront", new Color3(0.68, 0.34, 0.22));
  const white = material(sceneRef, "Concrete roof", new Color3(0.72, 0.72, 0.65));

  const ground = MeshBuilder.CreateGround("Red earth ground", { width: 90, height: 90 }, sceneRef);
  ground.position.y = -0.08;
  ground.material = earth;
  const roadMesh = MeshBuilder.CreateGround("Accra neighbourhood road", { width: 8, height: 90 }, sceneRef);
  roadMesh.position.y = 0.015;
  roadMesh.material = road;
  for (let z = -40; z <= 40; z += 8) {
    const dash = MeshBuilder.CreateBox("Road centre marking", { width: 0.12, height: 0.025, depth: 3.2 }, sceneRef);
    dash.position.set(0, 0.045, z);
    dash.material = roadMark;
  }

  addBuilding(sceneRef, -8.2, -7, 7, 7, 4.4, cream, white);
  addBuilding(sceneRef, 8.5, -8, 7.5, 8, 5.2, coral, white);
  addBuilding(sceneRef, -8.5, 12, 7.5, 7, 3.8, coral, white);
  addBuilding(sceneRef, 8.5, 13, 8, 7, 4.6, cream, white);

  for (let i = 0; i < 18; i++) {
    const x = (i % 2 === 0 ? -1 : 1) * (15 + (i % 3) * 3);
    const z = -38 + i * 4.5;
    const trunk = MeshBuilder.CreateCylinder("Palm trunk", { height: 4.2, diameter: 0.34, tessellation: 7 }, sceneRef);
    trunk.position.set(x, 2.1, z);
    trunk.material = material(sceneRef, "Palm bark", new Color3(0.34, 0.22, 0.13));
    for (let leaf = 0; leaf < 5; leaf++) {
      const frond = MeshBuilder.CreateCylinder("Palm frond", { height: 3.5, diameterTop: 0.03, diameterBottom: 0.28, tessellation: 5 }, sceneRef);
      frond.position.set(x + Math.cos(leaf * 1.26) * 1.05, 4.2, z + Math.sin(leaf * 1.26) * 1.05);
      frond.rotation.z = Math.cos(leaf * 1.26) * 0.7;
      frond.rotation.x = Math.sin(leaf * 1.26) * 0.7;
      frond.material = grass;
    }
  }

  const marketSign = MeshBuilder.CreateBox("Neighbourhood shop sign", { width: 4.8, height: 0.75, depth: 0.12 }, sceneRef);
  marketSign.position.set(-8.2, 3.25, -10.58);
  marketSign.material = material(sceneRef, "Shop sign green", new Color3(0.12, 0.29, 0.22));
  const signText = MeshBuilder.CreateBox("Sign highlight", { width: 3.8, height: 0.06, depth: 0.04 }, sceneRef);
  signText.position.set(-8.2, 3.25, -10.66);
  signText.material = roadMark;

  const player = MeshBuilder.CreateCapsule("Preview player", { height: 1.8, radius: 0.34 }, sceneRef);
  player.position.set(3.1, 0.9, 3.8);
  player.material = material(sceneRef, "Player placeholder", new Color3(0.16, 0.22, 0.28));
  const head = MeshBuilder.CreateSphere("Player head", { diameter: 0.55, segments: 12 }, sceneRef);
  head.position.set(3.1, 2.0, 3.8);
  head.material = material(sceneRef, "Player skin placeholder", new Color3(0.36, 0.22, 0.14));
  const shadow = MeshBuilder.CreateDisc("Player ground marker", { radius: 0.55, tessellation: 24 }, sceneRef);
  shadow.rotation.x = Math.PI / 2;
  shadow.position.set(3.1, 0.035, 3.8);
  shadow.material = material(sceneRef, "Ground marker", new Color3(0.08, 0.1, 0.08));

  let moveX = 0;
  let moveZ = 0;
  const keys = new Set<string>();
  const onKeyDown = (event: KeyboardEvent) => { keys.add(event.key.toLowerCase()); };
  const onKeyUp = (event: KeyboardEvent) => { keys.delete(event.key.toLowerCase()); };
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  sceneRef.onBeforeRenderObservable.add(() => {
    const forward = Number(keys.has("w") || keys.has("arrowup")) - Number(keys.has("s") || keys.has("arrowdown"));
    const sideways = Number(keys.has("d") || keys.has("arrowright")) - Number(keys.has("a") || keys.has("arrowleft"));
    moveX += (sideways * 0.085 - moveX) * 0.2;
    moveZ += (forward * 0.085 - moveZ) * 0.2;
    player.position.x = Math.max(-3.1, Math.min(3.1, player.position.x + moveX));
    player.position.z = Math.max(-42, Math.min(42, player.position.z - moveZ));
    head.position.x = player.position.x;
    head.position.z = player.position.z;
    shadow.position.x = player.position.x;
    shadow.position.z = player.position.z;
    camera.target.x += (player.position.x - camera.target.x) * 0.035;
    camera.target.z += (player.position.z - camera.target.z) * 0.035;
  });

  gameEngine.runRenderLoop(() => sceneRef.render());
  resizeHandler = () => gameEngine.resize();
  window.addEventListener("resize", resizeHandler);
  return sceneRef;
}

function enterWorld() {
  menu.hidden = true;
  world.hidden = false;
  errorBox.hidden = true;
  try {
    if (!engine) createWorld(byId<HTMLCanvasElement>("game-canvas"));
    engine?.resize();
  } catch (error) {
    errorBox.textContent = error instanceof Error ? error.message : "The 3D world could not start on this device.";
    errorBox.hidden = false;
  }
}

byId<HTMLButtonElement>("play").addEventListener("click", enterWorld);
byId<HTMLButtonElement>("back-menu").addEventListener("click", showMenu);
byId<HTMLButtonElement>("settings").addEventListener("click", () => { settingsPanel.hidden = false; });
byId<HTMLButtonElement>("close-settings").addEventListener("click", () => { settingsPanel.hidden = true; });
byId<HTMLSelectElement>("quality").addEventListener("change", (event) => {
  const value = (event.currentTarget as HTMLSelectElement).value;
  if (engine) engine.setHardwareScalingLevel(value === "high" ? 1 : value === "low" ? 1.75 : 1.25);
});
window.addEventListener("pagehide", () => {
  if (resizeHandler) window.removeEventListener("resize", resizeHandler);
  scene?.dispose();
  engine?.dispose();
});

window.setTimeout(() => {
  loading.style.opacity = "0";
  window.setTimeout(() => { loading.hidden = true; menu.hidden = false; }, 500);
}, 650);

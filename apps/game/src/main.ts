import {
  Color3,
  Color4,
  ArcRotateCamera,
  Engine,
  HemisphericLight,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3
} from "@babylonjs/core";
import "./style.css";

const bootScreen = document.querySelector<HTMLElement>("#boot-screen");
const gameShell = document.querySelector<HTMLElement>("#game-shell");
const bootStatus = document.querySelector<HTMLElement>("#boot-status");
const canvas = document.querySelector<HTMLCanvasElement>("#world-canvas");
const playButton = document.querySelector<HTMLButtonElement>("#play-button");
const notice = document.querySelector<HTMLElement>("#notice");

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

  const ground = MeshBuilder.CreateGround("terrain", {
    width: 180,
    height: 180,
    subdivisions: 2
  }, scene);
  ground.material = groundMaterial;

  const roadMaterial = new StandardMaterial("road-surface", scene);
  roadMaterial.diffuseColor = new Color3(0.12, 0.14, 0.14);

  const road = MeshBuilder.CreateGround("preview-road", {
    width: 13,
    height: 180
  }, scene);
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
      width,
      height,
      depth: 8 + (i % 2) * 3
    }, scene);
    building.position.set(side * (15 + (i % 3) * 5), height / 2, depth);
    building.material = material;
  }

  const skylineMaterial = new StandardMaterial("distant-skyline", scene);
  skylineMaterial.diffuseColor = new Color3(0.37, 0.46, 0.44);

  for (let i = 0; i < 14; i += 1) {
    const towerHeight = 12 + ((i * 11) % 22);
    const tower = MeshBuilder.CreateBox(`distant-building-${i}`, {
      width: 8,
      height: towerHeight,
      depth: 8
    }, scene);
    tower.position.set(-85 + i * 13, towerHeight / 2, -92);
    tower.material = skylineMaterial;
  }

  const centre = MeshBuilder.CreateBox("city-landmark", {
    width: 12,
    height: 29,
    depth: 12
  }, scene);
  centre.position.set(0, 14.5, -62);
  const landmarkMaterial = new StandardMaterial("landmark-material", scene);
  landmarkMaterial.diffuseColor = new Color3(0.78, 0.67, 0.48);
  centre.material = landmarkMaterial;
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

  const camera = new ArcRotateCamera(
    "preview-camera",
    -Math.PI / 2,
    Math.PI / 2.55,
    112,
    new Vector3(0, 9, -35),
    scene
  );
  camera.lowerRadiusLimit = 65;
  camera.upperRadiusLimit = 145;
  camera.wheelPrecision = 70;
  camera.panningSensibility = 0;
  camera.attachControl(canvas, true);

  engine.runRenderLoop(() => {
    if (!scene.isDisposed) scene.render();
  });

  window.addEventListener("resize", () => engine.resize());

  bootStatus.textContent = "Your world is ready.";
  await new Promise<void>((resolve) => window.setTimeout(resolve, 450));
  bootScreen.classList.add("is-hidden");
  gameShell.classList.remove("is-hidden");
  engine.resize();

  playButton?.addEventListener("click", () => {
    showNotice("The playable world, character creation and online services are being built in the next development stages.");
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      engine.stopRenderLoop();
    } else {
      engine.runRenderLoop(() => {
        if (!scene.isDisposed) scene.render();
      });
    }
  });
}

start().catch((error: unknown) => {
  console.error("AKWANTUO startup failed:", error);
  if (bootStatus) {
    bootStatus.textContent = "Unable to start the 3D preview. Please refresh and try again.";
  }
});

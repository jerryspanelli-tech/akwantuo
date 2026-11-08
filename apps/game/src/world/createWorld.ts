import {
  ArcRotateCamera, Color3, Color4, DirectionalLight, Engine, HemisphericLight,
  MeshBuilder, Scene, StandardMaterial, Vector3
} from "@babylonjs/core";

function makeMaterial(scene: Scene, name: string, color: Color3): StandardMaterial {
  const mat = new StandardMaterial(name, scene);
  mat.diffuseColor = color;
  mat.specularColor = new Color3(0.08, 0.08, 0.08);
  return mat;
}

function addBuilding(scene: Scene, x: number, z: number, width: number, depth: number, height: number, wall: StandardMaterial, roof: StandardMaterial) {
  const body = MeshBuilder.CreateBox("Ghanaian low-rise building", { width, depth, height }, scene);
  body.position.set(x, height / 2, z);
  body.material = wall;
  const top = MeshBuilder.CreateBox("Flat concrete roof", { width: width + 0.16, depth: depth + 0.16, height: 0.22 }, scene);
  top.position.set(x, height + 0.11, z);
  top.material = roof;
  const door = MeshBuilder.CreateBox("Shop entrance", { width: 0.85, height: 1.85, depth: 0.06 }, scene);
  door.position.set(x, 0.93, z - depth / 2 - 0.035);
  door.material = makeMaterial(scene, "Door paint", new Color3(0.16, 0.22, 0.18));
  for (let i = -1; i <= 1; i++) {
    const window = MeshBuilder.CreateBox("Window", { width: 0.72, height: 0.65, depth: 0.05 }, scene);
    window.position.set(x + i * Math.min(1.35, width / 3), 2.1, z - depth / 2 - 0.04);
    window.material = makeMaterial(scene, "Window glass", new Color3(0.2, 0.38, 0.42));
  }
}

export function startWorld(canvas: HTMLCanvasElement, joystick: HTMLElement): () => void {
  const engine = new Engine(canvas, true, { preserveDrawingBuffer: false, stencil: true, antialias: true });
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.66, 0.78, 0.79, 1);
  const camera = new ArcRotateCamera("player camera", -Math.PI / 2, 1.12, 19, new Vector3(0, 1.3, 0), scene);
  camera.lowerRadiusLimit = 8;
  camera.upperRadiusLimit = 30;
  camera.wheelPrecision = 55;
  camera.panningSensibility = 0;
  camera.attachControl(canvas, true);
  camera.inputs.attached.pointers!.buttons = [0, 1, 2];
  new HemisphericLight("Ghana daylight", new Vector3(0, 1, 0), scene).intensity = 0.82;
  const sun = new DirectionalLight("Sun", new Vector3(-0.5, -1, 0.4), scene);
  sun.position = new Vector3(25, 45, -25);
  sun.intensity = 1.15;

  const earth = makeMaterial(scene, "Laterite earth", new Color3(0.48, 0.29, 0.17));
  const asphalt = makeMaterial(scene, "Asphalt", new Color3(0.13, 0.15, 0.15));
  const roadMark = makeMaterial(scene, "Road markings", new Color3(0.88, 0.78, 0.53));
  const grass = makeMaterial(scene, "Tropical vegetation", new Color3(0.22, 0.36, 0.2));
  const cream = makeMaterial(scene, "Painted shopfront", new Color3(0.78, 0.67, 0.49));
  const coral = makeMaterial(scene, "Coral shopfront", new Color3(0.68, 0.34, 0.22));
  const white = makeMaterial(scene, "Concrete roof", new Color3(0.72, 0.72, 0.65));

  const ground = MeshBuilder.CreateGround("Red earth ground", { width: 90, height: 90 }, scene);
  ground.position.y = -0.08;
  ground.material = earth;
  const road = MeshBuilder.CreateGround("Accra neighbourhood road", { width: 8, height: 90 }, scene);
  road.position.y = 0.015;
  road.material = asphalt;
  for (let z = -40; z <= 40; z += 8) {
    const dash = MeshBuilder.CreateBox("Road centre marking", { width: 0.12, height: 0.025, depth: 3.2 }, scene);
    dash.position.set(0, 0.045, z);
    dash.material = roadMark;
  }

  addBuilding(scene, -8.2, -7, 7, 7, 4.4, cream, white);
  addBuilding(scene, 8.5, -8, 7.5, 8, 5.2, coral, white);
  addBuilding(scene, -8.5, 12, 7.5, 7, 3.8, coral, white);
  addBuilding(scene, 8.5, 13, 8, 7, 4.6, cream, white);

  for (let i = 0; i < 18; i++) {
    const x = (i % 2 === 0 ? -1 : 1) * (15 + (i % 3) * 3);
    const z = -38 + i * 4.5;
    const trunk = MeshBuilder.CreateCylinder("Palm trunk", { height: 4.2, diameter: 0.34, tessellation: 7 }, scene);
    trunk.position.set(x, 2.1, z);
    trunk.material = makeMaterial(scene, "Palm bark", new Color3(0.34, 0.22, 0.13));
    for (let leaf = 0; leaf < 5; leaf++) {
      const angle = leaf * 1.26;
      const frond = MeshBuilder.CreateCylinder("Palm frond", { height: 3.5, diameterTop: 0.03, diameterBottom: 0.28, tessellation: 5 }, scene);
      frond.position.set(x + Math.cos(angle) * 1.05, 4.2, z + Math.sin(angle) * 1.05);
      frond.rotation.z = Math.cos(angle) * 0.7;
      frond.rotation.x = Math.sin(angle) * 0.7;
      frond.material = grass;
    }
  }

  const sign = MeshBuilder.CreateBox("Neighbourhood shop sign", { width: 4.8, height: 0.75, depth: 0.12 }, scene);
  sign.position.set(-8.2, 3.25, -10.58);
  sign.material = makeMaterial(scene, "Shop sign green", new Color3(0.12, 0.29, 0.22));

  const player = MeshBuilder.CreateCapsule("Preview player", { height: 1.8, radius: 0.34 }, scene);
  player.position.set(3.1, 0.9, 3.8);
  player.material = makeMaterial(scene, "Player preview", new Color3(0.16, 0.22, 0.28));
  const head = MeshBuilder.CreateSphere("Player head", { diameter: 0.55, segments: 12 }, scene);
  head.position.set(3.1, 2.0, 3.8);
  head.material = makeMaterial(scene, "Player skin preview", new Color3(0.36, 0.22, 0.14));
  const shadow = MeshBuilder.CreateDisc("Player ground marker", { radius: 0.55, tessellation: 24 }, scene);
  shadow.rotation.x = Math.PI / 2;
  shadow.position.set(3.1, 0.035, 3.8);
  shadow.material = makeMaterial(scene, "Ground marker", new Color3(0.08, 0.1, 0.08));

  const keys = new Set<string>();
  let axisX = 0;
  let axisY = 0;
  let moveX = 0;
  let moveZ = 0;
  let activePointer: number | null = null;
  const onKeyDown = (event: KeyboardEvent) => { keys.add(event.key.toLowerCase()); };
  const onKeyUp = (event: KeyboardEvent) => { keys.delete(event.key.toLowerCase()); };
  const updateJoystick = (event: PointerEvent) => {
    const rect = joystick.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    const max = rect.width * 0.34;
    const length = Math.hypot(dx, dy);
    const scale = length > max ? max / length : 1;
    axisX = dx * scale / max;
    axisY = dy * scale / max;
    joystick.style.setProperty("--stick-x", `${dx * scale}px`);
    joystick.style.setProperty("--stick-y", `${dy * scale}px`);
  };
  const onPointerDown = (event: PointerEvent) => {
    activePointer = event.pointerId;
    joystick.setPointerCapture(event.pointerId);
    updateJoystick(event);
  };
  const onPointerMove = (event: PointerEvent) => { if (event.pointerId === activePointer) updateJoystick(event); };
  const resetJoystick = () => {
    activePointer = null; axisX = 0; axisY = 0;
    joystick.style.setProperty("--stick-x", "0px");
    joystick.style.setProperty("--stick-y", "0px");
  };
  joystick.addEventListener("pointerdown", onPointerDown);
  joystick.addEventListener("pointermove", onPointerMove);
  joystick.addEventListener("pointerup", resetJoystick);
  joystick.addEventListener("pointercancel", resetJoystick);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  scene.onBeforeRenderObservable.add(() => {
    const forward = Math.max(-1, Math.min(1, Number(keys.has("w") || keys.has("arrowup")) - Number(keys.has("s") || keys.has("arrowdown")) - axisY));
    const sideways = Math.max(-1, Math.min(1, Number(keys.has("d") || keys.has("arrowright")) - Number(keys.has("a") || keys.has("arrowleft")) + axisX));
    moveX += sideways * 0.075 - moveX * 0.2;
    moveZ += forward * 0.075 - moveZ * 0.2;
    player.position.x = Math.max(-3.1, Math.min(3.1, player.position.x + moveX));
    player.position.z = Math.max(-42, Math.min(42, player.position.z - moveZ));
    head.position.x = player.position.x; head.position.z = player.position.z;
    shadow.position.x = player.position.x; shadow.position.z = player.position.z;
    camera.target.x += (player.position.x - camera.target.x) * 0.035;
    camera.target.z += (player.position.z - camera.target.z) * 0.035;
  });

  engine.runRenderLoop(() => scene.render());
  const onResize = () => engine.resize();
  window.addEventListener("resize", onResize);
  return () => {
    window.removeEventListener("resize", onResize);
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    joystick.removeEventListener("pointerdown", onPointerDown);
    joystick.removeEventListener("pointermove", onPointerMove);
    joystick.removeEventListener("pointerup", resetJoystick);
    joystick.removeEventListener("pointercancel", resetJoystick);
    scene.dispose();
    engine.dispose();
  };
}

import { AppBase, Color, Entity, StandardMaterial } from "playcanvas";

/**
 * A detailed, game-scale Labadi coastal showcase built from real 3D scene
 * geometry. The shoreline is stylised to the current Greater Accra map.
 * Water motion is lightweight and runs in the scene update loop.
 */
export function buildAccraCoastalShowcase(app: AppBase): void {
  const mat = (r: number, g: number, b: number) => {
    const value = new StandardMaterial();
    value.diffuse = new Color(r, g, b);
    value.specular = new Color(0.08, 0.08, 0.08);
    value.gloss = 18;
    value.update();
    return value;
  };
  const sand = mat(0.78, 0.68, 0.49);
  const wetSand = mat(0.48, 0.43, 0.34);
  const wood = mat(0.28, 0.19, 0.12);
  const paleWood = mat(0.68, 0.53, 0.34);
  const leaf = mat(0.13, 0.31, 0.17);
  const leafLight = mat(0.22, 0.39, 0.20);
  const sea = mat(0.035, 0.24, 0.32);
  const foam = mat(0.72, 0.82, 0.79);
  const white = mat(0.86, 0.84, 0.76);
  const blue = mat(0.10, 0.31, 0.42);
  const asphalt = mat(0.10, 0.12, 0.13);
  const roadLine = mat(0.9, 0.78, 0.52);
  const curb = mat(0.58, 0.57, 0.52);
  const red = mat(0.55, 0.16, 0.12);
  const yellow = mat(0.86, 0.65, 0.25);

  const box = (name: string, x: number, y: number, z: number, sx: number, sy: number, sz: number, material: StandardMaterial, yaw = 0, pitch = 0) => {
    const entity = new Entity(name);
    entity.addComponent("render", { type: "box", material, castShadows: true, receiveShadows: true });
    entity.setPosition(x, y, z);
    entity.setLocalScale(sx, sy, sz);
    entity.setEulerAngles(pitch, yaw, 0);
    app.root.addChild(entity);
    return entity;
  };
  const plane = (name: string, x: number, y: number, z: number, width: number, depth: number, material: StandardMaterial) => {
    const entity = new Entity(name);
    entity.addComponent("render", { type: "plane", material, castShadows: false, receiveShadows: true });
    entity.setPosition(x, y, z);
    entity.setLocalScale(width, 1, depth);
    app.root.addChild(entity);
    return entity;
  };
  const cylinder = (name: string, x: number, y: number, z: number, radius: number, height: number, material: StandardMaterial) => {
    const entity = new Entity(name);
    entity.addComponent("render", { type: "cylinder", material, castShadows: true, receiveShadows: true });
    entity.setPosition(x, y, z);
    entity.setLocalScale(radius * 2, height, radius * 2);
    app.root.addChild(entity);
    return entity;
  };

  // Distinct dry-sand, damp-sand and water bands give the beach a readable
  // sloping shoreline instead of one flat strip of colour.
  plane("Labadi broad dry-sand beach", 2200, -0.015, -3250, 1540, 330, sand);
  plane("Labadi damp shoreline", 2200, 0.005, -3400, 1540, 34, wetSand);

  // A short, fully modelled access road links the existing La Beach Road
  // corridor to the beach parking / pedestrian arrival area.
  const beachAccess = [
    { x: 2750, z: -2100 }, { x: 2700, z: -2400 },
    { x: 2500, z: -2700 }, { x: 2250, z: -2980 }
  ];
  for (let segment = 0; segment < beachAccess.length - 1; segment++) {
    const a = beachAccess[segment], b = beachAccess[segment + 1];
    const dx = b.x - a.x, dz = b.z - a.z;
    const length = Math.hypot(dx, dz);
    const yaw = Math.atan2(dx, dz) * 180 / Math.PI;
    const mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2;
    box("Labadi beach access asphalt road", mx, 0.06, mz, 10, 0.18, length + 1, asphalt, yaw);
    box("Labadi beach access centre marking", mx, 0.16, mz, 0.14, 0.025, Math.min(9, length * 0.35), roadLine, yaw);
    for (const side of [-1, 1]) {
      const offset = side * 5.35;
      const nx = Math.cos(yaw * Math.PI / 180) * offset;
      const nz = -Math.sin(yaw * Math.PI / 180) * offset;
      box("Labadi beach access raised kerb", mx + nx, 0.16, mz + nz, 0.28, 0.24, length, curb, yaw);
    }
  }
  const waveBands: Array<{ entity: Entity; x: number; y: number; z: number; phase: number; width: number; depth: number }> = [];
  for (let i = 0; i < 7; i++) {
    const z = -3414 - i * 13;
    const ribbon = plane(i % 2 ? "Labadi shore foam ribbon" : "Labadi incoming wave face", 2200, -0.035 + (i % 2) * 0.012, z, 1450, i % 2 ? 2.4 : 5.5, i % 2 ? foam : sea);
    waveBands.push({ entity: ribbon, x: 2200, y: -0.035 + (i % 2) * 0.012, z, phase: i * 0.82, width: 1450, depth: i % 2 ? 2.4 : 5.5 });
  }

  // A recognisable Ghanaian coastal palm silhouette: curved segmented trunks
  // and individually modelled fronds rather than a single primitive crown.
  for (let tree = 0; tree < 8; tree++) {
    const x = 1510 + tree * 155;
    const z = -3140 + Math.sin(tree * 0.72) * 30;
    const lean = tree % 2 ? 0.10 : -0.08;
    for (let segment = 0; segment < 4; segment++) {
      const y = 1.05 + segment * 1.9;
      cylinder("Labadi palm segmented trunk", x + lean * segment * segment, y, z, 0.28 - segment * 0.025, 2.2, wood);
    }
    const crownX = x + lean * 15;
    const crownY = 8.7;
    for (let frond = 0; frond < 7; frond++) {
      const yaw = frond * (360 / 7);
      const radians = yaw * Math.PI / 180;
      const length = 4.6 + (frond % 3) * 0.45;
      const leafEntity = box("Labadi palm individual frond", crownX + Math.sin(radians) * 1.6, crownY - 0.5, z + Math.cos(radians) * 1.6, 0.34, 0.12, length, frond % 2 ? leaf : leafLight, yaw, 17 + (frond % 3) * 5);
      leafEntity.setLocalScale(0.34, 0.12, length);
    }
  }

  // Open-sided beach pavilion with posts, a raised timber floor and a pitched roof.
  const pavilionX = 2670, pavilionZ = -3260;
  box("Labadi beach pavilion timber deck", pavilionX, 0.22, pavilionZ, 22, 0.44, 15, paleWood);
  for (const xSide of [-1, 1]) for (const zSide of [-1, 1]) {
    cylinder("Labadi pavilion support post", pavilionX + xSide * 9.2, 2.2, pavilionZ + zSide * 5.8, 0.22, 4.4, wood);
  }
  box("Labadi pavilion pitched roof left", pavilionX - 3.8, 4.45, pavilionZ, 9.5, 0.42, 17, red, 0, -12);
  box("Labadi pavilion pitched roof right", pavilionX + 3.8, 4.45, pavilionZ, 9.5, 0.42, 17, yellow, 0, 12);
  box("Labadi pavilion ridge cap", pavilionX, 5.25, pavilionZ, 1.0, 0.35, 17, wood);

  // Three-dimensional octagonal beach umbrellas, poles and loungers.
  for (let umbrella = 0; umbrella < 3; umbrella++) {
    const x = 1830 + umbrella * 320;
    const z = -3300 - (umbrella % 2) * 34;
    cylinder("Labadi beach umbrella pole", x, 1.35, z, 0.075, 2.7, wood);
    for (let panel = 0; panel < 8; panel++) {
      const yaw = panel * 45;
      const radians = yaw * Math.PI / 180;
      box("Labadi umbrella canopy panel", x + Math.sin(radians) * 0.92, 2.55, z + Math.cos(radians) * 0.92, 1.48, 0.16, 1.12, panel % 2 ? white : blue, yaw, -7);
    }
    box("Labadi beach lounger", x - 34, 0.42, z + 7, 2.2, 0.28, 5.0, white, -8);
    box("Labadi beach lounger cushion", x - 34, 0.62, z + 7, 1.9, 0.12, 4.5, blue, -8);
  }

  // Raised lifeguard lookout with a ladder and shaded roof.
  const towerX = 1740, towerZ = -3290;
  for (const side of [-1, 1]) {
    box("Labadi lifeguard tower leg", towerX + side * 1.6, 2.2, towerZ, 0.22, 4.4, 0.22, wood);
    for (let step = 0; step < 6; step++) {
      box("Labadi lifeguard tower ladder rung", towerX + side * 1.6, 0.45 + step * 0.62, towerZ + 0.3, 0.14, 0.12, 1.1, paleWood);
    }
  }
  box("Labadi lifeguard platform", towerX, 4.35, towerZ, 4.2, 0.35, 3.8, paleWood);
  box("Labadi lifeguard cabin", towerX, 5.65, towerZ, 3.2, 2.3, 2.8, white);
  box("Labadi lifeguard front glazing", towerX, 5.75, towerZ + 1.43, 2.35, 1.1, 0.08, blue);
  box("Labadi lifeguard roof", towerX, 6.95, towerZ, 4.0, 0.24, 3.5, red);

  // A small 3D fishing canoe and motor launch sit just offshore. Both bob and
  // yaw gently with the incoming water so the beach has visible motion.
  const boats: Array<{ root: Entity; x: number; y: number; z: number; phase: number }> = [];
  const makeBoat = (name: string, x: number, z: number, hullMaterial: StandardMaterial, phase: number) => {
    const root = new Entity(name);
    root.setPosition(x, 0.55, z);
    app.root.addChild(root);
    const part = (partName: string, px: number, py: number, pz: number, sx: number, sy: number, sz: number, material: StandardMaterial) => {
      const entity = new Entity(partName);
      entity.addComponent("render", { type: "box", material, castShadows: true, receiveShadows: true });
      entity.setLocalPosition(px, py, pz);
      entity.setLocalScale(sx, sy, sz);
      root.addChild(entity);
      return entity;
    };
    part(name + " hull", 0, 0, 0, 2.4, 0.62, 8.4, hullMaterial);
    part(name + " bow", 0, 0.02, 4.0, 1.5, 0.5, 1.4, hullMaterial);
    part(name + " inner floor", 0, 0.34, -0.25, 1.8, 0.12, 6.4, paleWood);
    part(name + " seat", 0, 0.72, -0.55, 1.8, 0.22, 0.42, wood);
    part(name + " outboard motor", 0, -0.05, -4.1, 0.62, 1.1, 0.6, wood);
    part(name + " motor cover", 0, 0.56, -4.12, 0.7, 0.45, 0.66, red);
    boats.push({ root, x, y: 0.55, z, phase });
  };
  makeBoat("Labadi wooden fishing canoe", 2070, -3570, paleWood, 0.4);
  makeBoat("Labadi coastal motor launch", 2540, -3710, white, 1.8);

  // Foam and boats animate at low frequency to keep the scene inexpensive on
  // older mobile GPUs. No per-frame mesh creation or allocation is performed.
  let elapsed = 0;
  app.on("update", (dt: number) => {
    elapsed += Math.min(dt, 0.05);
    for (const wave of waveBands) {
      const pulse = Math.sin(elapsed * 0.72 + wave.phase);
      wave.entity.setPosition(wave.x, wave.y + pulse * 0.035, wave.z + pulse * 2.2);
      wave.entity.setLocalScale(wave.width, 1, wave.depth * (0.88 + (pulse + 1) * 0.08));
    }
    for (const boat of boats) {
      const bob = Math.sin(elapsed * 0.95 + boat.phase);
      boat.root.setPosition(boat.x, boat.y + bob * 0.12, boat.z + Math.sin(elapsed * 0.34 + boat.phase) * 1.1);
      boat.root.setEulerAngles(1.2 * bob, Math.sin(elapsed * 0.3 + boat.phase) * 2.2, 0);
    }
  });
}

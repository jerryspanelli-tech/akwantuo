import { AppBase, Color, Entity, StandardMaterial, Texture, PIXELFORMAT_RGBA8 } from "playcanvas";
import { GREATER_ACCRA_COASTLINE, GREATER_ACCRA_MAP_EXTENT, GREATER_ACCRA_REGION_ANCHORS, GREATER_ACCRA_ROAD_PATHS } from "../world/greaterAccraLayout";
import { GREATER_ACCRA_LANDMARK_FOOTPRINTS } from "../world/greaterAccraLandmarkData";
import { GREATER_ACCRA_RAIL_NODES, GREATER_ACCRA_RAIL_ROUTES } from "../world/railNetwork";

export type WorldBlocker = { x: number; z: number; hx: number; hz: number };
export type GreaterAccraWorld = {
  blockers: WorldBlocker[];
  spawn: { x: number; z: number };
  taxiSpawn: { x: number; z: number };
};

const material = (r: number, g: number, b: number): StandardMaterial => {
  const value = new StandardMaterial();
  value.diffuse = new Color(r, g, b);
  value.specular = new Color(0.035, 0.035, 0.035);
  value.update();
  return value;
};

export function createGreaterAccraWorld(app: AppBase): GreaterAccraWorld {
  const blockers: WorldBlocker[] = [];
  const mats = {
    earth: material(0.43, 0.37, 0.27), grass: material(0.19, 0.30, 0.19),
    road: material(0.105, 0.12, 0.125), roadFuture: material(0.19, 0.20, 0.19),
    yellow: material(0.92, 0.70, 0.22), white: material(0.82, 0.82, 0.75),
    kerb: material(0.62, 0.60, 0.53), median: material(0.43, 0.44, 0.40),
    sand: material(0.76, 0.66, 0.48), sea: material(0.035, 0.20, 0.29),
    deepSea: material(0.018, 0.12, 0.21), green: material(0.07, 0.27, 0.18),
    gold: material(0.76, 0.52, 0.20), red: material(0.50, 0.14, 0.12),
    glass: material(0.12, 0.25, 0.28), concrete: material(0.54, 0.52, 0.46),
    lightConcrete: material(0.69, 0.66, 0.58), roof: material(0.29, 0.21, 0.16),
    market: material(0.63, 0.35, 0.19), industrial: material(0.38, 0.42, 0.39),
    modern: material(0.35, 0.43, 0.45), residential: material(0.68, 0.55, 0.39),
    palm: material(0.23, 0.31, 0.17)
  };

  // Lightweight procedural surface grain: subtle pixel variation gives asphalt, concrete,
  // earth and sand a material response instead of perfectly flat primitive colors.
  const surfaceTexture = (name: string, base: [number, number, number], amplitude: number) => {
    const canvas = document.createElement("canvas");
    canvas.width = 256; canvas.height = 256;
    const context = canvas.getContext("2d");
    if (!context) return null;
    const pixels = context.createImageData(256, 256);
    for (let i = 0; i < pixels.data.length; i += 4) {
      const grain = (Math.random() - 0.5) * amplitude;
      pixels.data[i] = Math.max(0, Math.min(255, 128 + grain));
      pixels.data[i + 1] = Math.max(0, Math.min(255, 128 + grain));
      pixels.data[i + 2] = Math.max(0, Math.min(255, 128 + grain));
      pixels.data[i + 3] = 255;
    }
    context.putImageData(pixels, 0, 0);
    const texture = new Texture(app.graphicsDevice, { name, width: 256, height: 256, format: PIXELFORMAT_RGBA8, mipmaps: true });
    texture.setSource(canvas);
    return texture;
  };
  const roadGrain = surfaceTexture("Asphalt grain", [90, 94, 98], 20);
  const concreteGrain = surfaceTexture("Concrete grain", [135, 132, 124], 14);
  const earthGrain = surfaceTexture("Accra earth grain", [110, 94, 69], 22);
  const sandGrain = surfaceTexture("Coastal sand grain", [194, 168, 124], 18);
  for (const [surface, texture] of [[mats.road, roadGrain], [mats.roadFuture, roadGrain], [mats.concrete, concreteGrain], [mats.lightConcrete, concreteGrain], [mats.earth, earthGrain], [mats.sand, sandGrain]] as const) {
    if (texture) { surface.diffuseMap = texture; surface.gloss = 8; surface.update(); }
  }

  const box = (name: string, x: number, y: number, z: number, sx: number, sy: number, sz: number, mat: StandardMaterial, yaw = 0, solid = false) => {
    const entity = new Entity(name);
    entity.addComponent("render", { type: "box", material: mat, castShadows: solid, receiveShadows: true });
    entity.setPosition(x, y, z);
    entity.setLocalScale(sx, sy, sz);
    if (yaw) entity.setEulerAngles(0, yaw, 0);
    app.root.addChild(entity);
    if (solid) blockers.push({ x, z, hx: sx * 0.52, hz: sz * 0.52 });
    return entity;
  };
  const plane = (name: string, x: number, y: number, z: number, width: number, depth: number, mat: StandardMaterial) => {
    const entity = new Entity(name);
    entity.addComponent("render", { type: "plane", material: mat, castShadows: false, receiveShadows: true });
    entity.setPosition(x, y, z);
    entity.setLocalScale(width, 1, depth);
    app.root.addChild(entity);
    return entity;
  };
  const cylinder = (name: string, x: number, y: number, z: number, radius: number, height: number, mat: StandardMaterial) => {
    const entity = new Entity(name);
    entity.addComponent("render", { type: "cylinder", material: mat, castShadows: false, receiveShadows: true });
    entity.setPosition(x, y, z);
    entity.setLocalScale(radius * 2, height, radius * 2);
    app.root.addChild(entity);
    return entity;
  };

  const makeSignMaterial = (label: string): StandardMaterial => {
    const signCanvas = document.createElement("canvas");
    signCanvas.width = 512;
    signCanvas.height = 128;
    const context = signCanvas.getContext("2d");
    if (!context) return mats.green;
    context.fillStyle = "#123c2b";
    context.fillRect(0, 0, 512, 128);
    context.fillStyle = "#d9ad5d";
    context.fillRect(0, 0, 512, 9);
    context.fillRect(0, 119, 512, 9);
    context.strokeStyle = "#f0d79e";
    context.lineWidth = 3;
    context.strokeRect(9, 9, 494, 110);
    context.fillStyle = "#fff3d5";
    context.font = "bold 38px Arial, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    const words = label.split(" ");
    if (label.length > 18 && words.length > 1) {
      const midpoint = Math.ceil(words.length / 2);
      context.font = "bold 31px Arial, sans-serif";
      context.fillText(words.slice(0, midpoint).join(" "), 256, 49, 470);
      context.fillText(words.slice(midpoint).join(" "), 256, 84, 470);
    } else {
      context.fillText(label, 256, 65, 470);
    }
    const texture = new Texture(app.graphicsDevice, {
      name: "AKWANTUO sign " + label,
      width: 512,
      height: 128,
      format: PIXELFORMAT_RGBA8,
      mipmaps: false
    });
    texture.setSource(signCanvas);
    const sign = new StandardMaterial();
    sign.diffuseMap = texture;
    sign.update();
    return sign;
  };

  const centerX = (GREATER_ACCRA_MAP_EXTENT.minX + GREATER_ACCRA_MAP_EXTENT.maxX) / 2;
  const centerZ = (GREATER_ACCRA_MAP_EXTENT.minZ + GREATER_ACCRA_MAP_EXTENT.maxZ) / 2;
  plane("Greater Accra landmass", centerX, -0.22, centerZ, GREATER_ACCRA_MAP_EXTENT.widthM, GREATER_ACCRA_MAP_EXTENT.depthM, mats.earth);
  plane("Gulf of Guinea", centerX, -0.12, -7000, GREATER_ACCRA_MAP_EXTENT.widthM + 1200, 7200, mats.sea);
  plane("Open ocean horizon", centerX, -0.16, -12500, GREATER_ACCRA_MAP_EXTENT.widthM + 4000, 5200, mats.deepSea);
  plane("Greater Accra sandy coastline", centerX, -0.035, -3350, GREATER_ACCRA_MAP_EXTENT.widthM, 520, mats.sand);

  // Road geometry is generated from the shared, validated Greater Accra map data.
  // Main N1/N4/N6 corridors are divided; urban connectors remain single carriageway.
  for (const path of GREATER_ACCRA_ROAD_PATHS) {
    if (!path.playableInFirstRelease) continue;
    const isMotorway = /^(n1|n4|n6)-/.test(path.roadSegmentId);
    const roadWidth = path.roadSegmentId.startsWith("n1-tema") ? 23 :
      path.roadSegmentId.startsWith("n1") ? 19 :
      path.roadSegmentId.startsWith("n6") ? 19 :
      path.roadSegmentId.startsWith("n4") ? 17 :
      path.roadSegmentId.includes("spintex") ? 14 :
      path.roadSegmentId.includes("ring-road") ? 13 :
      path.roadSegmentId === "la-beach-road" ? 10 : 12;
    for (let index = 0; index < path.points.length - 1; index++) {
      const a = path.points[index], b = path.points[index + 1];
      const dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
      if (length < 1) continue;
      const yaw = Math.atan2(dx, dz) * 180 / Math.PI;
      const mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2;
      if (isMotorway) {
        const carriageWidth = roadWidth * 0.42;
        const offset = roadWidth * 0.255;
        const nx = Math.cos(yaw * Math.PI / 180) * offset;
        const nz = -Math.sin(yaw * Math.PI / 180) * offset;
        box(path.roadSegmentId + " west carriageway", mx - nx, 0.045, mz - nz, carriageWidth, 0.18, length + 1, mats.road, yaw);
        box(path.roadSegmentId + " east carriageway", mx + nx, 0.045, mz + nz, carriageWidth, 0.18, length + 1, mats.road, yaw);
        box(path.roadSegmentId + " planted median", mx, 0.12, mz, 2.3, 0.34, length + 1, mats.median, yaw);
        for (const side of [-1, 1]) {
          const edgeOffset = offset + carriageWidth / 2 - 0.35;
          box("Motorway edge marking", mx + nx * side + Math.sin(yaw * Math.PI / 180) * edgeOffset, 0.15, mz + nz * side - Math.cos(yaw * Math.PI / 180) * edgeOffset, 0.22, 0.025, length, mats.white, yaw);
        }
      } else {
        box(path.roadSegmentId + " road surface", mx, 0.04, mz, roadWidth, 0.16, length + 1, mats.road, yaw);
        box(path.roadSegmentId + " yellow centre line", mx, 0.13, mz, 0.16, 0.025, length * 0.42, mats.yellow, yaw);
        for (const side of [-1, 1]) {
          const offset = side * (roadWidth / 2 - 0.28);
          const nx = Math.cos(yaw * Math.PI / 180) * offset;
          const nz = -Math.sin(yaw * Math.PI / 180) * offset;
          box("Urban road edge marking", mx + nx, 0.14, mz + nz, 0.12, 0.025, length, mats.white, yaw);
        }
      }
      // Raised kerbs at major urban links, with shared materials and no per-frame work.
      if (!isMotorway && roadWidth <= 14) {
        for (const side of [-1, 1]) {
          const offset = side * (roadWidth / 2 + 0.18);
          const nx = Math.cos(yaw * Math.PI / 180) * offset;
          const nz = -Math.sin(yaw * Math.PI / 180) * offset;
          box("Roadside kerb", mx + nx, 0.13, mz + nz, 0.3, 0.24, length, mats.kerb, yaw);
        }
      }
    }
  }

  // The 1067 mm Cape-gauge corridor is a schematic game route, not surveyed track.
  for (const route of GREATER_ACCRA_RAIL_ROUTES.filter((item) => item.firstRelease)) {
    for (let i = 0; i < route.points.length - 1; i++) {
      const a = route.points[i], b = route.points[i + 1];
      const dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
      if (length < 1) continue;
      const yaw = Math.atan2(dx, dz) * 180 / Math.PI;
      const nx = Math.cos(yaw * Math.PI / 180), nz = -Math.sin(yaw * Math.PI / 180);
      const mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2;
      for (const side of [-1, 1]) {
        box("Cape gauge rail", mx + nx * side * 0.72, 0.24, mz + nz * side * 0.72, 0.16, 0.18, length + 1, mats.lightConcrete, yaw);
      }
      const sleepers = Math.max(1, Math.floor(length / 150));
      for (let s = 0; s <= sleepers; s++) {
        const t = s / sleepers;
        const px = a.x + dx * t, pz = a.z + dz * t;
        box("Rail sleeper", px, 0.14, pz, 2.1, 0.16, 0.34, mats.roof, yaw);
      }
    }
  }
  for (const node of GREATER_ACCRA_RAIL_NODES.filter((item) => item.firstRelease && item.kind === "station")) {
    box(node.name + " platform", node.position.x, 0.32, node.position.z, 85, 0.65, 12, mats.lightConcrete);
    box(node.name + " canopy", node.position.x, 5.2, node.position.z, 48, 0.35, 8, mats.green);
  }

  // Coastline guide follows the shared map points. The coastline is a game-scale approximation.
  const coast = GREATER_ACCRA_COASTLINE.slice().sort((a, b) => a.order - b.order);
  for (let i = 0; i < coast.length - 1; i++) {
    const a = coast[i], b = coast[i + 1];
    const dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
    if (length < 1) continue;
    box("Coastal sand berm", (a.x + b.x) / 2, 0.08, (a.z + b.z) / 2, 7, 0.16, length, mats.sand, Math.atan2(dx, dz) * 180 / Math.PI);
  }

  // District identity: sign structures and distinctive building clusters around real place anchors.
  const districtNames: Record<string, string> = {
    "accra-central-makola": "ACCRA CENTRAL · MAKOLA", "airport-city": "AIRPORT CITY",
    "east-legon": "EAST LEGON", "legon": "LEGON", "madina-adenta": "MADINA · ADENTA",
    "achimota": "ACHIMOTA", "osu": "OSU", "labadi": "LABADI",
    "dansoman": "DANSOMAN", "kaneshie": "KANESHIE", "spintex": "SPINTEX", "tema": "TEMA"
  };
  for (const anchor of GREATER_ACCRA_REGION_ANCHORS) {
    if (anchor.regionId === "greater-accra") continue;
    const isMarket = anchor.regionId === "accra-central-makola" || anchor.regionId === "kaneshie";
    const isModern = anchor.regionId === "airport-city" || anchor.regionId === "east-legon" || anchor.regionId === "tema";
    const facade = isMarket ? mats.market : isModern ? mats.modern : mats.residential;
    const name = districtNames[anchor.regionId] ?? anchor.regionId.toUpperCase();
    box(name + " sign post", anchor.x - 35, 3.1, anchor.z + 65, 0.55, 6.2, 0.55, mats.roof);
    box(name + " green sign", anchor.x - 35, 5.4, anchor.z + 65, 13, 2.1, 0.42, makeSignMaterial(name));
    box(name + " gold sign band", anchor.x - 35, 4.45, anchor.z + 65, 12.6, 0.12, 0.48, mats.gold);
    for (let i = 0; i < 7; i++) {
      const angle = (i / 7) * Math.PI * 2;
      const radius = 115 + (i % 3) * 28;
      const x = anchor.x + Math.cos(angle) * radius;
      const z = anchor.z + Math.sin(angle) * radius;
      const width = isMarket ? 22 + (i % 3) * 5 : isModern ? 30 + (i % 3) * 7 : 18 + (i % 4) * 6;
      const depth = isMarket ? 18 + (i % 2) * 5 : 20 + (i % 3) * 6;
      const floors = isModern ? 5 + (i % 4) : isMarket ? 1 + (i % 2) : 2 + (i % 3);
      const height = floors * 3.2;
      const yaw = (i * 23) % 360;
      box(name + " district building", x, height / 2, z, width, height, depth, facade, yaw, true);
      box(name + " roof parapet", x, height + 0.18, z, width + 0.6, 0.36, depth + 0.6, mats.roof, yaw);
      // Layered facade detailing: recessed glazing, pale frames, balcony ledges,
      // vertical pilasters and rooftop service structures.
      const radians = yaw * Math.PI / 180;
      const local = (lx: number, lz: number) => ({ x: x + lx * Math.cos(radians) + lz * Math.sin(radians), z: z - lx * Math.sin(radians) + lz * Math.cos(radians) });
      const windowRows = Math.max(1, floors - 1);
      for (let row = 0; row < windowRows; row++) {
        const wy = 2.1 + row * 3.2;
        for (let col = 0; col < 3; col++) {
          const wx = (col - 1) * width * 0.27;
          const p = local(wx, depth / 2 + 0.07);
          box(name + " framed window", p.x, wy, p.z, width * 0.19, 1.45, 0.16, mats.glass, yaw);
          box(name + " window sill", p.x, wy - 0.78, p.z + 0.08, width * 0.22, 0.16, 0.3, mats.lightConcrete, yaw);
        }
        if (isModern) {
          const p = local(0, depth / 2 + 0.6);
          box(name + " balcony slab", p.x, wy - 0.85, p.z, width * 0.92, 0.18, 1.1, mats.lightConcrete, yaw);
          box(name + " balcony rail", p.x, wy - 0.22, p.z + 0.48, width * 0.9, 0.08, 0.08, mats.white, yaw);
        }
      }
      for (const side of [-1, 1]) {
        const p = local(side * width * 0.48, 0);
        box(name + " facade pilaster", p.x, height / 2, p.z, 0.45, height, depth + 0.15, mats.lightConcrete, yaw);
      }
      box(name + " rooftop utility", x + width * 0.18, height + 0.85, z - depth * 0.12, width * 0.24, 1.4, depth * 0.22, mats.concrete, yaw);
      if (isMarket) {
        const p = local(0, depth / 2 + 0.5);
        box(name + " market awning", p.x, 2.4, p.z, width * 0.82, 0.28, 2.4, i % 2 ? mats.red : mats.gold, yaw);
      }
    }
  }

  // Ghana-style route-number and destination signs.
  const routeSigns = [
    { label: "N1 - TEMA", x: 3650, z: 80 },
    { label: "N4 - MADINA", x: 4900, z: 1880 },
    { label: "N6 - ACHIMOTA", x: -1780, z: 2300 },
    { label: "RING ROAD", x: 750, z: -80 },
    { label: "LABADI BEACH", x: 2300, z: -2220 }
  ];
  for (const sign of routeSigns) {
    box(sign.label + " sign post", sign.x, 3.1, sign.z + 24, 0.45, 6.2, 0.45, mats.roof);
    box(sign.label + " directional board", sign.x, 5.4, sign.z + 24, 11, 2.1, 0.4, makeSignMaterial(sign.label));
  }

  // Landmark footprints preserve the existing Greater Accra spatial catalogue.
  for (const landmark of GREATER_ACCRA_LANDMARK_FOOTPRINTS) {
    const width = landmark.maxX - landmark.minX;
    const depth = landmark.maxZ - landmark.minZ;
    const height = landmark.id === "kotoka-airport" ? 16 :
      landmark.id === "accra-sports-stadium" ? 22 :
      landmark.id === "the-signature" ? 52 :
      landmark.id === "villaggio-vista" ? 36 : 18;
    const base = landmark.id === "accra-sports-stadium" ? mats.green :
      landmark.id === "kotoka-airport" ? mats.lightConcrete :
      landmark.id === "the-signature" || landmark.id === "villaggio-vista" ? mats.modern : mats.concrete;
    if (landmark.id === "accra-sports-stadium") {
      const stadium = new Entity("Accra Sports Stadium landmark");
      stadium.addComponent("render", { type: "cylinder", material: base, castShadows: true, receiveShadows: true });
      stadium.setPosition(landmark.x, height / 2, landmark.z);
      stadium.setLocalScale(width, height, depth);
      app.root.addChild(stadium);
    } else {
      box(landmark.label + " landmark", landmark.x, height / 2, landmark.z, width, height, depth, base, 0, true);
      box(landmark.label + " roofline", landmark.x, height + 0.3, landmark.z, width + 4, 0.6, depth + 4, mats.roof);
    }
  }

  // Traffic-control furniture and public-transport stops at key Accra junctions.
  const junctions = [
    { name: "Osu", x: 1450, z: -1350 },
    { name: "Circle", x: -450, z: 450 },
    { name: "Tetteh Quarshie", x: 3650, z: 1750 },
    { name: "Spintex", x: 5600, z: -1150 }
  ];
  for (const junction of junctions) {
    for (const side of [-1, 1]) {
      const x = junction.x + side * 11;
      box(junction.name + " traffic signal pole", x, 4.2, junction.z + 10, 0.22, 8.4, 0.22, mats.roof);
      box(junction.name + " signal head", x, 7.8, junction.z + 10, 0.72, 1.9, 0.6, mats.roof);
      box(junction.name + " red signal", x, 8.35, junction.z + 9.68, 0.42, 0.42, 0.08, mats.red);
      box(junction.name + " amber signal", x, 7.8, junction.z + 9.68, 0.42, 0.42, 0.08, mats.gold);
      box(junction.name + " green signal", x, 7.25, junction.z + 9.68, 0.42, 0.42, 0.08, mats.green);
    }
  }
  for (const stop of [{ name: "Osu trotro stop", x: 1110, z: -1330 }, { name: "Circle bus stop", x: -520, z: 520 }, { name: "Labadi beach stop", x: 2260, z: -2380 }]) {
    box(stop.name + " shelter", stop.x, 2.2, stop.z, 7.5, 4.4, 3.2, mats.green);
    box(stop.name + " shelter roof", stop.x, 4.55, stop.z, 8.2, 0.28, 3.8, mats.gold);
    box(stop.name + " bench", stop.x, 0.75, stop.z + 1.2, 4.2, 0.35, 0.75, mats.roof);
    box(stop.name + " route board", stop.x, 2.8, stop.z - 1.7, 3.6, 1.4, 0.16, makeSignMaterial("TROTRO STOP"));
  }

  // Parked Ghanaian trotro minibus prop near the Osu district.
  box("Accra trotro minibus body", 1460, 1.35, -1560, 2.35, 2.7, 5.4, mats.green, 0, true);
  box("Accra trotro windscreen", 1460, 2.35, -1557.2, 1.95, 0.9, 0.12, mats.glass);
  box("Accra trotro side windows", 1460, 2.15, -1560, 2.4, 0.78, 4.0, mats.glass);
  box("Accra trotro roof rack", 1460, 2.85, -1560, 1.8, 0.16, 4.0, mats.roof);
  for (const x of [1458.85, 1462.15]) for (const z of [-1561.8, -1558.2]) {
    cylinder("Accra trotro wheel", x, 0.55, z, 0.42, 0.24, mats.roof);
  }

  // Ghanaian roadside service station and street lighting.
  box("Spintex fuel station forecourt", 5650, 0.03, -1040, 52, 0.12, 38, mats.lightConcrete);
  box("Spintex fuel station canopy", 5650, 5.2, -1040, 42, 0.55, 24, mats.red);
  box("Spintex fuel station fascia", 5650, 5.65, -1040, 42, 0.45, 1.2, makeSignMaterial("FUEL STATION"));
  for (const x of [5635, 5650, 5665]) {
    box("Fuel dispenser", x, 1.25, -1040, 1.25, 2.5, 1.2, mats.white, 0, true);
    box("Fuel dispenser display", x, 1.7, -1039.35, 0.7, 0.48, 0.08, mats.glass);
  }
  for (let i = 0; i < 12; i++) {
    const x = 950 + i * 34;
    box("Osu streetlight pole", x, 4.5, -1320, 0.18, 9, 0.18, mats.roof);
    box("Osu streetlight arm", x + 1.8, 8.8, -1320, 3.6, 0.12, 0.12, mats.roof);
    box("Osu streetlight lamp", x + 3.4, 8.65, -1320, 0.8, 0.22, 0.5, mats.gold);
  }

  // Labadi marina watercraft props: a speedboat and a personal watercraft.
  box("Labadi speedboat hull", 2820, 0.65, -3960, 3.2, 0.85, 9.5, mats.white);
  box("Labadi speedboat deck", 2820, 1.15, -3960, 2.7, 0.22, 7.2, mats.red);
  box("Labadi speedboat windscreen", 2820, 1.75, -3958.5, 1.9, 0.85, 0.18, mats.glass);
  box("Labadi speedboat outboard motor", 2820, 0.95, -3965, 0.8, 1.2, 0.8, mats.roof);
  box("Labadi jet ski hull", 2840, 0.48, -3925, 1.1, 0.75, 2.8, mats.gold);
  box("Labadi jet ski seat", 2840, 0.95, -3924.8, 0.55, 0.55, 1.35, mats.roof);

  // Coastal vegetation and a playable Labadi beach / marina approach.
  for (let i = 0; i < 26; i++) {
    const x = 1450 + i * 48;
    const z = -3030 + Math.sin(i * 0.7) * 65;
    cylinder("Labadi palm trunk", x, 4.2, z, 0.34, 8.4, mats.roof);
    cylinder("Labadi palm crown", x, 8.9, z, 2.2, 1.4, mats.palm);
  }
  box("Labadi beach kiosk", 2150, 1.5, -3180, 9, 3, 7, mats.red, 0, true);
  box("Labadi lifeguard hut", 2350, 2, -3210, 6, 4, 6, mats.lightConcrete, 0, true);
  box("Labadi marina jetty", 2800, 0.22, -3900, 7, 0.44, 150, mats.roof);
  box("Marina service building", 2800, 5, -3800, 35, 10, 28, mats.concrete, 0, true);

  // Expanded Ghana-inspired street frontage and residential blocks.
  const storefront = (label: string, x: number, z: number, w: number, d: number, h: number, facade: StandardMaterial) => {
    box(label + " shop structure", x, h/2, z, w, h, d, facade, 0, true);
    box(label + " parapet", x, h + 0.2, z, w + 0.4, 0.4, d + 0.4, mats.roof);
    box(label + " glass frontage", x, h*0.4, z+d/2+0.08, w*0.62, h*0.48, 0.12, mats.glass);
    box(label + " entrance", x-w*0.32, h*0.35, z+d/2+0.1, w*0.18, h*0.65, 0.15, mats.roof);
    box(label + " signboard", x, h*0.85, z+d/2+0.22, w*0.9, 0.65, 0.18, makeSignMaterial(label));
    box(label + " awning", x, h*0.65, z+d/2+0.55, w*0.95, 0.22, 1.1, mats.gold);
  };
  const marketStalls = (label: string, x: number, z: number) => {
    for (let i=0;i<4;i++) {
      const sx=x+(i-1.5)*8;
      box(label+" stall",sx,0.8,z,5.8,1.6,4.2,i%2?mats.market:mats.red,0,true);
      box(label+" canopy",sx,3.1,z,6.2,0.28,4.6,i%2?mats.gold:mats.green);
      box(label+" stall sign",sx,2.45,z+2.35,5.5,0.55,0.18,makeSignMaterial(["PROVISIONS","FRUITS","FABRICS","FOOD"][i]));
    }
  };
  const house = (label: string,x:number,z:number,w:number,d:number,floors:number,facade:StandardMaterial) => {
    const h=floors*3.1;
    const front=z+d/2;
    // Ghanaian urban compound-house language: deep roof edge, shaded veranda,
    // framed windows, security grilles, ventilated gable and a gated courtyard.
    box(label+" house",x,h/2,z,w,h,d,facade,0,true);
    box(label+" roof slab",x,h+0.22,z,w+1.1,0.44,d+1.1,mats.roof);
    box(label+" roof fascia",x,h+0.48,z+d*0.12,w+1.35,0.16,d*0.72,mats.lightConcrete);
    for(let floor=0;floor<floors;floor++) {
      for(const side of [-1,1]) {
        const wx=x+side*w*0.28, wy=1.55+floor*3.1;
        box(label+" window recess",wx,wy,front+0.07,w*0.27,1.34,0.12,mats.concrete);
        box(label+" dark window",wx,wy,front+0.15,w*0.21,1.05,0.12,mats.glass);
        box(label+" security grille",wx,wy,front+0.23,w*0.19,0.92,0.06,mats.roof);
        box(label+" window lintel",wx,wy+0.72,front+0.2,w*0.3,0.12,0.2,mats.lightConcrete);
      }
    }
    box(label+" entrance",x,1.15,front+0.1,w*0.22,2.3,0.18,mats.roof);
    box(label+" veranda canopy",x,2.65,front+1.25,w*0.72,0.24,2.7,mats.lightConcrete);
    for(const side of [-1,1]) box(label+" veranda column",x+side*w*0.32,1.35,front+2.35,0.22,2.7,0.22,mats.concrete);
    // A real opening is left in the front compound wall for the vehicle/person gate.
    const wallZ=front+6.2, wallWidth=(w+9)*0.36;
    box(label+" left compound wall",x-(w+9)*0.32,1.05,wallZ,wallWidth,2.1,0.55,mats.concrete);
    box(label+" right compound wall",x+(w+9)*0.32,1.05,wallZ,wallWidth,2.1,0.55,mats.concrete);
    box(label+" gate pier left",x-(w+9)*0.14,1.35,wallZ,0.55,2.7,0.75,mats.lightConcrete);
    box(label+" gate pier right",x+(w+9)*0.14,1.35,wallZ,0.55,2.7,0.75,mats.lightConcrete);
    box(label+" metal security gate",x,1.05,wallZ,w*0.25,1.9,0.16,mats.roof);
    box(label+" courtyard paving",x,0.025,front+3.8,w+7,0.08,5.8,mats.lightConcrete);
    if(floors>1) {
      box(label+" upper balcony slab",x,3.35,front+0.9,w*0.62,0.18,1.8,mats.concrete);
      box(label+" upper balcony rail",x,3.95,front+1.75,w*0.58,0.12,0.12,mats.roof);
    }
    // Roof-top water storage is common on Accra homes; keep the silhouette low.
    box(label+" rooftop water tank",x+w*0.28,h+1.05,z-d*0.2,1.45,1.5,1.45,mats.industrial);
  };
  const strips=[
    {name:"Osu Oxford Street",x:1450,z:-1180,shops:["MOBILE MONEY","PHARMACY","GROCERY","CHOP BAR","SALON"]},
    {name:"Makola Market",x:-400,z:450,shops:["FABRICS","PROVISIONS","FRUITS","FOOD","HARDWARE"]},
    {name:"East Legon Shops",x:4300,z:1100,shops:["CAFE","SUPERMARKET","PHARMACY","FASHION","RESTAURANT"]},
    {name:"Madina Market",x:4900,z:2150,shops:["PROVISIONS","FOOD","FABRICS","PHONE SHOP","BARBER"]},
    {name:"Spintex Shops",x:5600,z:-1450,shops:["AUTO PARTS","FUEL","WAREHOUSE","SUPERMARKET","ELECTRICAL"]},
    {name:"Tema Community",x:7900,z:300,shops:["SHOP","PHARMACY","FOOD","MOBILE MONEY","BAKERY"]}
  ];
  for(const strip of strips){
    strip.shops.forEach((label,i)=>storefront(strip.name+" "+label,strip.x+(i-2)*15,strip.z,12.5,10,4.2+(i%2)*0.6,i%3===0?mats.market:mats.residential));
    box(strip.name+" paved frontage",strip.x,0.02,strip.z+13,90,0.1,8,mats.lightConcrete);
    for(let i=0;i<3;i++)box(strip.name+" planter",strip.x+(i-1)*28,0.28,strip.z+20,3.4,0.56,3.4,mats.green);
  }
  marketStalls("Makola covered market", -620, 650);
  marketStalls("Madina market extension", 5140, 2350);
  const housing=[
    {name:"Nima compounds",x:-950,z:1100},{name:"Dansoman homes",x:-2800,z:-500},
    {name:"East Legon residences",x:4450,z:1500},{name:"Adenta homes",x:6100,z:2500},
    {name:"Tema community homes",x:8050,z:600}
  ];
  for(const c of housing)for(let i=0;i<5;i++)house(c.name,c.x+(i-2)*38,c.z+(i%2)*26,18+(i%3)*4,16,1+i%2,i%2?mats.residential:mats.lightConcrete);
  for(const p of [{name:"Circle",x:-450,z:450},{name:"Kaneshie",x:-1800,z:300},{name:"Adenta",x:6000,z:2300},{name:"Tema",x:8000,z:0}])for(let i=0;i<3;i++){
    const x=p.x+(i-1)*12;
    box(p.name+" roadside kiosk",x,1.5,p.z+42,7.2,3,6.2,mats.market,0,true);
    box(p.name+" kiosk awning",x,3.25,p.z+42,8,0.3,7,i%2?mats.green:mats.gold);
    box(p.name+" kiosk counter",x,1,p.z+45.3,6.8,1.1,0.2,mats.roof);
  }
  for(const lot of [{name:"Osu parking",x:1540,z:-1220},{name:"Makola loading yard",x:-730,z:580},{name:"East Legon parking",x:4480,z:1080},{name:"Tema parking",x:8140,z:250}]){
    plane(lot.name+" paved lot",lot.x,0.025,lot.z,46,32,mats.lightConcrete);
    for(let i=0;i<6;i++)box(lot.name+" bay line",lot.x-20+i*8,0.09,lot.z,0.14,0.03,12,mats.white);
    box(lot.name+" loading curb",lot.x,0.16,lot.z+16,44,0.32,1.2,mats.kerb);
  }

  return {
    blockers,
    spawn: { x: 1180, z: -1500 },
    taxiSpawn: { x: 1185, z: -1504 }
  };
}

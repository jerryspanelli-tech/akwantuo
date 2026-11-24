import { AppBase, Color, Entity, StandardMaterial, Texture, PIXELFORMAT_RGBA8 } from "playcanvas";
import { GREATER_ACCRA_COASTLINE, GREATER_ACCRA_MAP_EXTENT, GREATER_ACCRA_REGION_ANCHORS, GREATER_ACCRA_ROAD_PATHS } from "../world/greaterAccraLayout";
import { GREATER_ACCRA_LANDMARK_FOOTPRINTS } from "../world/greaterAccraLandmarkData";
import { GREATER_ACCRA_RAIL_NODES, GREATER_ACCRA_RAIL_ROUTES } from "../world/railNetwork";
import { addGhanaAdditionalLandmarks } from "./additionalLandmarks";

export type WorldBlocker = { x: number; z: number; hx: number; hz: number; yaw: number };
export type GreaterAccraWorld = {
  blockers: WorldBlocker[];
  spawn: { x: number; z: number };
  taxiSpawn: { x: number; z: number };
  interactables: Array<{ id: string; label: string; x: number; z: number; radius: number }>;
  update: (dt: number, nightAmount?: number) => void;
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
    palm: material(0.23, 0.31, 0.17),
    streetPole: material(0.20, 0.22, 0.23),
    lampHousing: material(0.27, 0.29, 0.30),
    lampGlow: material(0.16, 0.13, 0.075),
    skinDeep: material(0.20, 0.095, 0.055), skinRich: material(0.31, 0.15, 0.085),
    skinWarm: material(0.43, 0.23, 0.13), skinLight: material(0.56, 0.34, 0.22)
  };
  // The diffuser mesh is hidden in daylight and emits a warm amber glow at night.
  mats.lampGlow.emissive = new Color(1.0, 0.62, 0.25);
  mats.lampGlow.update();

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
    if (solid) blockers.push({ x, z, hx: sx * 0.52, hz: sz * 0.52, yaw });
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

  // Physical roadside sign assembly: twin galvanised posts, a deep backing,
  // inset reflective face and gold edging. The board remains readable from
  // the approach side and is built once with the rest of the static world.
  const mountedRoadSign = (name: string, label: string, x: number, z: number,
    width: number, height: number, boardY = 5.35) => {
    const postOffset = width * 0.39;
    for (const side of [-1, 1]) {
      box(name + " steel support", x + side * postOffset, boardY / 2, z,
        0.24, boardY, 0.24, mats.roof);
      box(name + " post footing", x + side * postOffset, 0.18, z,
        0.58, 0.36, 0.58, mats.concrete);
    }
    box(name + " sign backing", x, boardY, z, width + 0.55, height + 0.5, 0.5, mats.roof);
    box(name + " reflective face", x, boardY, z + 0.29, width, height, 0.12, makeSignMaterial(label));
    box(name + " upper gold trim", x, boardY + height / 2 + 0.13, z + 0.36, width + 0.08, 0.12, 0.16, mats.gold);
    box(name + " lower gold trim", x, boardY - height / 2 - 0.13, z + 0.36, width + 0.08, 0.12, 0.16, mats.gold);
    return undefined;
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
    mountedRoadSign(name + " district entrance sign", name, anchor.x - 35, anchor.z + 65, 13, 2.1);
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
    mountedRoadSign(sign.label + " directional sign", sign.label, sign.x, sign.z + 24, 11, 2.1);
  }

  // Landmark footprints preserve the existing Greater Accra spatial catalogue.
  for (const landmark of GREATER_ACCRA_LANDMARK_FOOTPRINTS) {
    const width = landmark.maxX - landmark.minX;
    if (["black-star-square", "jamestown-lighthouse", "osu-castle", "accra-arts-centre"].includes(landmark.id)) {
      // Dedicated models are built below; retain their registered collision bounds.
      blockers.push({ x: landmark.x, z: landmark.z, hx: width * 0.52, hz: (landmark.maxZ - landmark.minZ) * 0.52, yaw: 0 });
      continue;
    }
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
    } else if (["national-theatre", "kwame-nkrumah-memorial", "accra-mall"].includes(landmark.id)) {
      // These locations receive dedicated architectural assemblies below.
      // Keep their collision footprint without burying the detailed model
      // inside the former generic solid landmark block.
      blockers.push({ x: landmark.x, z: landmark.z, hx: width * 0.52, hz: depth * 0.52, yaw: 0 });
    } else {
      box(landmark.label + " landmark", landmark.x, height / 2, landmark.z, width, height, depth, base, 0, true);
      box(landmark.label + " roofline", landmark.x, height + 0.3, landmark.z, width + 4, 0.6, depth + 4, mats.roof);
    }

    // Give the named Accra landmarks recognisable silhouettes rather than
    // treating every footprint as another anonymous rectangular building.
    if (landmark.id === "accra-sports-stadium") {
      box("Accra Sports Stadium playing field", landmark.x, 0.18, landmark.z, width * 0.48, 0.12, depth * 0.42, mats.grass);
      box("Accra Sports Stadium west stand", landmark.x - width * 0.34, 7.2, landmark.z, width * 0.16, 14.4, depth * 0.72, mats.lightConcrete);
      box("Accra Sports Stadium east stand", landmark.x + width * 0.34, 7.2, landmark.z, width * 0.16, 14.4, depth * 0.72, mats.lightConcrete);
      box("Accra Sports Stadium roof canopy", landmark.x, 16.2, landmark.z, width * 0.92, 0.7, depth * 0.9, mats.roof);
    } else if (landmark.id === "kotoka-airport") {
      box("Kotoka terminal departure canopy", landmark.x, 7.2, landmark.z + depth * 0.24, width * 0.92, 1.1, depth * 0.22, mats.white);
      box("Kotoka terminal glazed frontage", landmark.x, 5.2, landmark.z + depth * 0.31, width * 0.82, 7.2, 0.35, mats.glass);
      box("Kotoka air traffic control tower", landmark.x + width * 0.34, 13, landmark.z - depth * 0.18, 5.5, 18, 5.5, mats.lightConcrete);
      box("Kotoka control room glazing", landmark.x + width * 0.34, 20.2, landmark.z - depth * 0.18, 6.1, 2.4, 6.1, mats.glass);
      box("Kotoka control tower roof", landmark.x + width * 0.34, 21.6, landmark.z - depth * 0.18, 7, 0.35, 7, mats.roof);
    } else if (landmark.id === "the-signature") {
      box("The Signature lower tower setback", landmark.x, 30, landmark.z, width * 0.86, 16, depth * 0.86, mats.glass);
      box("The Signature upper tower", landmark.x, 47, landmark.z, width * 0.64, 18, depth * 0.64, mats.modern);
      box("The Signature crown", landmark.x, 57, landmark.z, width * 0.68, 1.2, depth * 0.68, mats.gold);
    } else if (landmark.id === "villaggio-vista") {
      for (const side of [-1, 1]) {
        box("Villaggio Vista terraced wing", landmark.x + side * width * 0.28, 13, landmark.z, width * 0.34, 26, depth * 0.82, mats.modern);
        box("Villaggio Vista balcony terrace", landmark.x + side * width * 0.28, 8.2, landmark.z + depth * 0.44, width * 0.31, 0.55, 2.8, mats.lightConcrete);
      }
      box("Villaggio Vista central atrium", landmark.x, 12, landmark.z + depth * 0.46, width * 0.22, 22, 0.5, mats.glass);
    }
  }

  // AKWANTUO ACCRA LANDMARK DETAIL PASS
  // Distinctive, landmark-specific silhouettes replace the anonymous-box look.
  // These additions use shared materials and the existing surveyed game anchors;
  // the Greater Accra road/map coordinates are deliberately untouched.
  const addEllipsoid = (name: string, x: number, y: number, z: number,
    sx: number, sy: number, sz: number, surface: StandardMaterial, yaw = 0) => {
    const entity = new Entity(name);
    entity.addComponent("render", { type: "sphere", material: surface, castShadows: true, receiveShadows: true });
    entity.setPosition(x, y, z);
    entity.setLocalScale(sx, sy, sz);
    entity.setEulerAngles(0, yaw, 0);
    app.root.addChild(entity);
    return entity;
  };

  const nationalTheatre = GREATER_ACCRA_LANDMARK_FOOTPRINTS.find((item) => item.id === "national-theatre");
  if (nationalTheatre) {
    const { x, z } = nationalTheatre;
    cylinder("National Theatre circular forecourt", x, 0.07, z, 54, 0.14, mats.lightConcrete);
    cylinder("National Theatre raised plinth", x, 0.42, z, 38, 0.7, mats.concrete);
    // The real building's sculptural, overlapping roof forms are represented
    // with smooth shell volumes instead of a single rectangular block.
    addEllipsoid("National Theatre west sculptural roof shell", x - 17, 13.5, z, 43, 9, 30, mats.white, -12);
    addEllipsoid("National Theatre central sculptural roof shell", x + 4, 16.5, z - 1, 39, 10, 27, mats.lightConcrete, 8);
    addEllipsoid("National Theatre east sculptural roof shell", x + 23, 12.5, z + 4, 34, 8, 25, mats.white, 19);
    box("National Theatre glazed entrance", x, 5.2, z + 23, 47, 9.8, 1.1, mats.glass);
    box("National Theatre entrance canopy", x, 10.3, z + 30, 51, 0.7, 13, mats.white);
    for (let i = 0; i < 8; i++) {
      const px = x - 28 + i * 8;
      cylinder("National Theatre entrance column", px, 4.6, z + 30, 0.48, 9.2, mats.lightConcrete);
    }
    box("National Theatre front steps", x, 0.42, z + 38, 36, 0.8, 8, mats.lightConcrete);
    box("National Theatre Ghana flag mast", x - 47, 8, z - 22, 0.22, 16, 0.22, mats.roof);
    box("National Theatre flag red stripe", x - 44, 14.5, z - 22, 5.2, 1.05, 0.08, mats.red);
    box("National Theatre flag gold stripe", x - 44, 13.45, z - 22, 5.2, 1.05, 0.08, mats.gold);
    box("National Theatre flag green stripe", x - 44, 12.4, z - 22, 5.2, 1.05, 0.08, mats.green);
  }

  const nkrumahPark = GREATER_ACCRA_LANDMARK_FOOTPRINTS.find((item) => item.id === "kwame-nkrumah-memorial");
  if (nkrumahPark) {
    const { x, z } = nkrumahPark;
    cylinder("Kwame Nkrumah Memorial circular plaza", x, 0.08, z, 48, 0.16, mats.lightConcrete);
    cylinder("Kwame Nkrumah Memorial outer garden ring", x, 0.18, z, 39, 0.18, mats.green);
    cylinder("Kwame Nkrumah Memorial inner paving", x, 0.3, z, 32, 0.22, mats.concrete);
    // Tiered dark mausoleum roof and raised central monument, with four
    // outward-sloping fins to give the memorial its distinctive profile.
    cylinder("Kwame Nkrumah Memorial lower podium", x, 1.1, z, 19, 1.5, mats.roof);
    cylinder("Kwame Nkrumah Memorial upper podium", x, 2.3, z, 15, 1.0, mats.concrete);
    addEllipsoid("Kwame Nkrumah Memorial curved roof", x, 5.2, z, 19, 4.2, 19, mats.roof);
    cylinder("Kwame Nkrumah Memorial lantern base", x, 8.3, z, 3.2, 2.0, mats.gold);
    addEllipsoid("Kwame Nkrumah Memorial crown", x, 9.7, z, 4.2, 1.2, 4.2, mats.roof);
    for (let i = 0; i < 4; i++) {
      const angle = (Math.PI / 2) * i;
      const fin = box("Kwame Nkrumah Memorial radial fin",
        x + Math.cos(angle) * 15, 4.8, z + Math.sin(angle) * 15,
        1.1, 8.8, 13, mats.lightConcrete, -angle * 180 / Math.PI);
      fin.setEulerAngles(0, -angle * 180 / Math.PI, angle % 2 === 0 ? -8 : 8);
    }
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      cylinder("Kwame Nkrumah Memorial garden bollard",
        x + Math.cos(angle) * 35, 0.55, z + Math.sin(angle) * 35, 0.22, 1.1, mats.gold);
    }
    box("Kwame Nkrumah Memorial entrance walk", x, 0.16, z + 52, 9, 0.2, 25, mats.lightConcrete);
  }

  const accraMall = GREATER_ACCRA_LANDMARK_FOOTPRINTS.find((item) => item.id === "accra-mall");
  if (accraMall) {
    const { x, z } = accraMall;
    // Broad low-rise retail wings, glazed atrium and shaded entrance forecourt.
    box("Accra Mall west retail wing", x - 47, 8, z, 86, 16, 142, mats.lightConcrete);
    box("Accra Mall east retail wing", x + 48, 8, z, 88, 16, 142, mats.concrete);
    box("Accra Mall central glass atrium", x, 10, z + 8, 18, 20, 102, mats.glass);
    box("Accra Mall continuous roof canopy", x, 17, z, 198, 1.2, 151, mats.roof);
    box("Accra Mall front entrance glazing", x, 6, z + 76, 72, 11, 0.8, mats.glass);
    box("Accra Mall entrance canopy", x, 12, z + 87, 84, 1.1, 17, mats.white);
    for (let i = 0; i < 7; i++) {
      const px = x - 30 + i * 10;
      cylinder("Accra Mall entrance column", px, 5.7, z + 87, 0.42, 11.4, mats.lightConcrete);
    }
    box("Accra Mall rooftop sign fascia", x, 18.2, z + 76, 62, 2.4, 1.1, mats.green);
    box("Accra Mall drop-off paving", x, 0.04, z + 108, 160, 0.12, 36, mats.lightConcrete);
    for (let i = 0; i < 9; i++) {
      box("Accra Mall drop-off lane marking", x - 68 + i * 17, 0.12, z + 108, 0.18, 0.025, 25, mats.white);
    }
  }

  const signature = GREATER_ACCRA_LANDMARK_FOOTPRINTS.find((item) => item.id === "the-signature");
  if (signature) {
    const { x, z } = signature;
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      const px = x + Math.cos(angle) * 38;
      const pz = z + Math.sin(angle) * 38;
      box("The Signature vertical facade fin", px, 28, pz, 1.4, 54, 1.4, mats.lightConcrete, -angle * 180 / Math.PI);
    }
    for (let floor = 1; floor <= 12; floor++) {
      const y = floor * 4.1;
      box("The Signature continuous balcony band", x, y, z + 37, 83 - floor * 1.6, 0.22, 1.2, mats.white);
    }
    box("The Signature landscaped arrival court", x, 0.06, z + 58, 100, 0.12, 26, mats.green);
  }

  // Add detailed architecture only for the four newly registered landmark sites.
  addGhanaAdditionalLandmarks(app);

  // Traffic-control furniture and public-transport stops at key Accra junctions.
  const junctions = [
    { name: "Osu", x: 1450, z: -1350 },
    { name: "Circle", x: -450, z: 450 },
    { name: "Tetteh Quarshie", x: 3650, z: 1750 },
    { name: "Spintex", x: 5600, z: -1150 }
  ];
  const signalHeads: Array<{red:Entity[];amber:Entity[];green:Entity[];offset:number}> = [];
  for (const [junctionIndex,junction] of junctions.entries()) {
    const red:Entity[]=[], amber:Entity[]=[], green:Entity[]=[];
    for (const side of [-1, 1]) {
      const x = junction.x + side * 11;
      box(junction.name + " traffic signal pole", x, 4.2, junction.z + 10, 0.22, 8.4, 0.22, mats.roof);
      box(junction.name + " signal head", x, 7.8, junction.z + 10, 0.72, 1.9, 0.6, mats.roof);
      red.push(box(junction.name + " red signal", x, 8.35, junction.z + 9.68, 0.42, 0.42, 0.08, mats.red));
      amber.push(box(junction.name + " amber signal", x, 7.8, junction.z + 9.68, 0.42, 0.42, 0.08, mats.gold));
      green.push(box(junction.name + " green signal", x, 7.25, junction.z + 9.68, 0.42, 0.42, 0.08, mats.green));
    }
    signalHeads.push({red,amber,green,offset:junctionIndex*12});
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
  // Reusable Ghanaian arterial LED streetlight assembly. The pole, base plate,
  // outreach arm, diagonal brace, sealed luminaire and warm diffuser share a
  // small material palette; only the 12 existing practical lights cast light.
  const streetLamps: Array<{ light: Entity | null; diffuser: Entity }> = [];
  const addStreetlight = (name: string, x: number, z: number, yaw = 0, hasPracticalLight = true) => {
    // Yaw rotates the outreach arm across the carriageway while the mast stays vertical.
    const radians = yaw * Math.PI / 180;
    const offset = (distance: number) => ({
      x: x + Math.cos(radians) * distance,
      z: z - Math.sin(radians) * distance
    });
    box(name + " reinforced concrete footing", x, 0.22, z, 0.72, 0.44, 0.72, mats.concrete);
    cylinder(name + " galvanised base plate", x, 0.48, z, 0.31, 0.12, mats.streetPole);
    cylinder(name + " tapered steel mast", x, 4.95, z, 0.115, 9.0, mats.streetPole);
    cylinder(name + " mast collar", x, 8.35, z, 0.15, 0.24, mats.lampHousing);
    const arm = offset(1.55);
    box(name + " outreach arm", arm.x, 8.82, arm.z, 3.25, 0.16, 0.16, mats.streetPole, yaw);
    const bracePosition = offset(0.82);
    const brace = new Entity(name + " arm brace");
    brace.addComponent("render", { type: "box", material: mats.streetPole, castShadows: false, receiveShadows: true });
    brace.setPosition(bracePosition.x, 8.58, bracePosition.z);
    brace.setLocalScale(1.55, 0.12, 0.12);
    brace.setEulerAngles(0, yaw, -18);
    app.root.addChild(brace);
    const headPosition = offset(3.15);
    const head = box(name + " sealed LED luminaire", headPosition.x, 8.73, headPosition.z, 1.18, 0.24, 0.58, mats.lampHousing, yaw);
    const diffuser = box(name + " warm LED diffuser", headPosition.x, 8.59, headPosition.z + 0.02, 0.88, 0.045, 0.38, mats.lampGlow, yaw);
    if (hasPracticalLight) {
      head.addComponent("light", {
        type: "omni", color: new Color(1, 0.76, 0.48), intensity: 0.85,
        range: 22, enabled: false, castShadows: false
      });
    }
    streetLamps.push({ light: hasPracticalLight ? head : null, diffuser });
  };

  // Keep real point lights capped for mobile performance. Additional fixtures
  // are visible street furniture and glow at night without adding light sources.
  for (let i = 0; i < 6; i++) addStreetlight("Osu Oxford Street LED streetlight", 1350 + i * 42, -1320, 0);
  for (let i = 0; i < 2; i++) addStreetlight("Circle LED streetlight", -500 + i * 62, 390, 70);
  for (let i = 0; i < 2; i++) addStreetlight("East Legon LED streetlight", 4250 + i * 62, 1060, 140);
  for (let i = 0; i < 2; i++) addStreetlight("Spintex Road LED streetlight", 5500 + i * 62, -1490, 140);
  // Decorative fixtures extend the streetlight network toward the N1/Tema,
  // N4/Madina and N6/Achimota corridors without increasing dynamic light count.
  addStreetlight("N1 Tema corridor LED streetlight", 2100, 220, 90, false);
  addStreetlight("N1 Tema corridor LED streetlight", 2900, 145, 90, false);
  addStreetlight("N4 Madina approach LED streetlight", 4850, 1795, 90, false);
  addStreetlight("N6 Achimota approach LED streetlight", -1787, 2354, 180, false);

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
    box(label + " recessed shopfront", x, h*0.4, z+d/2+0.035, w*0.72, h*0.52, 0.18, mats.concrete);
    box(label + " glass frontage", x, h*0.4, z+d/2+0.14, w*0.62, h*0.46, 0.12, mats.glass);
    box(label + " entrance", x-w*0.32, h*0.35, z+d/2+0.17, w*0.18, h*0.65, 0.15, mats.roof);
    box(label + " roller shutter header", x+w*0.19, h*0.69, z+d/2+0.22, w*0.38, 0.16, 0.2, mats.lightConcrete);
    box(label + " shop threshold", x, 0.12, z+d/2+0.72, w*0.82, 0.18, 1.15, mats.lightConcrete);
    box(label + " signboard", x, h*0.85, z+d/2+0.26, w*0.9, 0.65, 0.18, makeSignMaterial(label));
    box(label + " sign trim", x, h*0.85+0.38, z+d/2+0.28, w*0.94, 0.08, 0.24, mats.gold);
    box(label + " awning", x, h*0.65, z+d/2+0.62, w*0.95, 0.22, 1.1, mats.gold);
  };
  const marketStalls = (label: string, x: number, z: number) => {
    for (let i=0;i<4;i++) {
      const sx=x+(i-1.5)*8;
      box(label+" stall",sx,0.8,z,5.8,1.6,4.2,i%2?mats.market:mats.red,0,true);
      box(label+" canopy",sx,3.1,z,6.2,0.28,4.6,i%2?mats.gold:mats.green);
      for (const side of [-1,1]) {
        box(label+" canopy support",sx+side*2.75,1.95,z+1.85,0.12,2.3,0.12,mats.roof);
      }
      box(label+" vendor counter",sx,1.72,z+2.15,5.6,0.22,0.72,mats.lightConcrete);
      box(label+" produce display left",sx-1.55,1.98,z+2.05,1.25,0.48,0.62,i%2?mats.red:mats.gold);
      box(label+" produce display right",sx+1.55,1.98,z+2.05,1.25,0.48,0.62,i%2?mats.green:mats.market);
      box(label+" stall sign",sx,2.45,z+2.55,5.5,0.55,0.18,makeSignMaterial(["PROVISIONS","FRUITS","FABRICS","FOOD"][i]));
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

  // Street-level pedestrian infrastructure: raised walks, open concrete drains,
  // short removable-looking grate covers, bollards and zebra crossings.
  // Keep these concentrated around showcase commercial streets to control draw calls.
  for (const strip of strips) {
    const half = 42;
    for (const side of [-1, 1]) {
      const walkZ = strip.z + side * 18;
      box(strip.name + " pedestrian sidewalk", strip.x, 0.16, walkZ, 88, 0.28, 3.2, mats.lightConcrete);
      box(strip.name + " roadside gutter", strip.x, 0.09, strip.z + side * 21, 88, 0.18, 0.72, mats.concrete);
      for (let segment = 0; segment < 8; segment++) {
        const gx = strip.x - half + segment * 12;
        box(strip.name + " drain grate", gx, 0.205, strip.z + side * 21, 2.6, 0.055, 0.62, mats.roof);
      }
      for (let post = 0; post < 5; post++) {
        cylinder(strip.name + " pedestrian bollard", strip.x - 34 + post * 17, 0.52, walkZ + side * 1.9, 0.14, 1.04, mats.gold);
      }
    }
    // Litter bins and utility cabinets are placed at the ends, not repeated per shop.
    box(strip.name + " public litter bin", strip.x - 45, 0.62, strip.z + 15, 0.82, 1.24, 0.82, mats.green);
    box(strip.name + " electrical cabinet", strip.x + 45, 0.72, strip.z - 17, 1.1, 1.44, 0.8, mats.industrial);
  }

  // Marked pedestrian crossings at the principal urban junction approaches.
  for (const crossing of [
    { name: "Osu Oxford Street", x: 1450, z: -1350 },
    { name: "Circle", x: -450, z: 450 },
    { name: "Tetteh Quarshie", x: 3650, z: 1750 },
    { name: "Spintex", x: 5600, z: -1150 }
  ]) {
    for (let stripe = 0; stripe < 7; stripe++) {
      box(crossing.name + " zebra crossing stripe", crossing.x - 6 + stripe * 2, 0.155, crossing.z - 18, 1.05, 0.035, 6.5, mats.white);
    }
    box(crossing.name + " crossing approach kerb", crossing.x, 0.18, crossing.z - 23, 18, 0.32, 0.8, mats.kerb);
  }

  // A small number of roadside shade trees, with shared materials and simple crowns.
  for (const tree of [
    { x: 1370, z: -1145 }, { x: 1535, z: -1145 }, { x: 1695, z: -1145 },
    { x: -520, z: 360 }, { x: -280, z: 360 },
    { x: 4210, z: 1010 }, { x: 4390, z: 1010 },
    { x: 4820, z: 2070 }, { x: 5000, z: 2070 },
    { x: 5520, z: -1535 }, { x: 5700, z: -1535 }
  ]) {
    cylinder("Accra roadside shade tree trunk", tree.x, 2.5, tree.z, 0.28, 5, mats.roof);
    cylinder("Accra roadside shade tree canopy", tree.x, 5.8, tree.z, 2.3, 2.8, mats.green);
  }


  // Living city layer: lightweight pedestrians, moving local traffic and drifting
  // tropical cloud banks. All actors reuse shared materials and update in-place.
  const makeActorPart = (parent: Entity, type: "box" | "sphere" | "cylinder", name: string,
    x: number, y: number, z: number, sx: number, sy: number, sz: number, mat: StandardMaterial) => {
    const part = new Entity(name);
    part.addComponent("render", { type, material: mat, castShadows: false, receiveShadows: true });
    part.setLocalPosition(x, y, z);
    part.setLocalScale(sx, sy, sz);
    parent.addChild(part);
    return part;
  };

  const peopleRoutes = [
    [{x:1370,z:-1160},{x:1535,z:-1160},{x:1535,z:-1205},{x:1370,z:-1205}],
    [{x:-560,z:390},{x:-300,z:390},{x:-300,z:435},{x:-560,z:435}],
    [{x:4180,z:1060},{x:4400,z:1060},{x:4400,z:1105},{x:4180,z:1105}],
    [{x:4820,z:2100},{x:5010,z:2100},{x:5010,z:2145},{x:4820,z:2145}],
    [{x:5500,z:-1490},{x:5720,z:-1490},{x:5720,z:-1445},{x:5500,z:-1445}],
    [{x:7800,z:340},{x:8020,z:340},{x:8020,z:385},{x:7800,z:385}]
  ];
  const clothing = [mats.green,mats.gold,mats.red,mats.modern,mats.market,mats.white,mats.roof,mats.modern];
  const pedestrians: Array<{root:Entity; route:readonly {x:number;z:number}[]; segment:number; t:number; speed:number; phase:number; legs:Entity[]; arms:Entity[]}> = [];
  for(let i=0;i<18;i++){
    const route=peopleRoutes[i%peopleRoutes.length];
    const root=new Entity("Accra pedestrian "+(i+1)); app.root.addChild(root);
    const shirt=clothing[i%clothing.length];
    // Shared Ghanaian skin-tone palette keeps the street crowd visually varied
    // while reusing materials and preserving the existing mobile-friendly rig.
    const skinTone=[mats.skinDeep,mats.skinRich,mats.skinWarm,mats.skinLight][i%4];
    // Layered low-poly character silhouettes: varied shirts, trousers, footwear,
    // hair/headwear and small carried items. Shared materials keep draw cost bounded.
    const isVendor = i % 6 === 0;
    const isCommuter = i % 4 === 0;
    makeActorPart(root,"box","Pedestrian torso",0,1.15,0,0.48,0.78,0.28,shirt);
    makeActorPart(root,"box","Pedestrian shirt hem",0,0.78,0,0.5,0.16,0.3,shirt);
    makeActorPart(root,"sphere","Pedestrian head",0,1.78,0,0.25,0.28,0.25,skinTone);
    makeActorPart(root,"box","Pedestrian hair",0,1.94,-0.025,0.27,0.09,0.27,mats.roof);
    if (isVendor) {
      makeActorPart(root,"cylinder","Pedestrian headwrap",0,1.99,0,0.17,0.12,0.17,i%2?mats.red:mats.gold);
    } else {
      makeActorPart(root,"box","Pedestrian cap brim",0,1.91,0.06,0.31,0.045,0.22,mats.roof);
    }
    makeActorPart(root,"box","Pedestrian waist",0,0.72,0,0.42,0.16,0.27,mats.roof);
    const arms=[-1,1].map(side=>{
      const arm=makeActorPart(root,"cylinder","Pedestrian arm",side*0.34,1.12,0,0.105,0.68,0.105,shirt);
      makeActorPart(root,"sphere","Pedestrian hand",side*0.34,0.76,0,0.095,0.1,0.095,skinTone);
      return arm;
    });
    const legs=[-1,1].map(side=>{
      const trouser=makeActorPart(root,"cylinder","Pedestrian trouser leg",side*0.13,0.48,0,0.13,0.72,0.13,i%3===0?mats.modern:mats.roof);
      makeActorPart(root,"box","Pedestrian shoe",side*0.13,0.08,0.09,0.2,0.13,0.34,mats.roof);
      return trouser;
    });
    if (isCommuter) {
      makeActorPart(root,"box","Pedestrian shoulder bag",0.34,1.02,-0.16,0.22,0.34,0.18,mats.market);
      makeActorPart(root,"cylinder","Pedestrian bag strap",0.16,1.28,0.02,0.035,0.62,0.035,mats.roof);
    }
    const start=route[(i*3)%route.length];
    root.setPosition(start.x,0,start.z);
    pedestrians.push({root,route,segment:(i*3)%route.length,t:(i%5)/5,speed:0.75+(i%4)*0.16,phase:i*0.8,legs,arms});
  }

  const trafficRoutes = GREATER_ACCRA_ROAD_PATHS.filter(path =>
    ["ring-road-central","ring-road-coastal","la-beach-road","liberation-road","spintex-road","n1-tema-corridor"].includes(path.roadSegmentId)
  );
  const trafficColors=[mats.gold,mats.white,mats.red,mats.green,mats.modern,mats.glass];
  const traffic:Array<{root:Entity;route:typeof trafficRoutes[number];distance:number;speed:number;length:number;signalIndex:number|null}>=[];
  for(let i=0;i<12;i++){
    const route=trafficRoutes[i%trafficRoutes.length];
    const length=route.points.slice(1).reduce((sum,p,index)=>sum+Math.hypot(p.x-route.points[index].x,p.z-route.points[index].z),0);
    const root=new Entity(i%3===0?"Accra trotro traffic":i%3===1?"Accra taxi traffic":"Accra private car traffic");
    app.root.addChild(root);
    const isTrotro = i%3===0;
    const isTaxi = i%3===1;
    const bodyMat=isTaxi?mats.yellow:trafficColors[i%trafficColors.length];
    const bodyLength=isTrotro?4.8:4.15;
    const bodyHeight=isTrotro?1.0:0.78;
    const bodyWidth=isTrotro?2.05:1.9;
    makeActorPart(root,"box","Traffic vehicle chassis",0,0.62,0,bodyWidth*0.92,0.3,bodyLength*0.92,mats.roof);
    makeActorPart(root,"box",isTrotro?"Ghana trotro minibus body":isTaxi?"Accra taxi body":"Accra private car body",0,0.78,0,bodyWidth,bodyHeight,bodyLength,bodyMat);
    const cabinZ=isTrotro?-0.18:-0.25;
    makeActorPart(root,"box","Vehicle cabin glass",0,isTrotro?1.55:1.42,cabinZ,bodyWidth*0.82,isTrotro?0.78:0.68,isTrotro?2.7:2.0,mats.glass);
    makeActorPart(root,"box","Vehicle roof",0,isTrotro?1.98:1.78,cabinZ,bodyWidth*0.78,0.14,isTrotro?2.5:1.8,bodyMat);
    // Separate front/rear glazing and side passenger windows make the silhouette
    // read as a minibus/trotro rather than a generic moving block.
    makeActorPart(root,"box","Vehicle windscreen",0,isTrotro?1.52:1.4,bodyLength*0.5+0.012,bodyWidth*0.7,0.52,0.055,mats.glass);
    makeActorPart(root,"box","Vehicle rear window",0,isTrotro?1.5:1.38,-bodyLength*0.5-0.012,bodyWidth*0.62,0.42,0.055,mats.glass);
    for(const side of [-1,1]){
      for(const z of (isTrotro?[-1.45,-0.48,0.52,1.42]:[-0.82,0.72])){
        makeActorPart(root,"box","Vehicle side passenger window",side*(bodyWidth/2+0.018),isTrotro?1.55:1.45,z,0.055,isTrotro?0.48:0.42,isTrotro?0.78:0.92,mats.glass);
      }
      makeActorPart(root,"box","Vehicle side mirror",side*(bodyWidth/2+0.16),1.42,bodyLength*0.34,0.24,0.12,0.2,mats.roof);
      makeActorPart(root,"box","Vehicle side rubbing strip",side*(bodyWidth/2+0.025),0.82,0,0.055,0.13,bodyLength*0.76,mats.white);
    }
    makeActorPart(root,"box","Vehicle front bumper",0,0.38,bodyLength*0.51,bodyWidth*0.96,0.18,0.18,mats.roof);
    makeActorPart(root,"box","Vehicle rear bumper",0,0.38,-bodyLength*0.51,bodyWidth*0.96,0.18,0.18,mats.roof);
    makeActorPart(root,"box","Vehicle front grille",0,0.78,bodyLength*0.51+0.02,bodyWidth*0.28,0.24,0.06,mats.roof);
    for(const side of [-1,1]){
      makeActorPart(root,"box","Vehicle headlamp",side*bodyWidth*0.34,0.91,bodyLength*0.51+0.035,0.28,0.2,0.07,mats.white);
      makeActorPart(root,"box","Vehicle tail lamp",side*bodyWidth*0.36,0.9,-bodyLength*0.51-0.035,0.24,0.28,0.07,mats.red);
    }
    if(isTaxi){
      makeActorPart(root,"box","Accra taxi roof marker",0,2.02,-0.15,0.72,0.16,0.34,mats.gold);
      makeActorPart(root,"box","Accra taxi side stripe",bodyWidth/2+0.035,0.82,0,0.06,0.16,bodyLength*0.72,mats.roof);
    }
    if(isTrotro){
      makeActorPart(root,"box","Trotro roof luggage rack",0,2.12,-0.12,1.55,0.12,2.65,mats.roof);
      makeActorPart(root,"box","Trotro route board",0,2.04,bodyLength*0.5+0.08,0.86,0.24,0.08,mats.gold);
    }
    for(const side of [-1,1])for(const z of [-bodyLength*0.34,bodyLength*0.34]){
      const wheel=makeActorPart(root,"cylinder","Traffic vehicle tyre",side*(bodyWidth/2+0.035),0.42,z,0.56,0.22,0.56,mats.roof);
      wheel.setLocalEulerAngles(0,0,90);
      makeActorPart(root,"cylinder","Vehicle wheel hub",side*(bodyWidth/2+0.16),0.42,z,0.2,0.24,0.2,mats.lightConcrete);
    }
    const offset=(i/12)*length;
    const signalIndex=route.roadSegmentId==="ring-road-coastal"?0:route.roadSegmentId==="spintex-road"?3:null;
    traffic.push({root,route,distance:offset,speed:4.2+(i%5)*0.9,length,signalIndex});
  }

  const cloudBanks:Array<{root:Entity;speed:number;originX:number}>=[];
  for(let i=0;i<7;i++){
    const root=new Entity("Accra coastal cumulus cloud"); app.root.addChild(root);
    const x=-6500+i*1900, y=95+(i%3)*22, z=2600+(i%4)*850;
    for(let puff=0;puff<4;puff++){
      makeActorPart(root,"sphere","Soft tropical cloud", (puff-1.5)*17, (puff%2)*5, Math.sin(puff)*7, 32+(puff%2)*7, 12+(puff%2)*3, 20+(puff%2)*5, mats.white);
    }
    root.setPosition(x,y,z);
    cloudBanks.push({root,speed:1.2+(i%3)*0.35,originX:x});
  }

  let livingClock=0;
  let previousRainState=false;
  const updateLivingCity=(dt:number, nightAmount = 0)=>{
    livingClock+=dt;
    const weatherPhase=livingClock%240;
    const raining=weatherPhase>=150 && weatherPhase<198;
    // Rain darkens and wets the asphalt material without adding expensive
    // per-road meshes; only update material state when weather changes.
    if(raining!==previousRainState){
      mats.road.gloss=raining?48:8;
      mats.road.specular=raining?new Color(0.24,0.27,0.29):new Color(0.035,0.035,0.035);
      mats.road.update();
      previousRainState=raining;
    }
    // Junction lights run a staggered red/amber/green cycle. The lamps are
    // actual scene entities, not three permanently lit coloured blocks.
    for(const signal of signalHeads){
      const phase=(livingClock+signal.offset)%48;
      const redOn=phase<26;
      const amberOn=phase>=26 && phase<31;
      signal.red.forEach((lamp)=>lamp.enabled=redOn);
      signal.amber.forEach((lamp)=>lamp.enabled=amberOn);
      signal.green.forEach((lamp)=>lamp.enabled=phase>=31);
    }
    // Warm practical street lighting switches on for the night portion of the
    // shared world clock. Lights are disabled during daylight to save mobile GPU work.
    const lampsOn = nightAmount > 0.55;
    for (const lamp of streetLamps) {
      if (lamp.light?.light) lamp.light.light.enabled = lampsOn;
      lamp.diffuser.enabled = lampsOn;
    }
    for(const person of pedestrians){
      let remaining=person.speed*dt;
      while(remaining>0){
        const from=person.route[person.segment],to=person.route[(person.segment+1)%person.route.length];
        const distance=Math.hypot(to.x-from.x,to.z-from.z);
        const available=(1-person.t)*distance;
        if(remaining<available){person.t+=remaining/distance;remaining=0;}
        else{remaining-=available;person.segment=(person.segment+1)%person.route.length;person.t=0;}
      }
      const a=person.route[person.segment],b=person.route[(person.segment+1)%person.route.length];
      const x=a.x+(b.x-a.x)*person.t,z=a.z+(b.z-a.z)*person.t;
      person.root.setPosition(x,0,z);
      person.root.setEulerAngles(0,Math.atan2(b.x-a.x,b.z-a.z)*180/Math.PI,0);
      const swing=Math.sin(livingClock*5+person.phase)*24;
      person.legs[0].setLocalEulerAngles(swing,0,0);person.legs[1].setLocalEulerAngles(-swing,0,0);
      person.arms[0].setLocalEulerAngles(-swing*0.65,0,0);person.arms[1].setLocalEulerAngles(swing*0.65,0,0);
    }
    for(const car of traffic){
      const approachingSignal=car.signalIndex!==null && car.distance>=car.length-20;
      const signalPhase=car.signalIndex===null?32:(livingClock+signalHeads[car.signalIndex].offset)%48;
      const signalRed=signalPhase<26 || (signalPhase>=26 && signalPhase<31);
      // Traffic waits at the Osu and Spintex approaches on red/amber, then
      // continues along the authored Greater Accra road centreline on green.
      if(!(approachingSignal && signalRed)){
        car.distance=(car.distance+car.speed*dt)%car.length;
      }
      let remaining=car.distance;
      for(let i=0;i<car.route.points.length-1;i++){
        const a=car.route.points[i],b=car.route.points[i+1],segmentLength=Math.hypot(b.x-a.x,b.z-a.z);
        if(remaining<=segmentLength){
          const t=segmentLength?remaining/segmentLength:0;
          car.root.setPosition(a.x+(b.x-a.x)*t,0,a.z+(b.z-a.z)*t);
          car.root.setEulerAngles(0,Math.atan2(b.x-a.x,b.z-a.z)*180/Math.PI,0);
          break;
        }
        remaining-=segmentLength;
      }
    }
    for(const cloud of cloudBanks){
      const next=cloud.root.getPosition().x+cloud.speed*dt;
      cloud.root.setPosition(next>14000?-8500:next,cloud.root.getPosition().y,cloud.root.getPosition().z);
    }
  };

  return {
    blockers,
    update: updateLivingCity,
    spawn: { x: 1180, z: -1500 },
    taxiSpawn: { x: 1185, z: -1504 },
    interactables: [
      { id: "osu-bus-stop-bench", label: "USE BENCH", x: 1110, z: -1328.8, radius: 2.8 },
      { id: "circle-bus-stop-bench", label: "USE BENCH", x: -520, z: 521.2, radius: 2.8 },
      { id: "labadi-bus-stop-bench", label: "USE BENCH", x: 2260, z: -2378.8, radius: 2.8 }
    ]
  };
}

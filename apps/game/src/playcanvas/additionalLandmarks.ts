import { AppBase, Color, Entity, StandardMaterial } from "playcanvas";
import { GREATER_ACCRA_LANDMARK_FOOTPRINTS } from "../world/greaterAccraLandmarkData";

type Point = { x: number; z: number };

export function addGhanaAdditionalLandmarks(app: AppBase): void {
  const footprint = new Map<string, (typeof GREATER_ACCRA_LANDMARK_FOOTPRINTS)[number]>(GREATER_ACCRA_LANDMARK_FOOTPRINTS.map((item) => [item.id, item] as const));
  const mats = {
    glass: makeMaterial(0.13, 0.31, 0.36),
    blueGlass: makeMaterial(0.17, 0.38, 0.45),
    concrete: makeMaterial(0.72, 0.71, 0.65),
    pale: makeMaterial(0.86, 0.83, 0.74),
    stone: makeMaterial(0.59, 0.53, 0.42),
    roof: makeMaterial(0.25, 0.28, 0.28),
    gold: makeMaterial(0.76, 0.54, 0.22),
    green: makeMaterial(0.12, 0.34, 0.23),
    red: makeMaterial(0.53, 0.16, 0.13),
    dark: makeMaterial(0.08, 0.12, 0.12),
    water: makeMaterial(0.06, 0.34, 0.45),
    grass: makeMaterial(0.16, 0.36, 0.2),
    track: makeMaterial(0.58, 0.25, 0.17),
    white: makeMaterial(0.88, 0.86, 0.78)
  };

  function makeMaterial(r: number, g: number, b: number): StandardMaterial {
    const value = new StandardMaterial();
    value.diffuse = new Color(r, g, b);
    value.specular = new Color(0.12, 0.12, 0.12);
    value.gloss = 28;
    value.update();
    return value;
  }
  function box(name: string, x: number, y: number, z: number, w: number, h: number, d: number, material: StandardMaterial, yaw = 0): Entity {
    const entity = new Entity(name);
    entity.addComponent("render", { type: "box", material, castShadows: false, receiveShadows: true });
    entity.setPosition(x, y, z);
    entity.setLocalScale(w, h, d);
    if (yaw) entity.setEulerAngles(0, yaw, 0);
    app.root.addChild(entity);
    return entity;
  }
  function cylinder(name: string, x: number, y: number, z: number, diameter: number, height: number, material: StandardMaterial): Entity {
    const entity = new Entity(name);
    entity.addComponent("render", { type: "cylinder", material, castShadows: false, receiveShadows: true });
    entity.setPosition(x, y, z);
    entity.setLocalScale(diameter, height, diameter);
    app.root.addChild(entity);
    return entity;
  }
  function sphere(name: string, x: number, y: number, z: number, sx: number, sy: number, sz: number, material: StandardMaterial): Entity {
    const entity = new Entity(name);
    entity.addComponent("render", { type: "sphere", material, castShadows: false, receiveShadows: true });
    entity.setPosition(x, y, z);
    entity.setLocalScale(sx, sy, sz);
    app.root.addChild(entity);
    return entity;
  }
  const at = (id: string): Point => {
    const item = footprint.get(id);
    if (!item) throw new Error("Missing registered landmark footprint: " + id);
    return { x: item.x, z: item.z };
  };

  // Black Star Square / Independence Square: a broad ceremonial plaza with
  // the Independence Arch on the seaward edge, Black Star Gate, parade stands,
  // flagpoles and the Unknown Soldier memorial. One registered site prevents
  // duplicate footprints for the monuments within the same complex.
  {
    const p = at("black-star-square");
    box("Black Star Square ceremonial parade ground", p.x, 0.08, p.z, 250, 0.16, 230, mats.pale);
    box("Black Star Square west grandstand", p.x - 112, 4.5, p.z, 22, 9, 190, mats.stone);
    box("Black Star Square east grandstand", p.x + 112, 4.5, p.z, 22, 9, 190, mats.stone);
    box("Black Star Square north grandstand", p.x, 4.5, p.z + 100, 205, 9, 20, mats.stone);
    box("Black Star Square south grandstand", p.x, 4.5, p.z - 100, 205, 9, 20, mats.stone);
    for (const tier of [0, 1, 2]) {
      box("Black Star Square west seating tier", p.x - 112, 2.2 + tier * 1.8, p.z - 54 + tier * 2, 23, 0.55, 100 - tier * 4, mats.pale);
      box("Black Star Square east seating tier", p.x + 112, 2.2 + tier * 1.8, p.z - 54 + tier * 2, 23, 0.55, 100 - tier * 4, mats.pale);
    }
    for (const side of [-1, 1]) cylinder("Black Star Square flagpole", p.x + side * 72, 8, p.z + 18, 0.22, 16, mats.white);
    const archZ = p.z - 108;
    box("Independence Arch west pier", p.x - 37, 9, archZ, 12, 18, 9, mats.pale);
    box("Independence Arch east pier", p.x + 37, 9, archZ, 12, 18, 9, mats.pale);
    box("Independence Arch main lintel", p.x, 18, archZ, 86, 5, 10, mats.pale);
    box("Independence Arch upper parapet", p.x, 21.2, archZ, 91, 1.2, 10.5, mats.stone);
    box("Independence Arch inscription panel", p.x, 16.2, archZ - 5.2, 35, 2.2, 0.35, mats.dark);
    cylinder("Independence Arch black star mount", p.x, 24, archZ, 4.2, 1.4, mats.dark);
    const gateZ = p.z + 108;
    box("Black Star Gate west pier", p.x - 27, 7, gateZ, 9, 14, 8, mats.stone);
    box("Black Star Gate east pier", p.x + 27, 7, gateZ, 9, 14, 8, mats.stone);
    box("Black Star Gate crossbeam", p.x, 14, gateZ, 67, 4, 9, mats.pale);
    box("Black Star Gate inscription", p.x, 15.2, gateZ - 4.7, 38, 1.8, 0.3, mats.dark);
    cylinder("Black Star Gate star mount", p.x, 18.5, gateZ, 4.8, 1.5, mats.dark);
    box("Unknown Soldier memorial plinth", p.x, 1.4, p.z + 24, 13, 2.8, 13, mats.stone);
    box("Unknown Soldier memorial figure body", p.x, 4.2, p.z + 24, 2.1, 3.2, 1.3, mats.dark);
    sphere("Unknown Soldier memorial figure head", p.x, 6.2, p.z + 24, 1.25, 1.25, 1.25, mats.dark);
    box("Black Star Square parade approach", p.x, 0.04, p.z - 132, 210, 0.08, 18, mats.concrete);
  }

  // Jamestown Lighthouse: red-and-white coastal navigation tower, lantern room,
  // gallery, keeper's base and adjoining low fort wall.
  {
    const p = at("jamestown-lighthouse");
    cylinder("Jamestown Lighthouse stone base", p.x, 1.4, p.z, 14, 2.8, mats.stone);
    cylinder("Jamestown Lighthouse white lower shaft", p.x, 8, p.z, 10.5, 11, mats.white);
    cylinder("Jamestown Lighthouse red band", p.x, 14.2, p.z, 10.8, 1.2, mats.red);
    cylinder("Jamestown Lighthouse white upper shaft", p.x, 19.5, p.z, 9.2, 9.5, mats.white);
    cylinder("Jamestown Lighthouse red gallery", p.x, 25, p.z, 13.5, 1.1, mats.red);
    cylinder("Jamestown Lighthouse lantern room", p.x, 28, p.z, 8.4, 4.8, mats.dark);
    cylinder("Jamestown Lighthouse lantern roof", p.x, 30.8, p.z, 10.2, 1, mats.red);
    sphere("Jamestown Lighthouse roof cap", p.x, 31.7, p.z, 2.2, 1.4, 2.2, mats.red);
    for (const side of [-1, 1]) {
      box("Jamestown Lighthouse keeper window", p.x + side * 5.3, 7.5, p.z + 0.2, 0.35, 1.6, 1.1, mats.dark);
      box("Jamestown Lighthouse gallery rail", p.x + side * 6.6, 25.8, p.z, 0.2, 0.9, 10, mats.white);
    }
    box("Jamestown Lighthouse keeper cottage", p.x + 18, 3.2, p.z + 8, 20, 6.4, 15, mats.pale);
    box("Jamestown Lighthouse cottage roof", p.x + 18, 6.8, p.z + 8, 21, 0.8, 16, mats.red);
    box("Jamestown Lighthouse fort wall", p.x, 1.4, p.z - 22, 58, 2.8, 1.2, mats.stone);
  }

  // Osu Castle / Christiansborg Castle: a low coastal fort compound with pale
  // masonry wings, a central courtyard, corner bastions and red roof lines.
  {
    const p = at("osu-castle");
    box("Osu Castle central courtyard", p.x, 0.12, p.z, 112, 0.24, 82, mats.pale);
    box("Osu Castle north wing", p.x, 7, p.z + 37, 92, 14, 18, mats.white);
    box("Osu Castle west wing", p.x - 46, 6.5, p.z, 18, 13, 72, mats.white);
    box("Osu Castle east wing", p.x + 46, 6.5, p.z, 18, 13, 72, mats.white);
    box("Osu Castle south sea-facing wall", p.x, 5.5, p.z - 37, 92, 11, 12, mats.pale);
    box("Osu Castle north roof", p.x, 14.5, p.z + 37, 96, 1.1, 21, mats.red);
    box("Osu Castle west roof", p.x - 46, 13.5, p.z, 21, 1.1, 76, mats.red);
    box("Osu Castle east roof", p.x + 46, 13.5, p.z, 21, 1.1, 76, mats.red);
    for (const dx of [-46, 46]) for (const dz of [-34, 37]) {
      cylinder("Osu Castle corner bastion", p.x + dx, 7, p.z + dz, 10, 14, mats.stone);
      cylinder("Osu Castle bastion roof", p.x + dx, 14.4, p.z + dz, 11, 1.2, mats.red);
    }
    box("Osu Castle main entrance", p.x, 4.5, p.z + 48, 18, 9, 2.2, mats.stone);
    box("Osu Castle entrance lintel", p.x, 9.5, p.z + 48, 23, 1.1, 3, mats.white);
    box("Osu Castle seafront parapet", p.x, 2.4, p.z - 46, 110, 0.8, 2, mats.stone);
  }


  // Accra Arts Centre: a walkable open-air craft market beside the Kwame
  // Nkrumah Memorial Park, with low pavilions, timber stalls and kente canopies.
  {
    const p = at("accra-arts-centre");
    box("Accra Arts Centre market courtyard", p.x, 0.05, p.z, 170, 0.1, 118, mats.concrete);
    box("Accra Arts Centre north market pavilion", p.x, 3.2, p.z + 43, 58, 6.4, 17, mats.stone);
    box("Accra Arts Centre north pavilion roof", p.x, 6.6, p.z + 43, 62, 0.7, 21, mats.red);
    box("Accra Arts Centre east craft pavilion", p.x + 63, 2.8, p.z, 28, 5.6, 65, mats.pale);
    box("Accra Arts Centre east pavilion roof", p.x + 63, 5.8, p.z, 32, 0.65, 70, mats.green);
    box("Accra Arts Centre west craft pavilion", p.x - 63, 2.8, p.z, 28, 5.6, 65, mats.pale);
    box("Accra Arts Centre west pavilion roof", p.x - 63, 5.8, p.z, 32, 0.65, 70, mats.gold);
    box("Accra Arts Centre central craft hall", p.x, 3.2, p.z - 35, 48, 6.4, 24, mats.stone);
    box("Accra Arts Centre central hall roof", p.x, 6.7, p.z - 35, 52, 0.7, 28, mats.red);
    for (let i = 0; i < 5; i++) {
      const x = p.x - 40 + i * 20;
      box("Accra Arts Centre kente stall counter", x, 1.1, p.z + 4, 12, 2.2, 7, i % 2 ? mats.gold : mats.red);
      box("Accra Arts Centre kente stall canopy", x, 3.3, p.z + 4, 14, 0.35, 9, i % 2 ? mats.green : mats.gold);
      box("Accra Arts Centre craft display", x, 2.35, p.z + 0.2, 5, 0.8, 0.55, mats.dark);
    }
    for (let i = 0; i < 4; i++) {
      const x = p.x - 48 + i * 32;
      cylinder("Accra Arts Centre carved sculpture plinth", x, 0.7, p.z - 12, 3.2, 1.4, mats.stone);
      sphere("Accra Arts Centre carved sculpture", x, 2.2, p.z - 12, 1.8, 2.2, 1.1, mats.dark);
    }
    box("Accra Arts Centre entrance sign", p.x, 4.5, p.z + 62, 35, 2.4, 0.6, mats.green);
    box("Accra Arts Centre entrance sign gold trim", p.x, 5.75, p.z + 62, 36, 0.14, 0.72, mats.gold);
  }
}

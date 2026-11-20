import { AppBase, Color, Entity, StandardMaterial } from "playcanvas";
import { GREATER_ACCRA_LANDMARK_FOOTPRINTS } from "../world/greaterAccraLandmarkData";

type Point = { x: number; z: number };

export function addGhanaLandmarkDetails(app: AppBase): void {
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
    entity.addComponent("render", { type: "box", material, castShadows: true, receiveShadows: true });
    entity.setPosition(x, y, z);
    entity.setLocalScale(w, h, d);
    if (yaw) entity.setEulerAngles(0, yaw, 0);
    app.root.addChild(entity);
    return entity;
  }
  function cylinder(name: string, x: number, y: number, z: number, diameter: number, height: number, material: StandardMaterial): Entity {
    const entity = new Entity(name);
    entity.addComponent("render", { type: "cylinder", material, castShadows: true, receiveShadows: true });
    entity.setPosition(x, y, z);
    entity.setLocalScale(diameter, height, diameter);
    app.root.addChild(entity);
    return entity;
  }
  function sphere(name: string, x: number, y: number, z: number, sx: number, sy: number, sz: number, material: StandardMaterial): Entity {
    const entity = new Entity(name);
    entity.addComponent("render", { type: "sphere", material, castShadows: true, receiveShadows: true });
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

  // Villaggio Vista: three unequal glass towers, deep podium and Ghana-inspired
  // gold/green vertical fins. The registered footprint and map position stay unchanged.
  {
    const p = at("villaggio-vista");
    box("Villaggio Vista podium glazing", p.x, 20, p.z + 58, 112, 12, 2, mats.blueGlass);
    const towers = [
      { name: "Aqua", dx: -39, dz: 0, w: 27, d: 28, h: 58 },
      { name: "Azure", dx: 0, dz: -5, w: 29, d: 30, h: 78 },
      { name: "Alto", dx: 39, dz: 2, w: 31, d: 31, h: 91 }
    ];
    for (const tower of towers) {
      const bottom = 36;
      box("Villaggio Vista " + tower.name + " glass tower", p.x + tower.dx, bottom + tower.h / 2, p.z + tower.dz, tower.w, tower.h, tower.d, mats.glass);
      box("Villaggio Vista " + tower.name + " kente fin", p.x + tower.dx, bottom + tower.h / 2, p.z + tower.dz - tower.d / 2 - 0.18, 1.5, tower.h * 0.94, 0.35, mats.gold);
      for (let floor = 1; floor < Math.floor(tower.h / 3.4); floor += 2) {
        box("Villaggio Vista " + tower.name + " floor band " + floor, p.x + tower.dx, bottom + floor * 3.4, p.z + tower.dz - tower.d / 2 - 0.24, tower.w + 0.4, 0.16, 0.24, mats.pale);
      }
      box("Villaggio Vista " + tower.name + " crown", p.x + tower.dx, bottom + tower.h + 0.8, p.z + tower.dz, tower.w + 1.5, 1.6, tower.d + 1.5, mats.roof);
    }
  }

  // The Signature: two separate East Legon residential towers with floor plates,
  // vertical fins, roof crowns and a shared entrance podium.
  {
    const p = at("the-signature");
    box("The Signature entrance canopy", p.x, 10, p.z + 48, 72, 1.2, 16, mats.gold);
    for (const tower of [
      { name: "North", dx: -25, w: 31, h: 74 },
      { name: "South", dx: 22, w: 29, h: 61 }
    ]) {
      const baseY = 52;
      box("The Signature " + tower.name + " tower", p.x + tower.dx, baseY + tower.h / 2, p.z, tower.w, tower.h, 31, mats.blueGlass);
      for (const side of [-1, 1]) {
        box("The Signature " + tower.name + " gold fin", p.x + tower.dx + side * (tower.w / 2 - 1.5), baseY + tower.h / 2, p.z - 15.8, 1.1, tower.h * 0.98, 0.35, mats.gold);
      }
      for (let floor = 1; floor < Math.floor(tower.h / 3.2); floor++) {
        box("The Signature " + tower.name + " slab " + floor, p.x + tower.dx, baseY + floor * 3.2, p.z - 15.7, tower.w + 0.25, 0.12, 0.25, mats.white);
      }
      box("The Signature " + tower.name + " roof crown", p.x + tower.dx, baseY + tower.h + 0.8, p.z, tower.w + 1.2, 1.6, 32, mats.pale);
    }
  }

  // Accra Mall: broad retail frontage, glass shop bays, a visible entrance,
  // roof skylights and a proper forecourt within the existing mall footprint.
  {
    const p = at("accra-mall");
    const frontZ = p.z + 101;
    box("Accra Mall continuous glazed frontage", p.x, 7.5, frontZ, 174, 13, 0.65, mats.blueGlass);
    box("Accra Mall main entrance portal", p.x, 8.5, frontZ + 1.1, 30, 15, 1.2, mats.pale);
    box("Accra Mall entrance glass doors", p.x, 6.2, frontZ + 1.85, 20, 8.2, 0.18, mats.glass);
    box("Accra Mall red identity sign", p.x, 17.2, frontZ + 1.3, 46, 3.4, 0.6, mats.red);
    for (let bay = 0; bay < 9; bay++) {
      const x = p.x - 78 + bay * 19.5;
      box("Accra Mall shop bay " + bay, x, 6.4, frontZ + 0.65, 15.5, 9.4, 0.22, bay % 2 ? mats.glass : mats.blueGlass);
      box("Accra Mall shop canopy " + bay, x, 12, frontZ + 1.25, 16.5, 0.42, 1.5, mats.pale);
    }
    for (let i = 0; i < 5; i++) {
      box("Accra Mall roof skylight " + i, p.x - 60 + i * 30, 19.1, p.z - 28, 18, 0.55, 24, mats.blueGlass);
    }
    box("Accra Mall parking forecourt", p.x, 0.035, p.z + 126, 190, 0.08, 34, mats.concrete);
  }

  // Kotoka International Airport: long terminal concourse, repeated glazed gates,
  // departure canopy, air-traffic control tower and apron-side service wing.
  {
    const p = at("kotoka-airport");
    box("Kotoka terminal main concourse", p.x, 13, p.z + 18, 370, 10, 38, mats.pale);
    box("Kotoka terminal glass curtain wall", p.x, 10.5, p.z + 38, 350, 7, 0.5, mats.blueGlass);
    box("Kotoka terminal departure roof", p.x, 19, p.z + 16, 390, 1.6, 48, mats.roof);
    box("Kotoka terminal landside canopy", p.x, 7.7, p.z + 52, 340, 1, 18, mats.white);
    for (let bay = 0; bay < 14; bay++) {
      const x = p.x - 158 + bay * 24;
      box("Kotoka terminal gate mullion " + bay, x, 10.5, p.z + 38.35, 0.35, 7.2, 0.18, mats.pale);
    }
    box("Kotoka terminal east pier", p.x + 190, 8, p.z - 18, 110, 14, 34, mats.concrete);
    box("Kotoka terminal west pier", p.x - 190, 8, p.z - 18, 110, 14, 34, mats.concrete);
    box("Kotoka air traffic control tower shaft", p.x + 220, 20, p.z - 62, 9, 38, 9, mats.pale);
    box("Kotoka air traffic control glass cab", p.x + 220, 40, p.z - 62, 15, 5, 15, mats.blueGlass);
    box("Kotoka air traffic control roof", p.x + 220, 43, p.z - 62, 17, 0.8, 17, mats.roof);
  }

  // Accra Sports Stadium: open oval playing field, red athletics ring,
  // four seating stands and a segmented roof rim.
  {
    const p = at("accra-sports-stadium");
    cylinder("Accra Sports Stadium athletics outer ring", p.x, 0.18, p.z, 186, 0.28, mats.track);
    cylinder("Accra Sports Stadium pitch base", p.x, 0.24, p.z, 132, 0.2, mats.grass);
    box("Accra Sports Stadium pitch marking", p.x, 0.38, p.z, 82, 0.035, 48, mats.white);
    const stands = [
      { name: "North", dx: 0, dz: -61, yaw: 0, w: 136, d: 20 },
      { name: "South", dx: 0, dz: 61, yaw: 0, w: 136, d: 20 },
      { name: "East", dx: 75, dz: 0, yaw: 90, w: 20, d: 110 },
      { name: "West", dx: -75, dz: 0, yaw: 90, w: 20, d: 110 }
    ];
    for (const stand of stands) {
      box("Accra Sports Stadium " + stand.name + " grandstand", p.x + stand.dx, 9, p.z + stand.dz, stand.w, 18, stand.d, mats.concrete, stand.yaw);
      box("Accra Sports Stadium " + stand.name + " roof", p.x + stand.dx, 18.8, p.z + stand.dz, stand.w + 4, 1.2, stand.d + 5, mats.roof, stand.yaw);
    }
  }

  // University of Ghana Main Hall: warm stone frontage, clock tower,
  // red hipped roof and the formal campus entrance axis.
  {
    const p = at("university-of-ghana");
    box("University of Ghana Main Hall frontage", p.x, 12, p.z + 35, 100, 24, 2.2, mats.stone);
    box("University of Ghana Main Hall red roof", p.x, 25, p.z, 108, 2.2, 62, mats.red);
    box("University of Ghana Main Hall clock tower", p.x, 37, p.z - 26, 17, 27, 17, mats.pale);
    box("University of Ghana Main Hall clock face", p.x, 46, p.z - 35, 6.4, 6.4, 0.35, mats.dark);
    cylinder("University of Ghana Main Hall clock dial", p.x, 46, p.z - 35.25, 5.1, 0.2, mats.white);
    box("University of Ghana Main Hall clock hand vertical", p.x, 46, p.z - 35.42, 0.22, 3.6, 0.08, mats.dark);
    box("University of Ghana Main Hall clock hand horizontal", p.x + 0.9, 46, p.z - 35.44, 2, 0.2, 0.08, mats.dark);
    for (const side of [-1, 1]) {
      box("University of Ghana Main Hall entrance wing", p.x + side * 72, 7, p.z + 10, 42, 14, 34, mats.stone);
    }
  }

  // Kwame Nkrumah Memorial Park: circular reflecting pool, dark mausoleum dome,
  // gold star and a strong vertical memorial feature at the centre.
  {
    const p = at("kwame-nkrumah-memorial");
    cylinder("Kwame Nkrumah Memorial reflecting pool", p.x, 0.12, p.z, 108, 0.22, mats.water);
    cylinder("Kwame Nkrumah Memorial stone plinth", p.x, 0.9, p.z, 70, 1.4, mats.stone);
    sphere("Kwame Nkrumah Memorial mausoleum dome", p.x, 9, p.z, 26, 14, 23, mats.dark);
    box("Kwame Nkrumah Memorial central tower", p.x, 17, p.z - 8, 7, 22, 7, mats.green);
    cylinder("Kwame Nkrumah Memorial gold star base", p.x, 30, p.z - 8, 5, 1, mats.gold);
    box("Kwame Nkrumah Memorial entrance marker", p.x, 7, p.z - 54, 3, 14, 3, mats.gold);
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const x = p.x + Math.cos(angle) * 58;
      const z = p.z + Math.sin(angle) * 58;
      cylinder("Kwame Nkrumah Memorial garden bollard " + i, x, 0.6, z, 1, 1.2, mats.white);
    }
  }

  // National Theatre: its signature clustered sculptural roof shells,
  // raised entrance deck and broad glazed lobby.
  {
    const p = at("national-theatre");
    box("National Theatre entrance podium", p.x, 3, p.z + 28, 112, 6, 70, mats.pale);
    sphere("National Theatre west shell", p.x - 27, 14, p.z - 4, 42, 22, 36, mats.white);
    sphere("National Theatre central shell", p.x + 2, 18, p.z - 8, 46, 27, 39, mats.pale);
    sphere("National Theatre east shell", p.x + 34, 13, p.z + 8, 35, 20, 31, mats.white);
    box("National Theatre glazed lobby", p.x, 6.2, p.z + 62, 72, 8.8, 0.5, mats.blueGlass);
    box("National Theatre gold entrance canopy", p.x, 11, p.z + 68, 82, 0.9, 9, mats.gold);
  }
}

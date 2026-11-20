import { AppBase, Color, Entity, StandardMaterial } from "playcanvas";

type Point = { x: number; z: number };
type Street = { name: string; width: number; points: readonly Point[] };

const STREETS: readonly Street[] = [
  { name: "Dansoman market street", width: 12, points: [{ x: -6100, z: -700 }, { x: -5900, z: -1050 }, { x: -5200, z: -1050 }, { x: -4300, z: -1050 }] },
  { name: "Kaneshie market street", width: 12, points: [{ x: -2850, z: -250 }, { x: -3200, z: -470 }, { x: -2700, z: -470 }, { x: -2200, z: -470 }] },
  { name: "Makola market street", width: 11, points: [{ x: -450, z: 450 }, { x: -450, z: 80 }, { x: 100, z: 80 }, { x: 650, z: 80 }] },
  { name: "Osu Oxford Street", width: 12, points: [{ x: 1450, z: -1350 }, { x: 1450, z: -1600 }, { x: 1700, z: -1600 }] },
  { name: "Labadi beach road local", width: 12, points: [{ x: 2300, z: -1900 }, { x: 2450, z: -2250 }, { x: 3200, z: -2250 }] },
  { name: "Spintex commercial street", width: 12, points: [{ x: 5600, z: -1150 }, { x: 5600, z: -1450 }, { x: 6200, z: -1450 }] },
  { name: "Tema community street", width: 12, points: [{ x: 9000, z: -750 }, { x: 9000, z: -1100 }, { x: 9500, z: -1100 }] },
  { name: "Achimota residential street", width: 11, points: [{ x: -1750, z: 2100 }, { x: -2000, z: 1900 }, { x: -1600, z: 1900 }, { x: -1200, z: 1900 }] },
  { name: "Madina commercial street", width: 12, points: [{ x: 5000, z: 1750 }, { x: 5000, z: 1500 }, { x: 5500, z: 1500 }, { x: 6000, z: 1500 }] },
  { name: "Legon campus avenue", width: 12, points: [{ x: 3350, z: 3550 }, { x: 3350, z: 3100 }, { x: 3900, z: 3100 }] }
];

export function addGreaterAccraLocalStreets(app: AppBase): void {
  const asphalt = makeMaterial(0.11, 0.125, 0.13);
  const yellow = makeMaterial(0.9, 0.72, 0.28);
  const concrete = makeMaterial(0.63, 0.61, 0.55);

  function makeMaterial(r: number, g: number, b: number): StandardMaterial {
    const material = new StandardMaterial();
    material.diffuse = new Color(r, g, b);
    material.specular = new Color(0.035, 0.035, 0.035);
    material.gloss = 8;
    material.update();
    return material;
  }
  function box(name: string, x: number, y: number, z: number, w: number, h: number, d: number, material: StandardMaterial, yaw: number): void {
    const entity = new Entity(name);
    entity.addComponent("render", { type: "box", material, castShadows: false, receiveShadows: true });
    entity.setPosition(x, y, z);
    entity.setLocalScale(w, h, d);
    entity.setEulerAngles(0, yaw, 0);
    app.root.addChild(entity);
  }

  for (const street of STREETS) {
    for (let index = 0; index < street.points.length - 1; index++) {
      const a = street.points[index];
      const b = street.points[index + 1];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const length = Math.hypot(dx, dz);
      if (length < 2) continue;
      const yaw = Math.atan2(dx, dz) * 180 / Math.PI;
      const x = (a.x + b.x) / 2;
      const z = (a.z + b.z) / 2;
      box(street.name + " asphalt", x, 0.035, z, street.width, 0.14, length + 1, asphalt, yaw);
      box(street.name + " centre marking", x, 0.12, z, 0.16, 0.025, length * 0.88, yellow, yaw);
      for (const side of [-1, 1]) {
        const offset = side * (street.width / 2 + 0.22);
        const nx = Math.cos(yaw * Math.PI / 180) * offset;
        const nz = -Math.sin(yaw * Math.PI / 180) * offset;
        box(street.name + " raised kerb", x + nx, 0.13, z + nz, 0.3, 0.22, length, concrete, yaw);
      }
    }
  }
}

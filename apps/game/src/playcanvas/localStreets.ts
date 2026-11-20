import { AppBase, Color, Entity, StandardMaterial } from "playcanvas";

type Point = { x: number; z: number };
type Street = { name: string; width: number; points: readonly Point[] };

// Local streets attach to the existing primary-road nodes. Coordinates use the
// same compressed game-space grid as greaterAccraLayout.ts; they are not GPS data.
export const GREATER_ACCRA_LOCAL_STREETS: readonly Street[] = [
  { name: "Dansoman market street", width: 12, points: [{ x: -6100, z: -700 }, { x: -5900, z: -1050 }, { x: -5200, z: -1050 }, { x: -4300, z: -1050 }] },
  { name: "Dansoman inner connector", width: 10, points: [{ x: -5600, z: -1200 }, { x: -5350, z: -1450 }, { x: -4850, z: -1500 }, { x: -4300, z: -1050 }] },
  { name: "Kaneshie market street", width: 12, points: [{ x: -2850, z: -250 }, { x: -3200, z: -470 }, { x: -2700, z: -470 }, { x: -2200, z: -470 }] },
  { name: "Kaneshie Abossey Okai connector", width: 10, points: [{ x: -2850, z: -250 }, { x: -2550, z: 80 }, { x: -2150, z: 300 }, { x: -1800, z: 300 }] },
  { name: "Makola market street", width: 11, points: [{ x: -450, z: 450 }, { x: -450, z: 80 }, { x: 100, z: 80 }, { x: 650, z: 80 }] },
  { name: "Accra central grid road", width: 10, points: [{ x: -450, z: 450 }, { x: -100, z: 700 }, { x: 250, z: 700 }, { x: 650, z: 450 }] },
  { name: "Nima Mamobi connector", width: 11, points: [{ x: -450, z: 450 }, { x: -650, z: 750 }, { x: -950, z: 1100 }, { x: -1250, z: 1350 }] },
  { name: "Airport City access loop", width: 12, points: [{ x: 1050, z: 850 }, { x: 800, z: 1050 }, { x: 650, z: 850 }, { x: 800, z: 600 }, { x: 1150, z: 450 }] },
  { name: "Airport City Liberation link", width: 12, points: [{ x: 1050, z: 850 }, { x: 1100, z: 650 }, { x: 1150, z: 450 }, { x: 1250, z: -350 }] },
  { name: "Independence Square approach", width: 13, points: [{ x: 1450, z: -1350 }, { x: 1000, z: -1500 }, { x: 450, z: -1600 }, { x: -250, z: -1550 }] },
  { name: "Jamestown coastal connector", width: 11, points: [{ x: -250, z: -1550 }, { x: -900, z: -1600 }, { x: -1600, z: -1700 }, { x: -2300, z: -1850 }] },
  { name: "Osu Castle seafront approach", width: 11, points: [{ x: 1450, z: -1350 }, { x: 1350, z: -1700 }, { x: 1150, z: -2100 }] },
  { name: "Osu residential connector", width: 12, points: [{ x: 900, z: -1450 }, { x: 1180, z: -1450 }, { x: 1450, z: -1450 }, { x: 1450, z: -1350 }] },
  { name: "Osu Oxford Street", width: 12, points: [{ x: 1450, z: -1350 }, { x: 1450, z: -1600 }, { x: 1700, z: -1600 }] },
  { name: "Cantonments residential link", width: 10, points: [{ x: 1250, z: -350 }, { x: 1600, z: -650 }, { x: 1950, z: -900 }, { x: 1850, z: -1650 }] },
  { name: "Labone neighbourhood street", width: 10, points: [{ x: 1850, z: -1650 }, { x: 2150, z: -1450 }, { x: 2550, z: -1450 }, { x: 2750, z: -1750 }] },
  { name: "Labadi beach road local", width: 12, points: [{ x: 2300, z: -1900 }, { x: 2450, z: -2250 }, { x: 3200, z: -2250 }] },
  { name: "Teshie Nungua connector", width: 11, points: [{ x: 2750, z: -2100 }, { x: 3600, z: -2300 }, { x: 4450, z: -2050 }, { x: 5000, z: -1650 }, { x: 5600, z: -1150 }] },
  { name: "Spintex commercial street", width: 12, points: [{ x: 5600, z: -1150 }, { x: 5600, z: -1450 }, { x: 6200, z: -1450 }] },
  { name: "Spintex warehouse access", width: 10, points: [{ x: 5600, z: -1150 }, { x: 5900, z: -900 }, { x: 6300, z: -850 }, { x: 6800, z: -1000 }] },
  { name: "Tema community street", width: 12, points: [{ x: 9000, z: -750 }, { x: 9000, z: -1100 }, { x: 9500, z: -1100 }] },
  { name: "Tema community inner road", width: 10, points: [{ x: 9000, z: -750 }, { x: 9200, z: -350 }, { x: 9600, z: -100 }, { x: 10000, z: -250 }] },
  { name: "Achimota residential street", width: 11, points: [{ x: -1750, z: 2100 }, { x: -2000, z: 1900 }, { x: -1600, z: 1900 }, { x: -1200, z: 1900 }] },
  { name: "Achimota Taifa connector", width: 10, points: [{ x: -1750, z: 2100 }, { x: -1450, z: 2450 }, { x: -1000, z: 2700 }, { x: -500, z: 2850 }] },
  { name: "Madina commercial street", width: 12, points: [{ x: 5000, z: 1750 }, { x: 5000, z: 1500 }, { x: 5500, z: 1500 }, { x: 6000, z: 1500 }] },
  { name: "Adenta community connector", width: 11, points: [{ x: 6550, z: 950 }, { x: 6600, z: 1300 }, { x: 6250, z: 1600 }, { x: 5700, z: 1700 }] },
  { name: "East Legon access street", width: 12, points: [{ x: 3650, z: 1750 }, { x: 3900, z: 1950 }, { x: 4200, z: 2100 }, { x: 4550, z: 2050 }, { x: 5000, z: 1750 }] },
  { name: "East Legon residential loop", width: 10, points: [{ x: 3900, z: 1950 }, { x: 4050, z: 2350 }, { x: 4450, z: 2500 }, { x: 4750, z: 2250 }, { x: 4550, z: 2050 }] },
  { name: "Legon campus avenue", width: 12, points: [{ x: 3560, z: 3550 }, { x: 3560, z: 3100 }, { x: 3900, z: 3100 }] },
  { name: "Legon campus access road", width: 11, points: [{ x: 3650, z: 1750 }, { x: 3500, z: 2250 }, { x: 3560, z: 2700 }, { x: 3560, z: 3100 }] }
];

export function isGreaterAccraLocalStreetNetworkValid(): boolean {
  const names = new Set<string>();
  return GREATER_ACCRA_LOCAL_STREETS.every((street) => {
    if (!street.name.trim() || names.has(street.name) || street.width < 7 || street.width > 18 || street.points.length < 2) return false;
    names.add(street.name);
    return street.points.every((point) =>
      Number.isFinite(point.x) && Number.isFinite(point.z) &&
      point.x >= -8000 && point.x <= 13000 && point.z >= -5000 && point.z <= 8500
    );
  });
}

export function addGreaterAccraLocalStreets(app: AppBase): void {
  const asphalt = makeMaterial(0.11, 0.125, 0.13);
  const yellow = makeMaterial(0.9, 0.72, 0.28);
  const white = makeMaterial(0.82, 0.83, 0.79);
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

  for (const street of GREATER_ACCRA_LOCAL_STREETS) {
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
        const offset = side * (street.width / 2 - 0.32);
        const nx = Math.cos(yaw * Math.PI / 180) * offset;
        const nz = -Math.sin(yaw * Math.PI / 180) * offset;
        box(street.name + " edge marking", x + nx, 0.12, z + nz, 0.12, 0.025, length * 0.92, white, yaw);
        box(street.name + " kerb", x + nx * 1.08, 0.16, z + nz * 1.08, 0.28, 0.24, length * 0.98, concrete, yaw);
      }
    }
  }
}

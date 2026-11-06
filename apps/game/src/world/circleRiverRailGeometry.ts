import {
  Color3,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3
} from "@babylonjs/core";
import { getMapNodePosition } from "./greaterAccraLayout";

export type CircleRiverRailGeometryResult = Readonly<{
  river: Readonly<{ channel: Mesh; water: Mesh; banks: readonly Mesh[] }>;
  railway: Readonly<{ ballast: Mesh; rails: readonly Mesh[]; sleepers: readonly Mesh[] }>;
}>;

/**
 * Provisional visual reservation for the Odaw River and adjacent railway
 * corridor in the Circle developer preview. The local paths are deliberately
 * schematic: they are not surveyed, georeferenced or a claim about exact
 * present-day channel/track alignment.
 */
export const CIRCLE_RIVER_RAIL_DESIGN = {
  status: "prototype" as const,
  river: {
    centreline: [{ x: -330, z: 180 }, { x: -165, z: 90 }, { x: 0, z: 0 }, { x: 165, z: -90 }, { x: 330, z: -180 }],
    channelWidthM: 38,
    waterWidthM: 24,
    channelDepthM: 1.8
  },
  railway: {
    centreline: [{ x: -330, z: 235 }, { x: -165, z: 145 }, { x: 0, z: 55 }, { x: 165, z: -35 }, { x: 330, z: -125 }],
    trackGaugeM: 1.435,
    ballastWidthM: 8,
    sleeperSpacingM: 6
  },
  designNote: "River and railway paths are schematic local placeholders arranged to demonstrate two distinct protected corridors beneath/near the elevated Ring Road. Confirm actual alignments, channel levels, railway gauge and clearances against reliable survey/site data before treating them as map truth."
} as const;

type Point2 = Readonly<{ x: number; z: number }>;

function material(scene: Scene, name: string, color: Color3, alpha = 1): StandardMaterial {
  const existing = scene.getMaterialByName(name);
  if (existing instanceof StandardMaterial) return existing;
  const value = new StandardMaterial(name, scene);
  value.diffuseColor = color;
  value.specularColor = new Color3(0.08, 0.08, 0.08);
  value.alpha = alpha;
  return value;
}

function offsetPath(points: readonly Point2[], offsetM: number, y: number): Vector3[] {
  return points.map((point, index) => {
    const previous = points[Math.max(0, index - 1)];
    const next = points[Math.min(points.length - 1, index + 1)];
    const dx = next.x - previous.x;
    const dz = next.z - previous.z;
    const length = Math.hypot(dx, dz);
    if (length < 1e-6) throw new Error("Circle corridor path contains a zero-length tangent.");
    return new Vector3(
      point.x + (dz / length) * offsetM,
      y,
      point.z - (dx / length) * offsetM
    );
  });
}

function ribbon(scene: Scene, name: string, first: Vector3[], second: Vector3[]): Mesh {
  const mesh = MeshBuilder.CreateRibbon(name, {
    pathArray: [first, second],
    sideOrientation: Mesh.DOUBLESIDE,
    updatable: false
  }, scene);
  mesh.isPickable = false;
  return mesh;
}

function distance(a: Point2, b: Point2): number {
  return Math.hypot(b.x - a.x, b.z - a.z);
}

function samplePath(points: readonly Point2[], spacingM: number): Point2[] {
  const sampled: Point2[] = [points[0]];
  for (let segment = 1; segment < points.length; segment += 1) {
    const start = points[segment - 1];
    const end = points[segment];
    const length = distance(start, end);
    const count = Math.max(1, Math.ceil(length / spacingM));
    for (let step = 1; step <= count; step += 1) {
      const t = step / count;
      sampled.push({
        x: start.x + (end.x - start.x) * t,
        z: start.z + (end.z - start.z) * t
      });
    }
  }
  return sampled;
}

function translatePath(points: readonly Vector3[], centre: Point2): Vector3[] {
  return points.map((point) => new Vector3(point.x + centre.x, point.y, point.z + centre.z));
}

/** Creates schematic Odaw River and railway visuals for the standalone preview only. */
export function createCircleRiverRailGeometry(scene: Scene): CircleRiverRailGeometryResult {
  const centre = getMapNodePosition("circle-junction");
  if (!centre) throw new Error("Circle river/rail layout is missing its map anchor.");

  const riverPath = CIRCLE_RIVER_RAIL_DESIGN.river.centreline;
  const riverHalf = CIRCLE_RIVER_RAIL_DESIGN.river.channelWidthM / 2;
  const waterHalf = CIRCLE_RIVER_RAIL_DESIGN.river.waterWidthM / 2;
  const riverChannel = ribbon(
    scene,
    "circle-odaw-river-channel",
    translatePath(offsetPath(riverPath, riverHalf, -1.8), centre),
    translatePath(offsetPath(riverPath, -riverHalf, -1.8), centre)
  );
  riverChannel.material = material(scene, "circle-odaw-river-bed-material", new Color3(0.30, 0.32, 0.27));

  const water = ribbon(
    scene,
    "circle-odaw-river-water",
    translatePath(offsetPath(riverPath, waterHalf, -0.8), centre),
    translatePath(offsetPath(riverPath, -waterHalf, -0.8), centre)
  );
  water.material = material(scene, "circle-odaw-river-water-material", new Color3(0.12, 0.34, 0.38), 0.88);

  const banks = [
    ribbon(
      scene,
      "circle-odaw-river-bank-left",
      translatePath(offsetPath(riverPath, riverHalf + 7, 0.02), centre),
      translatePath(offsetPath(riverPath, waterHalf, -0.8), centre)
    ),
    ribbon(
      scene,
      "circle-odaw-river-bank-right",
      translatePath(offsetPath(riverPath, -waterHalf, -0.8), centre),
      translatePath(offsetPath(riverPath, -(riverHalf + 7), 0.02), centre)
    )
  ];
  banks.forEach((bank) => {
    bank.material = material(scene, "circle-odaw-river-bank-material", new Color3(0.39, 0.40, 0.31));
  });

  const railPath = CIRCLE_RIVER_RAIL_DESIGN.railway.centreline;
  const ballastHalf = CIRCLE_RIVER_RAIL_DESIGN.railway.ballastWidthM / 2;
  const ballast = ribbon(
    scene,
    "circle-railway-ballast",
    translatePath(offsetPath(railPath, ballastHalf, 0.12), centre),
    translatePath(offsetPath(railPath, -ballastHalf, 0.12), centre)
  );
  ballast.material = material(scene, "circle-railway-ballast-material", new Color3(0.30, 0.29, 0.26));

  const trackHalf = CIRCLE_RIVER_RAIL_DESIGN.railway.trackGaugeM / 2;
  const rails = [-trackHalf, trackHalf].map((offset, index) => {
    const path = translatePath(offsetPath(railPath, offset, 0.34), centre);
    const rail = MeshBuilder.CreateTube(`circle-railway-rail-${index + 1}`, {
      path,
      radius: 0.11,
      tessellation: 8,
      cap: Mesh.CAP_ALL
    }, scene);
    rail.material = material(scene, "circle-railway-steel-material", new Color3(0.42, 0.45, 0.46));
    rail.isPickable = false;
    return rail;
  });

  const sampled = samplePath(railPath, CIRCLE_RIVER_RAIL_DESIGN.railway.sleeperSpacingM);
  const sleeperMaterial = material(scene, "circle-railway-sleeper-material", new Color3(0.22, 0.20, 0.17));
  const sleepers = sampled.map((point, index) => {
    const previous = sampled[Math.max(0, index - 1)];
    const next = sampled[Math.min(sampled.length - 1, index + 1)];
    const angle = Math.atan2(next.z - previous.z, next.x - previous.x);
    const sleeper = MeshBuilder.CreateBox(`circle-railway-sleeper-${index + 1}`, {
      width: 1.6,
      height: 0.22,
      depth: CIRCLE_RIVER_RAIL_DESIGN.railway.ballastWidthM - 0.6
    }, scene);
    sleeper.position.set(centre.x + point.x, 0.25, centre.z + point.z);
    sleeper.rotation.y = angle;
    sleeper.material = sleeperMaterial;
    sleeper.isPickable = false;
    return sleeper;
  });

  return {
    river: { channel: riverChannel, water, banks },
    railway: { ballast, rails, sleepers }
  };
}

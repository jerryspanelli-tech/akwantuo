import { Color3, DynamicTexture, MeshBuilder, Scene, StandardMaterial } from "@babylonjs/core";
import { getMapRoadPath } from "./greaterAccraLayout";

type SpeedLimitPlacement = Readonly<{
  id: string;
  roadSegmentId: string;
  progress: number;
  speedKph: 50 | 90;
  note: string;
}>;

/**
 * First-pass Ghanaian N6 speed-limit sign positions.
 * Progress is measured along the existing compressed game centreline; these
 * are gameplay placements, not surveyed roadside coordinates. Only the
 * statutory default categories are used here: 50 km/h in built-up areas and
 * 90 km/h outside built-up areas on non-motorway roads.
 */
export const GHANA_N6_SPEED_LIMIT_SIGN_PLACEMENTS: readonly SpeedLimitPlacement[] = [
  {
    id: "n6-pokuase-urban-speed",
    roadSegmentId: "n6-ofankor-pokuase",
    progress: 0.82,
    speedKph: 50,
    note: "Built-up Pokuase approach"
  },
  {
    id: "n6-amasaman-urban-speed",
    roadSegmentId: "n6-pokuase-amasaman",
    progress: 0.82,
    speedKph: 50,
    note: "Built-up Amasaman approach"
  },
  {
    id: "n6-nsawam-urban-speed",
    roadSegmentId: "n6-amasaman-nsawam",
    progress: 0.82,
    speedKph: 50,
    note: "Built-up Nsawam approach"
  },
  {
    id: "n6-nsawam-suhum-rural-speed",
    roadSegmentId: "n6-nsawam-suhum",
    progress: 0.22,
    speedKph: 90,
    note: "Outside the Nsawam built-up section"
  },
  {
    id: "n6-suhum-bunso-rural-speed",
    roadSegmentId: "n6-suhum-bunso",
    progress: 0.18,
    speedKph: 90,
    note: "Outside the Suhum built-up section"
  }
] as const;

function pointAndDirectionAtProgress(
  points: readonly Readonly<{ x: number; z: number }>[],
  progress: number
): Readonly<{ x: number; z: number; dx: number; dz: number }> | null {
  if (points.length < 2 || !Number.isFinite(progress) || progress < 0 || progress > 1) return null;
  const lengths: number[] = [];
  let totalLength = 0;
  for (let index = 1; index < points.length; index += 1) {
    const length = Math.hypot(points[index].x - points[index - 1].x, points[index].z - points[index - 1].z);
    lengths.push(length);
    totalLength += length;
  }
  if (totalLength <= 0) return null;
  let remaining = totalLength * progress;
  for (let index = 0; index < lengths.length; index += 1) {
    const length = lengths[index];
    if (remaining <= length || index === lengths.length - 1) {
      const a = points[index];
      const b = points[index + 1];
      const t = Math.max(0, Math.min(1, remaining / Math.max(length, 1e-6)));
      const dx = (b.x - a.x) / Math.max(length, 1e-6);
      const dz = (b.z - a.z) / Math.max(length, 1e-6);
      return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, dx, dz };
    }
    remaining -= length;
  }
  return null;
}

function createSpeedLimitMaterial(scene: Scene, speedKph: number): StandardMaterial {
  const name = "ghana-speed-limit-material-" + speedKph;
  const existing = scene.getMaterialByName(name);
  if (existing instanceof StandardMaterial) return existing;

  const texture = new DynamicTexture(
    "ghana-speed-limit-texture-" + speedKph,
    { width: 128, height: 128 },
    scene,
    false
  );
  const context = texture.getContext();
  context.clearRect(0, 0, 128, 128);
  context.beginPath();
  context.arc(64, 64, 59, 0, Math.PI * 2);
  context.fillStyle = "#ffffff";
  context.fill();
  context.lineWidth = 10;
  context.strokeStyle = "#c62828";
  context.stroke();
  context.fillStyle = "#171717";
  context.font = "bold 48px Arial";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(String(speedKph), 64, 65);
  texture.update(false);

  const material = new StandardMaterial(name, scene);
  material.diffuseTexture = texture;
  material.emissiveColor = new Color3(0.12, 0.12, 0.12);
  material.backFaceCulling = false;
  return material;
}

function createSpeedLimitSign(
  scene: Scene,
  id: string,
  x: number,
  z: number,
  facingX: number,
  facingZ: number,
  speedKph: number,
  postMaterial: StandardMaterial
): void {
  const board = MeshBuilder.CreatePlane("ghana-speed-limit-board-" + id, {
    width: 1.35,
    height: 1.35,
    sideOrientation: 2
  }, scene);
  board.position.set(x, 2.65, z);
  board.rotation.y = Math.atan2(facingX, facingZ);
  board.material = createSpeedLimitMaterial(scene, speedKph);
  board.isPickable = false;
  board.checkCollisions = false;

  const post = MeshBuilder.CreateCylinder("ghana-speed-limit-post-" + id, {
    height: 2.55,
    diameter: 0.1,
    tessellation: 8
  }, scene);
  post.position.set(x, 1.275, z);
  post.material = postMaterial;
  post.isPickable = false;
  post.checkCollisions = false;
}

/**
 * Adds paired, opposing-facing speed-limit signs on the N6.
 * Materials are shared by limit value to keep texture/material counts low.
 */
export function createGhanaN6SpeedLimitSigns(scene: Scene): number {
  const postMaterial = new StandardMaterial("ghana-speed-limit-post-material", scene);
  postMaterial.diffuseColor = new Color3(0.24, 0.25, 0.24);
  let created = 0;

  for (const placement of GHANA_N6_SPEED_LIMIT_SIGN_PLACEMENTS) {
    const path = getMapRoadPath(placement.roadSegmentId);
    if (!path) throw new Error("Missing road path for speed-limit sign: " + placement.id);
    const point = pointAndDirectionAtProgress(path.points, placement.progress);
    if (!point) throw new Error("Invalid road position for speed-limit sign: " + placement.id);

    const normalX = point.dz;
    const normalZ = -point.dx;
    const roadsideOffsetM = 17;
    for (const side of [-1, 1] as const) {
      const x = point.x + normalX * roadsideOffsetM * side;
      const z = point.z + normalZ * roadsideOffsetM * side;
      const facingX = side === 1 ? -point.dx : point.dx;
      const facingZ = side === 1 ? -point.dz : point.dz;
      createSpeedLimitSign(
        scene,
        placement.id + "-" + side,
        x,
        z,
        facingX,
        facingZ,
        placement.speedKph,
        postMaterial
      );
      created += 1;
    }
  }
  return created;
}

export function isGhanaN6SpeedLimitSignageValid(): boolean {
  const ids = new Set(GHANA_N6_SPEED_LIMIT_SIGN_PLACEMENTS.map((item) => item.id));
  return ids.size === GHANA_N6_SPEED_LIMIT_SIGN_PLACEMENTS.length &&
    GHANA_N6_SPEED_LIMIT_SIGN_PLACEMENTS.length === 5 &&
    GHANA_N6_SPEED_LIMIT_SIGN_PLACEMENTS.every((item) =>
      item.id.trim().length > 0 &&
      (item.speedKph === 50 || item.speedKph === 90) &&
      Number.isFinite(item.progress) &&
      item.progress >= 0 &&
      item.progress <= 1 &&
      Boolean(getMapRoadPath(item.roadSegmentId)?.points.length)
    );
}

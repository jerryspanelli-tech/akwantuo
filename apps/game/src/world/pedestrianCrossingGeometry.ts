import {
  Color3,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3
} from "@babylonjs/core";

export type PedestrianCrossingLayout = Readonly<{
  id: string;
  centre: Readonly<{ x: number; z: number }>;
  /** Unit direction running along the road, across the pedestrian crossing. */
  acrossDirection: Readonly<{ x: number; z: number }>;
  /** Width across the road, in metres. */
  crossingWidthM: number;
  /** Depth along the pedestrian travel direction, in metres. */
  crossingDepthM: number;
  stripeCount: number;
  stripeWidthM: number;
  tactilePavingDepthM: number;
  status: "planned";
}>;

export function isPedestrianCrossingLayoutValid(value: unknown): value is PedestrianCrossingLayout {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<PedestrianCrossingLayout>;
  if (typeof item.id !== "string" || !item.id.trim() || item.status !== "planned") return false;
  if (!item.centre || !Number.isFinite(item.centre.x) || !Number.isFinite(item.centre.z)) return false;
  if (!item.acrossDirection || !Number.isFinite(item.acrossDirection.x) || !Number.isFinite(item.acrossDirection.z)) return false;
  const magnitude = Math.hypot(item.acrossDirection.x ?? 0, item.acrossDirection.z ?? 0);
  return Math.abs(magnitude - 1) < 1e-5 &&
    Number.isFinite(item.crossingWidthM) && (item.crossingWidthM ?? 0) >= 2 &&
    Number.isFinite(item.crossingDepthM) && (item.crossingDepthM ?? 0) >= 1 &&
    Number.isInteger(item.stripeCount) && (item.stripeCount ?? 0) >= 2 &&
    Number.isFinite(item.stripeWidthM) && (item.stripeWidthM ?? 0) > 0 &&
    Number.isFinite(item.tactilePavingDepthM) && (item.tactilePavingDepthM ?? 0) >= 0 &&
    (item.stripeCount ?? 0) * (item.stripeWidthM ?? 0) <= (item.crossingWidthM ?? 0);
}

/**
 * Builds a reusable zebra crossing with tactile paving on both approaches.
 * Layout coordinates must come from a reviewed junction design; this module
 * deliberately does not invent crossing locations or certify accessibility.
 */
export function createPedestrianCrossingGeometry(
  scene: Scene,
  layout: PedestrianCrossingLayout
): Mesh[] {
  if (!isPedestrianCrossingLayoutValid(layout)) {
    throw new Error("Invalid pedestrian crossing layout.");
  }

  const material = (name: string, color: Color3): StandardMaterial => {
    const existing = scene.getMaterialByName(name);
    if (existing instanceof StandardMaterial) return existing;
    const created = new StandardMaterial(name, scene);
    created.diffuseColor = color;
    created.specularColor = Color3.Black();
    return created;
  };
  const stripeMaterial = material("akwantuo-crossing-white", new Color3(0.94, 0.94, 0.88));
  const tactileMaterial = material("akwantuo-crossing-tactile", new Color3(0.82, 0.65, 0.18));
  const across = new Vector3(layout.acrossDirection.x, 0, layout.acrossDirection.z);
  const travel = new Vector3(-across.z, 0, across.x);
  const yaw = -Math.atan2(across.z, across.x);
  const origin = new Vector3(layout.centre.x, 0.065, layout.centre.z);
  const meshes: Mesh[] = [];
  const totalStripeWidth = layout.stripeCount * layout.stripeWidthM;
  const firstOffset = -totalStripeWidth / 2 + layout.stripeWidthM / 2;

  for (let index = 0; index < layout.stripeCount; index += 1) {
    const offset = firstOffset + index * layout.stripeWidthM;
    const stripe = MeshBuilder.CreateBox(`${layout.id}-zebra-${index + 1}`, {
      width: layout.stripeWidthM,
      height: 0.025,
      depth: layout.crossingDepthM
    }, scene);
    stripe.position.copyFrom(origin.add(across.scale(offset)));
    stripe.rotation.y = yaw;
    stripe.material = stripeMaterial;
    stripe.isPickable = false;
    stripe.checkCollisions = false;
    meshes.push(stripe);
  }

  if (layout.tactilePavingDepthM > 0) {
    for (const [side, sign] of [["near", -1], ["far", 1]] as const) {
      const paving = MeshBuilder.CreateBox(`${layout.id}-tactile-${side}`, {
        width: layout.crossingWidthM,
        height: 0.022,
        depth: layout.tactilePavingDepthM
      }, scene);
      const offset = sign * (layout.crossingDepthM / 2 + layout.tactilePavingDepthM / 2);
      paving.position.copyFrom(origin.add(travel.scale(offset)));
      paving.rotation.y = yaw;
      paving.material = tactileMaterial;
      paving.isPickable = false;
      paving.checkCollisions = false;
      meshes.push(paving);
    }
  }

  return meshes;
}

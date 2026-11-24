import { Color3, MeshBuilder, Scene, StandardMaterial, Vector3 } from "@babylonjs/core";
import type { ChunkBounds, ChunkHandle } from "../chunkManager";
import type { ChunkBuildResult, ChunkGenerator } from "../chunkRegistry";
import { GREATER_ACCRA_LOCAL_ROADS } from "../greaterAccraRoadData";
import { LEGON_CAMPUS_ROADS } from "../legonCampusRoads";
import { clipRoadPath, type RoadPoint } from "../roadClipping";
import { createSolidRoadStrip } from "../solidRoadStrip";

function sharedMaterial(scene: Scene, name: string, color: Color3): StandardMaterial {
  const existing = scene.getMaterialByName(name);
  if (existing instanceof StandardMaterial) return existing;
  const material = new StandardMaterial(name, scene);
  material.diffuseColor = color;
  material.specularColor = new Color3(0.08, 0.08, 0.08);
  return material;
}

function buildRoadPiece(scene: Scene, id: string, points: readonly RoadPoint[], width: number, materials: { asphalt: StandardMaterial; sidewalk: StandardMaterial; drain: StandardMaterial; kerb: StandardMaterial }): void {
  const scale = width / 12;
  const band = (name: string, innerOffset: number, outerOffset: number, material: StandardMaterial, y: number, thickness: number): void => {
    const inner: Vector3[] = [], outer: Vector3[] = [];
    points.forEach((point, index) => {
      const before = points[Math.max(0, index - 1)], after = points[Math.min(points.length - 1, index + 1)];
      const dx = after.x - before.x, dz = after.z - before.z, length = Math.hypot(dx, dz) || 1;
      const nx = dz / length, nz = -dx / length;
      inner.push(new Vector3(point.x + nx * innerOffset * scale, y, point.z + nz * innerOffset * scale));
      outer.push(new Vector3(point.x + nx * outerOffset * scale, y, point.z + nz * outerOffset * scale));
    });
    createSolidRoadStrip(scene, name, inner, outer, thickness, material);
  };
  band(id + "-asphalt", -3.75, 3.75, materials.asphalt, 0.06, 0.24);
  band(id + "-shoulder-west", 3.75, 4.05, materials.asphalt, 0.055, 0.20);
  band(id + "-kerb-west", 4.05, 4.25, materials.kerb, 0.20, 0.20);
  band(id + "-sidewalk-west", 4.25, 6.05, materials.sidewalk, 0.14, 0.16);
  band(id + "-drain-west", 6.05, 6.5, materials.drain, 0.025, 0.12);
  band(id + "-shoulder-east", -4.05, -3.75, materials.asphalt, 0.055, 0.20);
  band(id + "-kerb-east", -4.25, -4.05, materials.kerb, 0.20, 0.20);
  band(id + "-sidewalk-east", -6.05, -4.25, materials.sidewalk, 0.14, 0.16);
  band(id + "-drain-east", -6.5, -6.05, materials.drain, 0.025, 0.12);
  const lines: Vector3[][] = [];
  for (const offset of [0, 3.25 * scale, -3.25 * scale]) {
    lines.push(points.map((point, index) => {
      const before = points[Math.max(0, index - 1)], after = points[Math.min(points.length - 1, index + 1)];
      const dx = after.x - before.x, dz = after.z - before.z, length = Math.hypot(dx, dz) || 1;
      return new Vector3(point.x + dz / length * offset, 0.085, point.z - dx / length * offset);
    }));
  }
  const paint = MeshBuilder.CreateLineSystem(id + "-road-markings", { lines, updatable: false }, scene);
  paint.color = new Color3(0.78, 0.8, 0.77); paint.alpha = 1; paint.isPickable = false; paint.checkCollisions = false; paint.renderingGroupId = 1;
}

/** Builds only road segments whose centreline intersects this chunk. */
export const localRoadsGenerator: ChunkGenerator = {
  id: "local-roads", priority: 20,
  build(scene: Scene, bounds: ChunkBounds): ChunkBuildResult | null {
    const roads = [...GREATER_ACCRA_LOCAL_ROADS, ...LEGON_CAMPUS_ROADS].flatMap((road) =>
      clipRoadPath(road.points, bounds).map((piece, index) => ({ road, piece, index }))
    );
    if (!roads.length) return null;
    const materials = {
      asphalt: sharedMaterial(scene, "akwantuo-road-asphalt", new Color3(0.105, 0.12, 0.125)),
      sidewalk: sharedMaterial(scene, "akwantuo-road-sidewalk", new Color3(0.48, 0.47, 0.42)),
      drain: sharedMaterial(scene, "akwantuo-road-drain", new Color3(0.075, 0.09, 0.085)),
      kerb: sharedMaterial(scene, "akwantuo-road-kerb", new Color3(0.68, 0.66, 0.59))
    };
    const firstMesh = scene.meshes.length;
    try {
      for (const item of roads) buildRoadPiece(scene, item.road.id + "-chunk-" + item.index, item.piece, item.road.width, materials);
    } catch (error) {
      for (const mesh of scene.meshes.slice(firstMesh)) mesh.dispose(false, false);
      throw error;
    }
    const created = scene.meshes.slice(firstMesh);
    let disposed = false;
    const handle: ChunkHandle = { dispose(): void { if (disposed) return; disposed = true; for (const mesh of created) if (!mesh.isDisposed()) mesh.dispose(false, false); } };
    return { handle, solidAreas: [], metadata: { roadPieceCount: roads.length, roadIds: [...new Set(roads.map((item) => item.road.id))] } };
  }
};

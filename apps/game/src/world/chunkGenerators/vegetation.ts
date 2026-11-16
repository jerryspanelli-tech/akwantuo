import { Color3, MeshBuilder, Scene, StandardMaterial } from "@babylonjs/core";
import type { ChunkBounds, ChunkHandle } from "../chunkManager";
import type { ChunkBuildResult, ChunkGenerator } from "../chunkRegistry";
import { GREATER_ACCRA_ROAD_PATHS } from "../greaterAccraLayout";
import { GREATER_ACCRA_LOCAL_ROADS } from "../greaterAccraRoadData";

type Point = Readonly<{ x: number; z: number }>;

function hashCell(x: number, z: number): number {
  let value = Math.imul(x ^ 0x45d9f3b, 0x45d9f3b) ^ Math.imul(z ^ 0x119de1f3, 0x119de1f3);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
}

function distanceToSegment(point: Point, start: Point, end: Point): number {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const lengthSquared = dx * dx + dz * dz;
  if (lengthSquared <= 1e-8) return Math.hypot(point.x - start.x, point.z - start.z);
  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.z - start.z) * dz) / lengthSquared));
  return Math.hypot(point.x - (start.x + dx * t), point.z - (start.z + dz * t));
}

function isRoadsidePlantPosition(point: Point): boolean {
  // Keep planting out of carriageways, pavements and junction approaches.
  // Major corridors use a wider safety envelope than narrow local streets.
  for (const road of GREATER_ACCRA_ROAD_PATHS) {
    for (let index = 1; index < road.points.length; index += 1) {
      if (distanceToSegment(point, road.points[index - 1], road.points[index]) < 26) return false;
    }
  }

  let nearLocalRoad = false;
  for (const road of GREATER_ACCRA_LOCAL_ROADS) {
    for (let index = 1; index < road.points.length; index += 1) {
      const distance = distanceToSegment(point, road.points[index - 1], road.points[index]);
      if (distance < road.width / 2 + 5) return false;
      if (distance < 34) nearLocalRoad = true;
    }
  }
  return nearLocalRoad;
}

function sharedMaterial(scene: Scene, name: string, colour: Color3): StandardMaterial {
  const existing = scene.getMaterialByName(name);
  if (existing instanceof StandardMaterial) return existing;
  const material = new StandardMaterial(name, scene);
  material.diffuseColor = colour;
  material.specularColor = new Color3(0.025, 0.03, 0.02);
  return material;
}

/**
 * Chunk-local tropical roadside planting. Instances share two low-cost source
 * meshes and deterministic cell placement, so moving between chunks does not
 * reshuffle the vegetation or allocate a separate material per tree.
 */
export const roadsideVegetationGenerator: ChunkGenerator = {
  id: "roadside-vegetation",
  priority: 30,
  build(scene: Scene, bounds: ChunkBounds): ChunkBuildResult | null {
    const spacing = 78;
    const firstCellX = Math.floor(bounds.minX / spacing);
    const lastCellX = Math.floor(bounds.maxX / spacing);
    const firstCellZ = Math.floor(bounds.minZ / spacing);
    const lastCellZ = Math.floor(bounds.maxZ / spacing);
    const positions: Array<{ point: Point; scale: number; variant: number }> = [];

    for (let cellX = firstCellX; cellX <= lastCellX; cellX += 1) {
      for (let cellZ = firstCellZ; cellZ <= lastCellZ; cellZ += 1) {
        const seed = hashCell(cellX, cellZ);
        if (seed > 0.24) continue;
        const jitterX = (hashCell(cellX + 17, cellZ - 31) - 0.5) * 34;
        const jitterZ = (hashCell(cellX - 23, cellZ + 11) - 0.5) * 34;
        const point = { x: (cellX + 0.5) * spacing + jitterX, z: (cellZ + 0.5) * spacing + jitterZ };
        if (point.x < bounds.minX + 8 || point.x > bounds.maxX - 8 ||
            point.z < bounds.minZ + 8 || point.z > bounds.maxZ - 8) continue;
        if (!isRoadsidePlantPosition(point)) continue;
        positions.push({
          point,
          scale: 0.82 + hashCell(cellX + 41, cellZ + 7) * 0.48,
          variant: Math.floor(hashCell(cellX + 5, cellZ - 13) * 3)
        });
      }
    }
    if (positions.length === 0) return null;

    const firstMeshIndex = scene.meshes.length;
    const trunkMaterial = sharedMaterial(scene, "akwantuo-vegetation-trunk", new Color3(0.24, 0.15, 0.085));
    const leafMaterials = [
      sharedMaterial(scene, "akwantuo-vegetation-leaves-deep", new Color3(0.13, 0.28, 0.12)),
      sharedMaterial(scene, "akwantuo-vegetation-leaves-mid", new Color3(0.2, 0.36, 0.14)),
      sharedMaterial(scene, "akwantuo-vegetation-leaves-light", new Color3(0.31, 0.42, 0.16))
    ];

    const trunkSource = MeshBuilder.CreateCylinder("roadside-tree-trunk-source", {
      height: 4.2, diameterTop: 0.2, diameterBottom: 0.42, tessellation: 7
    }, scene);
    trunkSource.material = trunkMaterial;
    trunkSource.isVisible = false;
    trunkSource.isPickable = false;
    trunkSource.checkCollisions = false;

    const canopySources = leafMaterials.map((material, index) => {
      const canopy = MeshBuilder.CreateSphere("roadside-tree-canopy-source-" + index, {
        diameter: 4.6 - index * 0.25, segments: 7
      }, scene);
      canopy.material = material;
      canopy.isVisible = false;
      canopy.isPickable = false;
      canopy.checkCollisions = false;
      return canopy;
    });

    const createdInstances = [];
    for (const [index, tree] of positions.entries()) {
      const { x, z } = tree.point;
      const scale = tree.scale;
      const trunk = trunkSource.createInstance("roadside-tree-trunk-" + index);
      trunk.position.set(x, 2.1 * scale, z);
      trunk.scaling.set(scale, scale, scale);
      trunk.isPickable = false;
      trunk.checkCollisions = false;
      createdInstances.push(trunk);

      const canopy = canopySources[tree.variant].createInstance("roadside-tree-canopy-" + index);
      canopy.position.set(x, 4.7 * scale, z);
      canopy.scaling.set(scale, 0.78 * scale, scale);
      canopy.isPickable = false;
      canopy.checkCollisions = false;
      createdInstances.push(canopy);
    }

    const createdMeshes = scene.meshes.slice(firstMeshIndex);
    let disposed = false;
    const handle: ChunkHandle = {
      dispose(): void {
        if (disposed) return;
        disposed = true;
        for (const mesh of [...createdInstances, ...createdMeshes]) {
          if (!mesh.isDisposed()) mesh.dispose(false, false);
        }
      }
    };

    return {
      handle,
      solidAreas: [],
      metadata: { roadsideTreeCount: positions.length, instancedMeshCount: createdInstances.length }
    };
  }
};

import type { ChunkBounds } from "./chunkManager";

/** Bounds passed to spatial builders. Margin is an overlap buffer in metres. */
export interface ChunkGenerationBounds extends ChunkBounds {
  margin: number;
}

export interface SpatialFootprint {
  x: number;
  z: number;
  width: number;
  depth: number;
}

/**
 * Tests footprint/rectangle intersection, not centre-point membership.
 * This keeps long roads and large buildings eligible for every chunk they cross.
 */
export function boundsIntersect(
  footprint: { minX: number; maxX: number; minZ: number; maxZ: number },
  bounds: ChunkGenerationBounds
): boolean {
  const margin = Math.max(0, bounds.margin);
  return footprint.maxX >= bounds.minX - margin &&
    footprint.minX <= bounds.maxX + margin &&
    footprint.maxZ >= bounds.minZ - margin &&
    footprint.minZ <= bounds.maxZ + margin;
}

export function buildingIntersectsChunk(
  building: SpatialFootprint,
  bounds: ChunkGenerationBounds
): boolean {
  return boundsIntersect({
    minX: building.x - building.width / 2,
    maxX: building.x + building.width / 2,
    minZ: building.z - building.depth / 2,
    maxZ: building.z + building.depth / 2
  }, bounds);
}

/** Expands a chunk rectangle for generators that need seamless edge overlap. */
export function withChunkMargin(
  bounds: ChunkBounds,
  margin = 24
): ChunkGenerationBounds {
  if (!Number.isFinite(margin) || margin < 0) {
    throw new RangeError("Chunk margin must be a non-negative finite number");
  }
  return { ...bounds, margin };
}

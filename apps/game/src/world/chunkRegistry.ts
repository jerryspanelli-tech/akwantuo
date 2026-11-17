import type { Scene } from "@babylonjs/core";
import type { ChunkBounds, ChunkHandle } from "./chunkManager";
import { districtBuildingsGenerator } from "./chunkGenerators/buildings";
import { localRoadsGenerator } from "./chunkGenerators/roads";
import { roadsideVegetationGenerator } from "./chunkGenerators/vegetation";

export interface ChunkBuildResult {
  handle: ChunkHandle;
  solidAreas: Array<{ x: number; z: number; halfWidth: number; halfDepth: number }>;
  metadata?: Record<string, unknown>;
}

export interface ChunkGenerator {
  id: string;
  priority?: number;
  /** Return null when this generator has no content intersecting the chunk. */
  build(scene: Scene, bounds: ChunkBounds): ChunkBuildResult | null;
}

export const SPAWN_CHUNK_KEY = "1:-3";

/**
 * Routes chunk requests to domain builders. Lifecycle, queueing and disposal
 * remain the responsibility of WorldChunkManager.
 */
export class ChunkRegistry {
  private readonly generators: readonly ChunkGenerator[];

  constructor(generators: readonly ChunkGenerator[] = [districtBuildingsGenerator, localRoadsGenerator, roadsideVegetationGenerator]) {
    const ids = new Set<string>();
    for (const generator of generators) {
      if (!generator.id || ids.has(generator.id)) {
        throw new Error("Chunk generator IDs must be non-empty and unique");
      }
      ids.add(generator.id);
    }
    this.generators = [...generators].sort(
      (a, b) => (a.priority ?? 0) - (b.priority ?? 0)
    );
  }

  loadChunk(scene: Scene, key: string, bounds: ChunkBounds): ChunkBuildResult {
    const built: ChunkBuildResult[] = [];
    try {
      for (const generator of this.generators) {
        const result = generator.build(scene, bounds);
        if (result) built.push(result);
      }
    } catch (error) {
      for (const result of built.reverse()) result.handle.dispose();
      throw error;
    }

    const solidAreas = built.flatMap((result) => result.solidAreas);
    let disposed = false;
    return {
      solidAreas,
      metadata: {
        chunkKey: key,
        generators: built.length,
        generatorMetadata: built.map((result) => result.metadata ?? {})
      },
      handle: {
        dispose(): void {
          if (disposed) return;
          disposed = true;
          for (const result of [...built].reverse()) result.handle.dispose();
        }
      }
    };
  }

  getGeneratorIds(): string[] {
    return this.generators.map((generator) => generator.id);
  }
}

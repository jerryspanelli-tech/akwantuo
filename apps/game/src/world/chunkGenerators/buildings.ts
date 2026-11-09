import type { Scene } from "@babylonjs/core";
import type { ChunkBounds, ChunkHandle } from "../chunkManager";
import { createGhanaianStreetBuildings } from "../ghanaianStreetBuildings";
import { withChunkMargin } from "../spatialIntersection";
import type { ChunkBuildResult, ChunkGenerator } from "../chunkRegistry";

/** Builds only district building footprints touching this chunk plus its overlap margin. */
export const districtBuildingsGenerator: ChunkGenerator = {
  id: "district-buildings",
  priority: 10,
  build(scene: Scene, bounds: ChunkBounds): ChunkBuildResult {
    const firstMeshIndex = scene.meshes.length;
    const result = createGhanaianStreetBuildings(scene, withChunkMargin(bounds, 24));
    const createdMeshes = scene.meshes.slice(firstMeshIndex);
    let disposed = false;
    const handle: ChunkHandle = {
      dispose(): void {
        if (disposed) return;
        disposed = true;
        for (const mesh of createdMeshes) {
          if (!mesh.isDisposed()) mesh.dispose(false, false);
        }
      }
    };
    return {
      handle,
      solidAreas: result.solidAreas,
      metadata: { buildingIds: result.buildings.map((building) => building.id) }
    };
  }
};

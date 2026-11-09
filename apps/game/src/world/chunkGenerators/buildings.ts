import type { Scene } from "@babylonjs/core";
import type { ChunkBounds, ChunkHandle } from "../chunkManager";
import { createGhanaianStreetBuildings } from "../ghanaianStreetBuildings";
import { buildingIntersectsChunk, withChunkMargin } from "../spatialIntersection";
import { getChunkKey } from "../chunkManager";
import { DISTRICT_BUILDINGS } from "../ghanaianStreetBuildings";
import type { ChunkBuildResult, ChunkGenerator } from "../chunkRegistry";

/** Builds only district building footprints touching this chunk plus its overlap margin. */
export const districtBuildingsGenerator: ChunkGenerator = {
  id: "district-buildings",
  priority: 10,
  build(scene: Scene, bounds: ChunkBounds): ChunkBuildResult {
    const chunkSize = bounds.maxX - bounds.minX;
    const key = getChunkKey({ x: bounds.minX, z: bounds.minZ }, chunkSize);
    const ownedBuildings = DISTRICT_BUILDINGS.filter((building) =>
      getChunkKey({ x: building.x, z: building.z }, chunkSize) === key &&
      buildingIntersectsChunk(building, withChunkMargin(bounds, 24))
    );
    if (!ownedBuildings.length) return null;
    const firstMeshIndex = scene.meshes.length;
    const result = createGhanaianStreetBuildings(
      scene, withChunkMargin(bounds, 24), new Set(ownedBuildings.map((building) => building.id))
    );
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

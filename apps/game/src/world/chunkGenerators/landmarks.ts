import type { Scene } from "@babylonjs/core";
import type { ChunkBounds, ChunkHandle } from "../chunkManager";
import { getChunkKey } from "../chunkManager";
import type { ChunkBuildResult, ChunkGenerator } from "../chunkRegistry";
import { boundsIntersect, withChunkMargin } from "../spatialIntersection";
import { GREATER_ACCRA_LANDMARK_FOOTPRINTS } from "../greaterAccraLandmarkData";
import {
  createAccraMall, createAccraSportsStadium, createKotokaAirport,
  createKwameNkrumahMemorial, createNationalTheatre, createSignature,
  createUniversityOfGhana, createVillaggio
} from "../greaterAccraLandmarks";

const BUILDERS: Record<string, (scene: Scene, solids: Array<{ x: number; z: number; halfWidth: number; halfDepth: number }>) => void> = {
  "villaggio-vista": createVillaggio,
  "the-signature": createSignature,
  "accra-mall": createAccraMall,
  "kotoka-airport": createKotokaAirport,
  "accra-sports-stadium": createAccraSportsStadium,
  "university-of-ghana": createUniversityOfGhana,
  "kwame-nkrumah-memorial": createKwameNkrumahMemorial,
  "national-theatre": createNationalTheatre
};

/** Dormant until eager landmark output has been compared in a real browser. */
export const greaterAccraLandmarksGenerator: ChunkGenerator = {
  id: "greater-accra-landmarks", priority: 30,
  build(scene: Scene, bounds: ChunkBounds): ChunkBuildResult | null {
    const size = bounds.maxX - bounds.minX;
    const marginBounds = withChunkMargin(bounds, 24);
    const owned = GREATER_ACCRA_LANDMARK_FOOTPRINTS.filter((landmark) =>
      getChunkKey({ x: landmark.x, z: landmark.z }, size) === getChunkKey({ x: bounds.minX, z: bounds.minZ }, size) &&
      boundsIntersect({ minX: landmark.minX, maxX: landmark.maxX, minZ: landmark.minZ, maxZ: landmark.maxZ }, marginBounds)
    );
    if (!owned.length) return null;
    const firstMesh = scene.meshes.length;
    const existingMaterials = new Set(scene.materials);
    const solidAreas: Array<{ x: number; z: number; halfWidth: number; halfDepth: number }> = [];
    try {
      for (const landmark of owned) BUILDERS[landmark.id](scene, solidAreas);
    } catch (error) {
      for (const mesh of scene.meshes.slice(firstMesh)) mesh.dispose(false, false);
      throw error;
    }
    const createdMeshes = scene.meshes.slice(firstMesh);
    const createdMaterials = scene.materials.filter((material) => !existingMaterials.has(material));
    let disposed = false;
    const handle: ChunkHandle = { dispose(): void {
      if (disposed) return;
      disposed = true;
      for (const mesh of createdMeshes) if (!mesh.isDisposed()) mesh.dispose(false, false);
      for (const material of createdMaterials) {
        if (!scene.meshes.some((mesh) => mesh.material === material)) material.dispose(true, true);
      }
    }};
    return { handle, solidAreas, metadata: { landmarkIds: owned.map((landmark) => landmark.id) } };
  }
};

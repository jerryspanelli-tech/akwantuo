import { Color3, DynamicTexture, Mesh, MeshBuilder, Scene, StandardMaterial, Vector3, VertexData } from "@babylonjs/core";
import type { ChunkBounds, ChunkHandle } from "../chunkManager";
import type { ChunkBuildResult, ChunkGenerator } from "../chunkRegistry";
import { GREATER_ACCRA_LOCAL_ROADS } from "../greaterAccraRoadData";
import { clipRoadPath, type RoadPoint } from "../roadClipping";
import { enableAkwantuoShadowReceiver } from "../lighting";

function sharedMaterial(scene: Scene, name: string, color: Color3): StandardMaterial {
  const existing = scene.getMaterialByName(name);
  if (existing instanceof StandardMaterial) return existing;
  const material = new StandardMaterial(name, scene);
  material.diffuseColor = color;
  material.specularColor = name === "akwantuo-road-asphalt"
    ? new Color3(0.025, 0.025, 0.025)
    : new Color3(0.08, 0.08, 0.08);

  // The spawn chunk is built before the arterial-road layer. Give the shared
  // asphalt material its grain here so the later highway meshes cannot inherit
  // a flat material merely because the chunk generator created it first.
  if (name === "akwantuo-road-asphalt") {
    const texture = new DynamicTexture(
      "akwantuo-road-asphalt-grain",
      { width: 256, height: 256 },
      scene,
      false
    );
    const context = texture.getContext();
    context.fillStyle = "#343a3b";
    context.fillRect(0, 0, 256, 256);
    for (let index = 0; index < 5200; index += 1) {
      const x = (index * 73 + 19) % 256;
      const y = (index * 151 + 47) % 256;
      const shade = index % 3 === 0 ? 75 : index % 3 === 1 ? 105 : 135;
      context.fillStyle = "rgba(" + shade + "," + shade + "," + shade + "," + (0.08 + (index % 4) * 0.025) + ")";
      context.fillRect(x, y, 1 + (index % 2), 1);
    }
    texture.update(false);
    texture.uScale = 3;
    texture.vScale = 72;
    texture.anisotropicFilteringLevel = Math.min(8, scene.getEngine().getCaps().maxAnisotropy || 1);
    material.diffuseTexture = texture;
    material.diffuseColor = new Color3(0.9, 0.92, 0.92);
  }
  return material;
}

function buildRoadPiece(scene: Scene, id: string, points: readonly RoadPoint[], width: number, materials: { asphalt: StandardMaterial; sidewalk: StandardMaterial; drain: StandardMaterial }): void {
  const scale = width / 12;
  const band = (name: string, innerOffset: number, outerOffset: number, material: StandardMaterial): void => {
    const inner: Vector3[] = [], outer: Vector3[] = [];
    points.forEach((point, index) => {
      const before = points[Math.max(0, index - 1)], after = points[Math.min(points.length - 1, index + 1)];
      const dx = after.x - before.x, dz = after.z - before.z, length = Math.hypot(dx, dz) || 1;
      const nx = dz / length, nz = -dx / length;
      inner.push(new Vector3(point.x + nx * innerOffset * scale, 0.05, point.z + nz * innerOffset * scale));
      outer.push(new Vector3(point.x + nx * outerOffset * scale, 0.05, point.z + nz * outerOffset * scale));
    });
    const thickness = material === materials.asphalt ? 0.42
      : material === materials.sidewalk ? 0.22 : 0.16;
    const positions: number[] = [];
    const indices: number[] = [];
    for (let index = 0; index < inner.length; index += 1) {
      positions.push(
        inner[index].x, inner[index].y, inner[index].z,
        outer[index].x, outer[index].y, outer[index].z,
        inner[index].x, inner[index].y - thickness, inner[index].z,
        outer[index].x, outer[index].y - thickness, outer[index].z
      );
    }
    const addQuad = (a: number, b: number, c: number, d: number): void => {
      indices.push(a, b, c, a, c, d, c, b, a, d, c, a);
    };
    for (let index = 0; index < inner.length - 1; index += 1) {
      const current = index * 4, next = (index + 1) * 4;
      addQuad(current, next, next + 1, current + 1);
      addQuad(current + 2, current + 3, next + 3, next + 2);
      addQuad(current, current + 2, next + 2, next);
      addQuad(current + 1, next + 1, next + 3, current + 3);
    }
    const vertexData = new VertexData();
    vertexData.positions = positions;
    vertexData.indices = indices;
    vertexData.normals = [];
    VertexData.ComputeNormals(positions, indices, vertexData.normals);
    const mesh = new Mesh(name, scene);
    vertexData.applyToMesh(mesh, false);
    mesh.material = material;
    mesh.isPickable = false;
    mesh.checkCollisions = false;
    if (material === materials.asphalt || material === materials.sidewalk) enableAkwantuoShadowReceiver(mesh);
  };
  band(id + "-asphalt", -3.75, 3.75, materials.asphalt);
  band(id + "-shoulder-west", 3.75, 4.25, materials.asphalt);
  band(id + "-sidewalk-west", 4.25, 6.05, materials.sidewalk);
  band(id + "-drain-west", 6.05, 6.5, materials.drain);
  band(id + "-shoulder-east", -4.25, -3.75, materials.asphalt);
  band(id + "-sidewalk-east", -6.05, -4.25, materials.sidewalk);
  band(id + "-drain-east", -6.5, -6.05, materials.drain);

  // Raised kerbs give the pavement a real 3D edge instead of leaving every
  // roadside layer as a flat ribbon. Segment-local boxes follow curved paths
  // without creating one oversized straight kerb across a bend.
  const kerbMaterial = sharedMaterial(scene, "akwantuo-road-raised-kerb", new Color3(0.64, 0.64, 0.59));
  for (const side of [-1, 1] as const) {
    for (let index = 1; index < points.length; index += 1) {
      const previous = points[index - 1];
      const current = points[index];
      const dx = current.x - previous.x;
      const dz = current.z - previous.z;
      const length = Math.hypot(dx, dz);
      if (length < 0.05) continue;
      const nx = dz / length;
      const nz = -dx / length;
      const offset = side * 6.05 * scale;
      const kerb = MeshBuilder.CreateBox(id + "-raised-kerb-" + side + "-" + index, {
        width: 0.16 * scale,
        height: 0.18,
        depth: length + 0.04
      }, scene);
      kerb.position.set(
        (previous.x + current.x) / 2 + nx * offset,
        0.12,
        (previous.z + current.z) / 2 + nz * offset
      );
      kerb.rotation.y = Math.atan2(dx, dz);
      kerb.material = kerbMaterial;
      kerb.isPickable = false;
      kerb.checkCollisions = false;
    }
  }
  const offsetPath = (offset: number): Vector3[] => points.map((point, index) => {
    const before = points[Math.max(0, index - 1)], after = points[Math.min(points.length - 1, index + 1)];
    const dx = after.x - before.x, dz = after.z - before.z, length = Math.hypot(dx, dz) || 1;
    return new Vector3(point.x + dz / length * offset, 0.088, point.z - dx / length * offset);
  });
  // Local streets are undivided two-way roads: white edge lines and a yellow
  // centre line. Divided national/arterial roads use their own cross-section
  // builder and never inherit this single-carriageway marking pattern.
  const edgePaint = MeshBuilder.CreateLineSystem(id + "-road-edge-markings", {
    lines: [offsetPath(3.25 * scale), offsetPath(-3.25 * scale)],
    updatable: false
  }, scene);
  edgePaint.color = new Color3(0.9, 0.91, 0.87);
  edgePaint.alpha = 1;
  edgePaint.isPickable = false;
  edgePaint.checkCollisions = false;
  edgePaint.renderingGroupId = 0;

  const centrePaint = MeshBuilder.CreateLines(id + "-road-centre-marking", {
    points: offsetPath(0),
    updatable: false
  }, scene);
  centrePaint.color = new Color3(0.95, 0.72, 0.16);
  centrePaint.alpha = 1;
  centrePaint.isPickable = false;
  centrePaint.checkCollisions = false;
  centrePaint.renderingGroupId = 0;
}

/** Builds only road segments whose centreline intersects this chunk. */
export const localRoadsGenerator: ChunkGenerator = {
  id: "local-roads", priority: 20,
  build(scene: Scene, bounds: ChunkBounds): ChunkBuildResult | null {
    const roads = GREATER_ACCRA_LOCAL_ROADS.flatMap((road) =>
      clipRoadPath(road.points, bounds).map((piece, index) => ({ road, piece, index }))
    );
    if (!roads.length) return null;
    const materials = {
      asphalt: sharedMaterial(scene, "akwantuo-road-asphalt", new Color3(0.105, 0.12, 0.125)),
      sidewalk: sharedMaterial(scene, "akwantuo-road-sidewalk", new Color3(0.48, 0.47, 0.42)),
      drain: sharedMaterial(scene, "akwantuo-road-drain", new Color3(0.075, 0.09, 0.085))
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

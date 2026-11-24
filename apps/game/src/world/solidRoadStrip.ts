import { Mesh, Scene, StandardMaterial, VertexData, Vector3 } from "@babylonjs/core";

/**
 * Builds a closed, solid road-side strip from paired top-edge paths.
 * The top paths define the visible surface; the generated bottom and side
 * faces give the road, pavement, kerb and drain real vertical thickness.
 */
export function createSolidRoadStrip(
  scene: Scene,
  name: string,
  innerTop: readonly Vector3[],
  outerTop: readonly Vector3[],
  thicknessM: number,
  material: StandardMaterial
): Mesh {
  if (innerTop.length !== outerTop.length || innerTop.length < 2) {
    throw new RangeError("A solid road strip requires matching paths with at least two stations.");
  }
  if (!Number.isFinite(thicknessM) || thicknessM <= 0) {
    throw new RangeError("Road strip thickness must be a positive finite number.");
  }

  const positions: number[] = [];
  const indices: number[] = [];
  const stationCount = innerTop.length;

  for (let i = 0; i < stationCount; i += 1) {
    const inner = innerTop[i];
    const outer = outerTop[i];
    positions.push(
      inner.x, inner.y, inner.z,
      outer.x, outer.y, outer.z,
      inner.x, inner.y - thicknessM, inner.z,
      outer.x, outer.y - thicknessM, outer.z
    );
  }

  for (let i = 0; i < stationCount - 1; i += 1) {
    const a = i * 4;
    const b = (i + 1) * 4;
    // Top, underside, inner wall and outer wall.
    indices.push(a, b, b + 1, a, b + 1, a + 1);
    indices.push(a + 2, a + 3, b + 3, a + 2, b + 3, b + 2);
    indices.push(a, b, b + 2, a, b + 2, a + 2);
    indices.push(a + 1, a + 3, b + 3, a + 1, b + 3, b + 1);
  }

  const first = 0;
  const last = (stationCount - 1) * 4;
  // End caps close the volume.
  indices.push(first, first + 2, first + 3, first, first + 3, first + 1);
  indices.push(last, last + 1, last + 3, last, last + 3, last + 2);

  const normals: number[] = [];
  VertexData.ComputeNormals(positions, indices, normals);
  const data = new VertexData();
  data.positions = positions;
  data.indices = indices;
  data.normals = normals;

  const mesh = new Mesh(name, scene);
  data.applyToMesh(mesh, false);
  material.backFaceCulling = false;
  mesh.material = material;
  mesh.isPickable = false;
  mesh.checkCollisions = false;
  return mesh;
}

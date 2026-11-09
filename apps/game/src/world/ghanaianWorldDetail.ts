import {
  Color3,
  MeshBuilder,
  Scene,
  StandardMaterial
} from "@babylonjs/core";

/**
 * Adds lightweight visual identity to the compressed Greater Accra world:
 * coastal palms, neighbourhood shade trees and a small set of landmark
 * silhouettes. These are scenery meshes, not surveyed landmark coordinates.
 */
export function createGreaterAccraWorldDetail(scene: Scene): void {
  const trunk = new StandardMaterial("ghana-world-tree-trunk", scene);
  trunk.diffuseColor = new Color3(0.29, 0.18, 0.1);
  const leaf = new StandardMaterial("ghana-world-tree-leaf", scene);
  leaf.diffuseColor = new Color3(0.16, 0.34, 0.19);
  const dryLeaf = new StandardMaterial("ghana-world-dry-grass", scene);
  dryLeaf.diffuseColor = new Color3(0.47, 0.43, 0.27);
  const concrete = new StandardMaterial("ghana-world-landmark-concrete", scene);
  concrete.diffuseColor = new Color3(0.77, 0.72, 0.61);
  const darkStone = new StandardMaterial("ghana-world-landmark-stone", scene);
  darkStone.diffuseColor = new Color3(0.34, 0.37, 0.35);
  const oceanBlue = new StandardMaterial("ghana-world-beach-canopy", scene);
  oceanBlue.diffuseColor = new Color3(0.82, 0.63, 0.31);

  const shadeTree = (x: number, z: number, scale = 1): void => {
    const height = 4.8 * scale;
    const stem = MeshBuilder.CreateCylinder("ghana-shade-tree-trunk", {
      height, diameterTop: 0.22 * scale, diameterBottom: 0.48 * scale, tessellation: 7
    }, scene);
    stem.position.set(x, height / 2, z);
    stem.material = trunk;
    stem.isPickable = false;
    const crown = MeshBuilder.CreateSphere("ghana-shade-tree-crown", {
      diameter: 4.2 * scale, segments: 5
    }, scene);
    crown.scaling.y = 0.72;
    crown.position.set(x, height + 1.05 * scale, z);
    crown.material = leaf;
    crown.isPickable = false;
  };

  const palm = (x: number, z: number, scale = 1): void => {
    const height = 7.2 * scale;
    const stem = MeshBuilder.CreateCylinder("ghana-coastal-palm-trunk", {
      height, diameterTop: 0.2 * scale, diameterBottom: 0.42 * scale, tessellation: 7
    }, scene);
    stem.position.set(x, height / 2, z);
    stem.rotation.z = -0.035;
    stem.material = trunk;
    stem.isPickable = false;
    for (let index = 0; index < 7; index += 1) {
      const angle = index * Math.PI * 2 / 7;
      const frond = MeshBuilder.CreateBox("ghana-coastal-palm-frond", {
        width: 0.24 * scale, height: 0.12 * scale, depth: 4.5 * scale
      }, scene);
      frond.position.set(
        x + Math.sin(angle) * 1.45 * scale,
        height + 0.35 * scale,
        z + Math.cos(angle) * 1.45 * scale
      );
      frond.rotation.y = angle;
      frond.rotation.x = 0.34;
      frond.material = leaf;
      frond.isPickable = false;
    }
  };

  // Green, shaded residential edges around Legon, East Legon and Achimota.
  [
    [3100, 3000, 1.2], [3500, 2800, 1], [4100, 2500, 1.15],
    [4300, 3200, 1.25], [2850, 3700, 1.1], [-1900, 2550, 1.15],
    [-2250, 2250, 1], [-1450, 1850, 1.1], [5200, 2200, 1.1],
    [5750, 2450, 1.2], [6100, 1900, 1], [4800, 1300, 0.9],
    [-5400, -200], [-5000, -450], [-4600, -850], [-3900, -500],
    [7600, -100], [8000, -350], [8400, -1000], [9400, -450]
  ].forEach(([x, z, scale]) => shadeTree(x, z, scale));

  // Coastal palms make the Osu–Labadi and Tema shoreline read differently
  // from the inland residential and commercial districts.
  [
    [900, -2800], [1250, -2920], [1650, -2760], [2050, -2950],
    [2500, -2800], [2900, -3000], [3300, -2800], [3800, -3000],
    [4500, -2860], [5200, -3000], [6000, -2820], [6900, -3000],
    [7900, -2800], [8800, -2920], [9700, -2850]
  ].forEach(([x, z], index) => palm(x, z, index % 4 === 0 ? 1.12 : 0.92));

  // A recognisable lighthouse silhouette on the western coast.
  const lighthouse = MeshBuilder.CreateCylinder("jamestown-inspired-lighthouse", {
    height: 24, diameterTop: 4.2, diameterBottom: 7, tessellation: 12
  }, scene);
  lighthouse.position.set(-5750, 12, -2300);
  lighthouse.material = concrete;
  lighthouse.isPickable = false;
  const lantern = MeshBuilder.CreateCylinder("lighthouse-lantern-room", {
    height: 2.2, diameter: 5.2, tessellation: 12
  }, scene);
  lantern.position.set(-5750, 24.5, -2300);
  lantern.material = darkStone;
  lantern.isPickable = false;
  const beacon = MeshBuilder.CreateCylinder("lighthouse-roof", {
    height: 2.5, diameterTop: 0.2, diameterBottom: 5.8, tessellation: 12
  }, scene);
  beacon.position.set(-5750, 26.8, -2300);
  beacon.material = oceanBlue;
  beacon.isPickable = false;

  // A monumental coastal arch gives the central waterfront a clear skyline.
  for (const side of [-1, 1]) {
    const column = MeshBuilder.CreateBox("independence-arch-column", {
      width: 4.5, height: 17, depth: 4
    }, scene);
    column.position.set(150 + side * 9, 8.5, -2780);
    column.material = concrete;
    column.isPickable = false;
  }
  const archBeam = MeshBuilder.CreateBox("independence-arch-beam", {
    width: 22.5, height: 4, depth: 4.5
  }, scene);
  archBeam.position.set(150, 17, -2780);
  archBeam.material = concrete;
  archBeam.isPickable = false;

  // Beach shade canopies and low seating add activity to the Labadi shoreline.
  for (let index = 0; index < 6; index += 1) {
    const x = 2150 + (index % 3) * 24;
    const z = -2550 - Math.floor(index / 3) * 28;
    const pole = MeshBuilder.CreateCylinder("labadi-beach-umbrella-pole", {
      height: 3.2, diameter: 0.16, tessellation: 6
    }, scene);
    pole.position.set(x, 1.6, z);
    pole.material = trunk;
    pole.isPickable = false;
    const canopy = MeshBuilder.CreateCylinder("labadi-beach-umbrella-canopy", {
      height: 0.55, diameterTop: 0.25, diameterBottom: 4.8, tessellation: 8
    }, scene);
    canopy.position.set(x, 3.15, z);
    canopy.material = index % 2 === 0 ? oceanBlue : leaf;
    canopy.isPickable = false;
    const seat = MeshBuilder.CreateBox("labadi-beach-seat", {
      width: 2.2, height: 0.35, depth: 0.8
    }, scene);
    seat.position.set(x + 4.5, 0.45, z + 2.5);
    seat.material = dryLeaf;
    seat.isPickable = false;
  }
}

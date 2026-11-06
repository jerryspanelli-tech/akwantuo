import { Color3, MeshBuilder, Scene, StandardMaterial } from "@babylonjs/core";

export const AKWANTUO_PRIVATE_ISLAND = {
  id: "akwaaba-cay",
  name: "Akwaaba Cay Private Island",
  position: { x: 7000, z: -4300 },
  dimensions: { widthM: 520, depthM: 380 },
  purchasePricePesewas: 25_000_000_000,
  purchasePriceLabel: "GH₵250,000,000",
  access: "private",
  features: ["luxury villa", "private marina", "helipad", "beach", "security gate"] as const
} as const;

export const PRIVATE_ISLAND_WATERCRAFT = [
  { id: "island-speedboat", name: "Coastline 28 Speedboat", pricePesewas: 1_800_000_000, label: "GH₵18,000,000", kind: "boat" },
  { id: "island-yacht", name: "Ocean Crown Yacht", pricePesewas: 8_500_000_000, label: "GH₵85,000,000", kind: "yacht" },
  { id: "island-fishing-boat", name: "BlueFin Cruiser", pricePesewas: 420_000_000, label: "GH₵4,200,000", kind: "boat" },
  { id: "island-jet-ski", name: "WaveRider Jet Ski", pricePesewas: 95_000_000, label: "GH₵950,000", kind: "jet_ski" },
  { id: "island-jet-ski-pro", name: "WaveRider X Jet Ski", pricePesewas: 145_000_000, label: "GH₵1,450,000", kind: "jet_ski" }
] as const;

/** First-pass island landmark geometry; watercraft are visual displays, not yet drivable. */
export function createAkwantuoPrivateIsland(scene: Scene): number {
  const { x, z } = AKWANTUO_PRIVATE_ISLAND.position;
  const sand = new StandardMaterial("akwaaba-cay-sand", scene);
  sand.diffuseColor = new Color3(0.78, 0.69, 0.48);
  const grass = new StandardMaterial("akwaaba-cay-green", scene);
  grass.diffuseColor = new Color3(0.31, 0.43, 0.27);
  const villa = new StandardMaterial("akwaaba-cay-villa", scene);
  villa.diffuseColor = new Color3(0.86, 0.83, 0.72);
  const roof = new StandardMaterial("akwaaba-cay-roof", scene);
  roof.diffuseColor = new Color3(0.17, 0.23, 0.27);
  const dockMaterial = new StandardMaterial("akwaaba-cay-dock", scene);
  dockMaterial.diffuseColor = new Color3(0.39, 0.27, 0.18);
  const watercraftMaterial = new StandardMaterial("akwaaba-cay-watercraft", scene);
  watercraftMaterial.diffuseColor = new Color3(0.82, 0.82, 0.78);

  const beach = MeshBuilder.CreateSphere("akwaaba-cay-beach", { diameter: 1, segments: 32 }, scene);
  beach.scaling.set(260, 4, 190);
  beach.position.set(x, 0.2, z);
  beach.material = sand;
  beach.isPickable = false;

  const islandGreen = MeshBuilder.CreateSphere("akwaaba-cay-interior", { diameter: 1, segments: 24 }, scene);
  islandGreen.scaling.set(218, 3.4, 150);
  islandGreen.position.set(x, 1.6, z + 5);
  islandGreen.material = grass;
  islandGreen.isPickable = false;

  const house = MeshBuilder.CreateBox("akwaaba-cay-villa", { width: 82, height: 15, depth: 48 }, scene);
  house.position.set(x, 9, z + 12);
  house.material = villa;
  house.isPickable = false;
  const houseRoof = MeshBuilder.CreateBox("akwaaba-cay-villa-roof", { width: 88, height: 2, depth: 54 }, scene);
  houseRoof.position.set(x, 17.5, z + 12);
  houseRoof.material = roof;
  houseRoof.isPickable = false;

  const dock = MeshBuilder.CreateBox("akwaaba-cay-marina-dock", { width: 18, height: 1.8, depth: 125 }, scene);
  dock.position.set(x + 145, 1.2, z + 85);
  dock.material = dockMaterial;
  dock.isPickable = false;
  const helipad = MeshBuilder.CreateCylinder("akwaaba-cay-helipad", { diameter: 34, height: 0.7, tessellation: 32 }, scene);
  helipad.position.set(x - 115, 2.2, z - 45);
  helipad.material = roof;
  helipad.isPickable = false;

  for (let index = 0; index < 10; index += 1) {
    const angle = index * Math.PI * 2 / 10;
    const palm = MeshBuilder.CreateCylinder("akwaaba-cay-palm-trunk-" + index, { height: 12, diameterTop: 0.35, diameterBottom: 0.8, tessellation: 7 }, scene);
    palm.position.set(x + Math.cos(angle) * 185, 6, z + Math.sin(angle) * 128);
    palm.material = dockMaterial;
    palm.isPickable = false;
    const crown = MeshBuilder.CreateSphere("akwaaba-cay-palm-crown-" + index, { diameter: 8, segments: 8 }, scene);
    crown.position.set(palm.position.x, 12, palm.position.z);
    crown.scaling.y = 0.45;
    crown.material = grass;
    crown.isPickable = false;
  }

  for (let index = 0; index < 3; index += 1) {
    const boat = MeshBuilder.CreateBox("akwaaba-cay-boat-display-" + index, { width: 8, height: 2, depth: 20 + index * 7 }, scene);
    boat.position.set(x + 145, 2.8, z + 35 + index * 34);
    boat.material = watercraftMaterial;
    boat.isPickable = false;
  }
  for (let index = 0; index < 2; index += 1) {
    const ski = MeshBuilder.CreateBox("akwaaba-cay-jet-ski-display-" + index, { width: 3, height: 1.2, depth: 7 }, scene);
    ski.position.set(x + 130 + index * 7, 3, z - 5 + index * 9);
    ski.material = watercraftMaterial;
    ski.isPickable = false;
  }
  return 1;
}

export function isPrivateIslandCatalogueValid(): boolean {
  const ids = new Set(PRIVATE_ISLAND_WATERCRAFT.map((item) => item.id));
  return AKWANTUO_PRIVATE_ISLAND.purchasePricePesewas > 0 &&
    Number.isSafeInteger(AKWANTUO_PRIVATE_ISLAND.purchasePricePesewas) &&
    ids.size === PRIVATE_ISLAND_WATERCRAFT.length &&
    PRIVATE_ISLAND_WATERCRAFT.every((item) =>
      Number.isSafeInteger(item.pricePesewas) && item.pricePesewas > 0 &&
      item.name.length > 0 && (item.kind === "boat" || item.kind === "yacht" || item.kind === "jet_ski")
    );
}

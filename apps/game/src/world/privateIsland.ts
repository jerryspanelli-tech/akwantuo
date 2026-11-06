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

  const seaMaterial = new StandardMaterial("akwaaba-cay-sea", scene);
  seaMaterial.diffuseColor = new Color3(0.08, 0.28, 0.39);
  seaMaterial.specularColor = new Color3(0.22, 0.36, 0.42);
  const sea = MeshBuilder.CreateGround("akwaaba-cay-surrounding-sea", { width: 1100, height: 900, subdivisions: 2 }, scene);
  sea.position.set(x, 0.2, z);
  sea.material = seaMaterial;
  sea.isPickable = false;

  const beach = MeshBuilder.CreateSphere("akwaaba-cay-beach", { diameter: 1, segments: 40 }, scene);
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
  const windowMaterial = new StandardMaterial("akwaaba-cay-villa-glass", scene);
  windowMaterial.diffuseColor = new Color3(0.24, 0.55, 0.62);
  windowMaterial.alpha = 0.82;
  for (let side = -1; side <= 1; side += 2) {
    for (let windowIndex = 0; windowIndex < 4; windowIndex += 1) {
      const windowMesh = MeshBuilder.CreateBox("akwaaba-cay-villa-window-" + side + "-" + windowIndex, {
        width: 8, height: 4.2, depth: 0.22
      }, scene);
      windowMesh.position.set(x + side * 41.2, 10.3, z - 14 + windowIndex * 9);
      windowMesh.material = windowMaterial;
      windowMesh.isPickable = false;
    }
  }
  const villaEntrance = MeshBuilder.CreateBox("akwaaba-cay-villa-entry", { width: 7, height: 8, depth: 0.3 }, scene);
  villaEntrance.position.set(x, 5, z + 36.2);
  villaEntrance.material = roof;
  villaEntrance.isPickable = false;

  const dock = MeshBuilder.CreateBox("akwaaba-cay-marina-dock", { width: 18, height: 1.0, depth: 125 }, scene);
  dock.position.set(x + 145, 0.8, z + 85);
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

  const boatHullMaterial = new StandardMaterial("akwaaba-cay-boat-hull", scene);
  boatHullMaterial.diffuseColor = new Color3(0.84, 0.85, 0.82);
  const boatTrimMaterial = new StandardMaterial("akwaaba-cay-boat-trim", scene);
  boatTrimMaterial.diffuseColor = new Color3(0.12, 0.23, 0.29);
  for (let index = 0; index < 3; index += 1) {
    const boatZ = z + 35 + index * 34;
    const hull = MeshBuilder.CreateSphere("akwaaba-cay-boat-hull-" + index, { diameter: 1, segments: 16 }, scene);
    hull.scaling.set(4.2 + index * 0.6, 0.82, 12 + index * 2.5);
    hull.position.set(x + 145, 0.7, boatZ);
    hull.material = boatHullMaterial;
    hull.isPickable = false;
    const deck = MeshBuilder.CreateBox("akwaaba-cay-boat-deck-" + index, {
      width: 6.2 + index * 0.7, height: 0.48, depth: 10 + index * 2
    }, scene);
    deck.position.set(x + 145, 1.22, boatZ + 0.8);
    deck.material = watercraftMaterial;
    deck.isPickable = false;
    const cabin = MeshBuilder.CreateBox("akwaaba-cay-boat-cabin-" + index, {
      width: 4.2 + index * 0.4, height: 2.1 + index * 0.4, depth: 4.8 + index
    }, scene);
    cabin.position.set(x + 145, 2.35, boatZ - 1.8);
    cabin.material = index === 1 ? villa : boatTrimMaterial;
    cabin.isPickable = false;
    const windscreen = MeshBuilder.CreateBox("akwaaba-cay-boat-windscreen-" + index, {
      width: 3.8, height: 1.2, depth: 0.08
    }, scene);
    windscreen.position.set(x + 145, 2.82, boatZ + 0.62);
    windscreen.material = windowMaterial;
    windscreen.isPickable = false;
  }
  const jetSkiMaterial = new StandardMaterial("akwaaba-cay-jet-ski-colour", scene);
  jetSkiMaterial.diffuseColor = new Color3(0.84, 0.38, 0.12);
  for (let index = 0; index < 2; index += 1) {
    const skiX = x + 130 + index * 7;
    const skiZ = z - 5 + index * 9;
    const hull = MeshBuilder.CreateSphere("akwaaba-cay-jet-ski-hull-" + index, { diameter: 1, segments: 12 }, scene);
    hull.scaling.set(1.5, 0.55, 4.2);
    hull.position.set(skiX, 0.78, skiZ);
    hull.material = jetSkiMaterial;
    hull.isPickable = false;
    const seat = MeshBuilder.CreateBox("akwaaba-cay-jet-ski-seat-" + index, { width: 0.8, height: 0.32, depth: 1.7 }, scene);
    seat.position.set(skiX, 1.28, skiZ + 0.25);
    seat.material = boatTrimMaterial;
    seat.isPickable = false;
    const handle = MeshBuilder.CreateCylinder("akwaaba-cay-jet-ski-handle-" + index, { height: 0.9, diameter: 0.08, tessellation: 8 }, scene);
    handle.position.set(skiX, 1.58, skiZ - 1.15);
    handle.rotation.z = Math.PI / 2;
    handle.material = boatTrimMaterial;
    handle.isPickable = false;
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

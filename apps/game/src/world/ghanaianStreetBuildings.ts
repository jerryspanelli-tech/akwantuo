import {
  Color3,
  DynamicTexture,
  MeshBuilder,
  Scene,
  StandardMaterial
} from "@babylonjs/core";
import type { SolidArea } from "./collision";
import { GREATER_ACCRA_REGION_ANCHORS } from "./greaterAccraLayout";

export type BuildingUse =
  | "provisions"
  | "pharmacy"
  | "salon"
  | "food"
  | "workshop"
  | "office"
  | "compound_house"
  | "apartment"
  | "market_stall"
  | "guest_house"
  | "clinic"
  | "event_venue";

export type DistrictBuilding = Readonly<{
  id: string;
  districtId: string;
  name: string;
  use: BuildingUse;
  side: "west" | "east";
  x: number;
  z: number;
  width: number;
  depth: number;
  floors: number;
  exteriorStyle: "coastal" | "compound" | "modern" | "market";
  signText?: string;
  interiorId?: string;
  anchorOffsetX?: number;
  anchorOffsetZ?: number;
}>;

type DistrictBuildingTemplate = Omit<DistrictBuilding, "districtId">;

const BUILDING_TEMPLATES: readonly DistrictBuildingTemplate[] = [
  { id: "osu-corner-mart", name: "Osu Corner Mart", use: "provisions", side: "west", x: -18, z: -72, width: 13, depth: 14, floors: 1, exteriorStyle: "modern", signText: "AKWANTUO MART", interiorId: "convenience-store" },
  { id: "community-pharmacy", name: "Community Pharmacy", use: "pharmacy", side: "east", x: 18, z: -72, width: 10, depth: 11, floors: 1, exteriorStyle: "modern", signText: "PHARMACY", interiorId: "shop-small" },
  { id: "ama-salon", name: "Ama's Hair Studio", use: "salon", side: "west", x: -23, z: -59, width: 10, depth: 9, floors: 1, exteriorStyle: "coastal", signText: "HAIR STUDIO", interiorId: "salon" },
  { id: "chop-bar", name: "Auntie Esi Chop Bar", use: "food", side: "east", x: 23, z: -59, width: 11, depth: 10, floors: 1, exteriorStyle: "market", signText: "CHOP BAR", interiorId: "restaurant" },
  { id: "adom-compound", name: "Adom Family Compound", use: "compound_house", side: "west", x: -18, z: -46, width: 12, depth: 10, floors: 1, exteriorStyle: "compound", interiorId: "compound-house" },
  { id: "coastal-guest-house", name: "Coastal Guest House", use: "guest_house", side: "east", x: 19, z: -46, width: 12, depth: 11, floors: 2, exteriorStyle: "coastal", signText: "GUEST HOUSE", interiorId: "guest-house" },
  { id: "kwame-auto-works", name: "Kwame Auto Works", use: "workshop", side: "west", x: -23, z: -33, width: 11, depth: 10, floors: 1, exteriorStyle: "market", signText: "AUTO WORKS", interiorId: "workshop" },
  { id: "district-office", name: "District Services Office", use: "office", side: "east", x: 23, z: -33, width: 12, depth: 11, floors: 3, exteriorStyle: "modern", signText: "DISTRICT OFFICE", interiorId: "office" },
  { id: "makola-stall-row-a", name: "Makola Market Stall A", use: "market_stall", side: "west", x: -18, z: -20, width: 8, depth: 8, floors: 1, exteriorStyle: "market", signText: "MARKET", interiorId: "shop-small" },
  { id: "makola-stall-row-b", name: "Makola Market Stall B", use: "market_stall", side: "east", x: 18, z: -20, width: 8, depth: 8, floors: 1, exteriorStyle: "market", signText: "MARKET", interiorId: "shop-small" },
  { id: "ridge-clinic", name: "Ridge Community Clinic", use: "clinic", side: "west", x: -23, z: -7, width: 12, depth: 11, floors: 2, exteriorStyle: "modern", signText: "COMMUNITY CLINIC", interiorId: "clinic" },
  { id: "east-legon-apartments", name: "Palm Court Apartments", use: "apartment", side: "east", x: 23, z: -7, width: 13, depth: 12, floors: 3, exteriorStyle: "modern", signText: "PALM COURT", interiorId: "apartment" },
  { id: "old-town-house", name: "Old Town Family House", use: "compound_house", side: "west", x: -18, z: 7, width: 12, depth: 10, floors: 1, exteriorStyle: "compound", interiorId: "compound-house" },
  { id: "harbour-foods", name: "Harbour Foods", use: "food", side: "east", x: 18, z: 7, width: 10, depth: 10, floors: 1, exteriorStyle: "coastal", signText: "HARBOUR FOODS", interiorId: "restaurant" },
  { id: "akwaaba-provisions", name: "Akwaaba Provisions", use: "provisions", side: "west", x: -23, z: 20, width: 12, depth: 13, floors: 1, exteriorStyle: "modern", signText: "AKWAABA EXPRESS", interiorId: "convenience-store" },
  { id: "labadi-lodge", name: "Labadi Lodge", use: "guest_house", side: "east", x: 23, z: 20, width: 12, depth: 11, floors: 2, exteriorStyle: "coastal", signText: "LABADI LODGE", interiorId: "guest-house" },
  { id: "family-compound-north", name: "Northside Compound", use: "compound_house", side: "west", x: -18, z: 33, width: 12, depth: 10, floors: 1, exteriorStyle: "compound", interiorId: "compound-house" },
  { id: "digital-office", name: "Coastline Digital Hub", use: "office", side: "east", x: 18, z: 33, width: 11, depth: 10, floors: 2, exteriorStyle: "modern", signText: "DIGITAL HUB", interiorId: "office" },
  { id: "market-kiosk", name: "Street Market Kiosk", use: "market_stall", side: "west", x: -23, z: 46, width: 8, depth: 8, floors: 1, exteriorStyle: "market", signText: "KIOSK", interiorId: "shop-small" },
  { id: "northside-workshop", name: "Northside Repairs", use: "workshop", side: "east", x: 23, z: 46, width: 10, depth: 10, floors: 1, exteriorStyle: "market", signText: "REPAIRS", interiorId: "workshop" },
  { id: "heritage-house", name: "Heritage Family House", use: "compound_house", side: "west", x: -18, z: 59, width: 12, depth: 10, floors: 1, exteriorStyle: "compound", interiorId: "compound-house" },
  { id: "city-view-apartments", name: "City View Apartments", use: "apartment", side: "east", x: 18, z: 59, width: 12, depth: 10, floors: 3, exteriorStyle: "modern", interiorId: "apartment" },
  { id: "akwaaba-creative-arts-centre", name: "Akwaaba Creative Arts & Events Centre", use: "event_venue", side: "east", x: 70, z: 100, width: 68, depth: 58, floors: 2, exteriorStyle: "modern", signText: "AKWAABA CREATIVE ARTS", interiorId: "creative-arts-centre", anchorOffsetX: 70, anchorOffsetZ: 100 }
] as const;

/**
 * Distribute the first-release building set across the approved Greater Accra
 * district anchors. Each storefront faces its local street corridor; the
 * anchors remain approximate game-layout positions, not surveyed addresses.
 */
const BUILDING_DISTRICTS = [
  "osu", "accra-central-makola", "labadi", "airport-city", "east-legon",
  "legon", "madina-adenta", "achimota", "dansoman", "kaneshie", "spintex", "tema"
] as const;

export const DISTRICT_BUILDINGS: readonly DistrictBuilding[] = BUILDING_TEMPLATES.map((template, index) => {
  const districtIndex = index < 20 ? Math.floor(index / 2) : index === 20 ? 10 : index === 21 ? 11 : 3;
  const districtId = BUILDING_DISTRICTS[districtIndex];
  const anchor = GREATER_ACCRA_REGION_ANCHORS.find((item) => item.regionId === districtId);
  if (!anchor) throw new Error("Missing Greater Accra building anchor for " + districtId);
  const side = index < 20 ? (index % 2 === 0 ? "west" : "east") : template.side;
  return {
    ...template,
    districtId,
    side,
    x: anchor.x + (template.anchorOffsetX ?? (side === "west" ? -(template.width / 2 + 6) : template.width / 2 + 6)),
    z: anchor.z + (template.anchorOffsetZ ?? 0)
  };
});

const PALETTES = {
  coastal: { wall: "#d6b98c", trim: "#8a5538", roof: "#59483a", accent: "#c36b3f" },
  compound: { wall: "#c6b79a", trim: "#6c6254", roof: "#756b5c", accent: "#a56a45" },
  modern: { wall: "#c7d0cb", trim: "#596d70", roof: "#39494a", accent: "#d1ad63" },
  market: { wall: "#c99b63", trim: "#684b36", roof: "#554536", accent: "#d5b477" }
} as const;

function material(scene: Scene, name: string, hex: string): StandardMaterial {
  void name;
  const sharedName = "building-shared-material-" + hex;
  const existing = scene.getMaterialByName(sharedName);
  if (existing instanceof StandardMaterial) return existing;
  const result = new StandardMaterial(sharedName, scene);
  result.diffuseColor = Color3.FromHexString(hex);
  result.specularColor = new Color3(0.12, 0.12, 0.12);
  return result;
}

function addSign(scene: Scene, building: DistrictBuilding, faceX: number, y: number, z: number, palette: typeof PALETTES[keyof typeof PALETTES]): void {
  if (!building.signText) return;
  const texture = new DynamicTexture("sign-texture-" + building.id, { width: 512, height: 128 }, scene, false);
  texture.hasAlpha = true;
  const context = texture.getContext();
  context.fillStyle = palette.trim;
  context.fillRect(0, 0, 512, 128);
  context.fillStyle = "#fff4df";
  context.font = "bold 42px Arial";
  const canvasContext = context as unknown as CanvasRenderingContext2D;
  canvasContext.textAlign = "center";
  canvasContext.textBaseline = "middle";
  context.fillText(building.signText, 256, 64, 480);
  texture.update();
  const signMaterial = new StandardMaterial("sign-material-" + building.id, scene);
  signMaterial.diffuseTexture = texture;
  signMaterial.emissiveColor = new Color3(0.12, 0.1, 0.07);
  const sign = MeshBuilder.CreatePlane("shop-sign-" + building.id, { width: building.width * 0.78, height: 1.25 }, scene);
  sign.position.set(faceX, y, z);
  sign.rotation.y = building.side === "west" ? Math.PI / 2 : -Math.PI / 2;
  sign.material = signMaterial;
  sign.isPickable = false;
}

export function createGhanaianStreetBuildings(scene: Scene): {
  buildings: readonly DistrictBuilding[];
  solidAreas: SolidArea[];
} {
  const solidAreas: SolidArea[] = [];
  for (const building of DISTRICT_BUILDINGS) {
    const palette = PALETTES[building.exteriorStyle];
    const wall = material(scene, "building-wall-" + building.id, palette.wall);
    const trim = material(scene, "building-trim-" + building.id, palette.trim);
    const roof = material(scene, "building-roof-" + building.id, palette.roof);
    const accent = material(scene, "building-accent-" + building.id, palette.accent);
    const frontX = building.side === "west" ? building.x + building.width / 2 : building.x - building.width / 2;
    const height = building.floors * 3.35;
    const body = MeshBuilder.CreateBox("building-shell-" + building.id, {
      width: building.width, height, depth: building.depth
    }, scene);
    body.position.set(building.x, height / 2, building.z);
    body.material = wall;
    body.isPickable = false;

    const plinth = MeshBuilder.CreateBox("building-plinth-" + building.id, {
      width: building.width + 0.25, height: 0.35, depth: building.depth + 0.25
    }, scene);
    plinth.position.set(building.x, 0.18, building.z);
    plinth.material = trim;
    plinth.isPickable = false;

    const parapet = MeshBuilder.CreateBox("building-parapet-" + building.id, {
      width: building.width + 0.12, height: 0.42, depth: building.depth + 0.12
    }, scene);
    parapet.position.set(building.x, height + 0.2, building.z);
    parapet.material = roof;
    parapet.isPickable = false;

    const door = MeshBuilder.CreateBox("building-door-" + building.id, {
      width: 1.25, height: 2.35, depth: 0.12
    }, scene);
    door.position.set(frontX + (building.side === "west" ? -0.08 : 0.08), 1.18, building.z);
    door.rotation.y = building.side === "west" ? Math.PI / 2 : -Math.PI / 2;
    door.material = accent;
    door.isPickable = false;

    const windowMaterial = material(scene, "building-glass-" + building.id, "#527b82");
    windowMaterial.alpha = 0.78;
    const windowCount = Math.max(1, Math.min(4, Math.floor(building.width / 2.8)));
    for (let floorIndex = 0; floorIndex < building.floors; floorIndex += 1) {
      const floorBase = floorIndex * 3.35;
      for (let index = 0; index < windowCount; index += 1) {
        const window = MeshBuilder.CreateBox("building-window-" + building.id + "-" + floorIndex + "-" + index, {
          width: 1.35, height: 1.1, depth: 0.1
        }, scene);
        const offsetZ = (index - (windowCount - 1) / 2) * (building.width / (windowCount + 0.5));
        window.position.set(frontX, floorBase + 2.35, building.z + offsetZ);
        window.rotation.y = building.side === "west" ? Math.PI / 2 : -Math.PI / 2;
        window.material = windowMaterial;
        window.isPickable = false;
        const lintel = MeshBuilder.CreateBox("building-window-trim-" + building.id + "-" + floorIndex + "-" + index, {
          width: 1.52, height: 0.1, depth: 0.2
        }, scene);
        lintel.position.set(frontX + (building.side === "west" ? -0.07 : 0.07), floorBase + 2.95, window.position.z);
        lintel.rotation.y = window.rotation.y;
        lintel.material = trim;
        lintel.isPickable = false;
      }

      // Upper-floor balconies make apartments, guest houses and offices read
      // as occupied multi-storey buildings instead of single-storey boxes.
      if (floorIndex > 0 && (building.exteriorStyle === "modern" || building.exteriorStyle === "coastal")) {
        const outward = building.side === "west" ? 1 : -1;
        const balconyX = frontX + outward * 0.62;
        const balcony = MeshBuilder.CreateBox("building-balcony-floor-" + building.id + "-" + floorIndex, {
          width: 1.15, height: 0.14, depth: building.width * 0.68
        }, scene);
        balcony.position.set(balconyX, floorBase + 0.36, building.z);
        balcony.material = trim;
        balcony.isPickable = false;
        const rail = MeshBuilder.CreateBox("building-balcony-rail-" + building.id + "-" + floorIndex, {
          width: 0.09, height: 0.82, depth: building.width * 0.68
        }, scene);
        rail.position.set(balconyX + outward * 0.52, floorBase + 0.82, building.z);
        rail.material = accent;
        rail.isPickable = false;
        for (const postSide of [-1, 1]) {
          const post = MeshBuilder.CreateBox("building-balcony-post-" + building.id + "-" + floorIndex + "-" + postSide, {
            width: 0.12, height: 0.9, depth: 0.12
          }, scene);
          post.position.set(balconyX + outward * 0.52, floorBase + 0.82, building.z + postSide * building.width * 0.34);
          post.material = trim;
          post.isPickable = false;
        }
      }
    }

    if (building.exteriorStyle === "market" || building.exteriorStyle === "coastal") {
      const awning = MeshBuilder.CreateBox("building-awning-" + building.id, {
        width: 2.1, height: 0.16, depth: building.width * 0.72
      }, scene);
      awning.position.set(frontX + (building.side === "west" ? -0.9 : 0.9), 2.85, building.z);
      awning.rotation.y = building.side === "west" ? Math.PI / 2 : -Math.PI / 2;
      awning.material = accent;
      awning.isPickable = false;
    }
    addSign(scene, building, frontX + (building.side === "west" ? -0.16 : 0.16), height > 4 ? 3.8 : 3.25, building.z, palette);

    // Low-detail compound walls and gate piers distinguish family compounds
    // from commercial frontages without adding expensive decorative meshes.
    if (building.use === "compound_house") {
      for (const edge of [-1, 1]) {
        const pier = MeshBuilder.CreateBox("compound-gate-pier-" + building.id + "-" + edge, {
          width: 0.55, height: 1.7, depth: 0.55
        }, scene);
        pier.position.set(frontX + (building.side === "west" ? -1.2 : 1.2), 0.85, building.z + edge * building.depth * 0.38);
        pier.material = trim;
        pier.isPickable = false;
      }
      const gate = MeshBuilder.CreateBox("compound-gate-" + building.id, {
        width: 1.8, height: 1.25, depth: 0.12
      }, scene);
      gate.position.set(frontX + (building.side === "west" ? -1.2 : 1.2), 0.72, building.z);
      gate.rotation.y = building.side === "west" ? Math.PI / 2 : -Math.PI / 2;
      gate.material = roof;
      gate.isPickable = false;
    }

    if (building.use === "event_venue") {
      const domeMaterial = material(scene, "creative-centre-dome", "#263d49");
      const glassMaterial = material(scene, "creative-centre-glass", "#5b9aa5");
      const goldMaterial = material(scene, "creative-centre-gold", "#d4a84f");
      const dome = MeshBuilder.CreateSphere("creative-centre-roof-dome", { diameter: 1, segments: 32, slice: 0.5 }, scene);
      dome.scaling.set(building.width * 0.52, 15, building.depth * 0.52);
      dome.position.set(building.x, 7.15, building.z);
      dome.material = domeMaterial;
      dome.isPickable = false;
      const glassFront = MeshBuilder.CreateBox("creative-centre-glass-front", { width: building.width * 0.72, height: 7.2, depth: 0.42 }, scene);
      glassFront.position.set(building.x, 4.1, building.z + building.depth / 2 + 0.24);
      glassFront.material = glassMaterial;
      glassFront.isPickable = false;
      const entranceCanopy = MeshBuilder.CreateBox("creative-centre-entry-canopy", { width: 22, height: 0.65, depth: 7 }, scene);
      entranceCanopy.position.set(building.x, 7.2, building.z + building.depth / 2 + 3.2);
      entranceCanopy.material = goldMaterial;
      entranceCanopy.isPickable = false;
      for (const side of [-1, 1]) {
        const column = MeshBuilder.CreateCylinder("creative-centre-entry-column-" + side, { height: 7, diameter: 0.8, tessellation: 12 }, scene);
        column.position.set(building.x - building.width / 2 - 5.5, 3.5, building.z + side * 10);
        column.material = goldMaterial;
        column.isPickable = false;
        const ledPanel = MeshBuilder.CreateBox("creative-centre-led-panel-" + side, { width: 1.1, height: 5.5, depth: 0.25 }, scene);
        ledPanel.position.set(building.x - building.width / 2 - 0.5, 5.4, building.z + side * (building.depth / 2 - 1));
        ledPanel.material = glassMaterial;
        ledPanel.isPickable = false;
      }
      const forecourt = MeshBuilder.CreateGround("creative-centre-forecourt", { width: building.width + 30, height: 22 }, scene);
      forecourt.position.set(building.x, 0.035, building.z + building.depth / 2 + 14);
      forecourt.material = material(scene, "creative-centre-forecourt", "#8d8d82");
      forecourt.isPickable = false;
    }

    solidAreas.push({
      x: building.x,
      z: building.z,
      halfWidth: building.width / 2 + 0.2,
      halfDepth: building.depth / 2 + 0.2
    });
  }
  return { buildings: DISTRICT_BUILDINGS, solidAreas };
}

export function isBuildingCatalogueValid(): boolean {
  const ids = new Set(DISTRICT_BUILDINGS.map((building) => building.id));
  const coveredDistricts = new Set(DISTRICT_BUILDINGS.map((building) => building.districtId));
  const anchorIds = new Set(GREATER_ACCRA_REGION_ANCHORS.map((anchor) => anchor.regionId));
  return ids.size === DISTRICT_BUILDINGS.length &&
    DISTRICT_BUILDINGS.length >= 20 &&
    coveredDistricts.size === 12 &&
    DISTRICT_BUILDINGS.every((building) => {
      const anchor = GREATER_ACCRA_REGION_ANCHORS.find((item) => item.regionId === building.districtId);
      return building.id.length > 0 && building.name.length > 0 &&
        anchorIds.has(building.districtId) && !!anchor &&
        (building.side === "west" ? building.x < anchor.x : building.x > anchor.x) &&
        Number.isFinite(building.x) && Number.isFinite(building.z) &&
        building.width >= 6 && building.depth >= 6 &&
        building.floors >= 1 && building.floors <= 5 &&
        (building.interiorId === undefined || building.interiorId.length > 0);
    }) &&
    ["provisions", "pharmacy", "salon", "food", "workshop", "office", "compound_house", "apartment", "market_stall", "guest_house", "clinic", "event_venue"]
      .every((use) => DISTRICT_BUILDINGS.some((building) => building.use === use));
}

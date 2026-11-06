import { DISTRICT_BUILDINGS, isBuildingCatalogueValid } from "./ghanaianStreetBuildings";
import { DISTRICT_PROPERTIES, isDistrictPropertyCatalogueValid } from "./districtProperties";
import { INTERIOR_BLUEPRINTS, isInteriorBlueprintCatalogueValid } from "./interiorBlueprints";
import { GREATER_ACCRA_REGION_ANCHORS } from "./greaterAccraLayout";

/** Fail-fast integrity checks for Stage 6 world content before the scene starts. */
export function runStage6SmokeChecks(): void {
  if (!isBuildingCatalogueValid()) throw new Error("Stage 6 building catalogue failed structural validation.");
  if (!isInteriorBlueprintCatalogueValid()) throw new Error("Stage 6 interior blueprint catalogue failed structural validation.");
  if (!isDistrictPropertyCatalogueValid()) throw new Error("Stage 6 property directory failed structural validation.");

  const blueprintIds = new Set(INTERIOR_BLUEPRINTS.map((blueprint) => blueprint.id));
  const buildingIds = new Set(DISTRICT_BUILDINGS.map((building) => building.id));
  const anchorIds = new Set(GREATER_ACCRA_REGION_ANCHORS.map((anchor) => anchor.regionId));
  const propertyByBuilding = new Map(DISTRICT_PROPERTIES.map((property) => [property.buildingId, property]));

  for (const building of DISTRICT_BUILDINGS) {
    if (!anchorIds.has(building.districtId)) throw new Error("Building " + building.id + " references an unknown district anchor.");
    if (building.interiorId && !blueprintIds.has(building.interiorId)) {
      throw new Error("Building " + building.id + " references missing interior " + building.interiorId + ".");
    }
    const property = propertyByBuilding.get(building.id);
    if (!property || property.displayName !== building.name || property.use !== building.use) {
      throw new Error("Building/property directory mismatch for " + building.id + ".");
    }
  }

  if (propertyByBuilding.size !== buildingIds.size ||
      DISTRICT_PROPERTIES.some((property) => !buildingIds.has(property.buildingId))) {
    throw new Error("Stage 6 property directory is not a one-to-one mirror of the building catalogue.");
  }

  // Keep every building footprint physically separate in the compact block.
  for (let leftIndex = 0; leftIndex < DISTRICT_BUILDINGS.length; leftIndex += 1) {
    const left = DISTRICT_BUILDINGS[leftIndex];
    for (let rightIndex = leftIndex + 1; rightIndex < DISTRICT_BUILDINGS.length; rightIndex += 1) {
      const right = DISTRICT_BUILDINGS[rightIndex];
      const separatedX = Math.abs(left.x - right.x) >= (left.width + right.width) / 2 + 0.4;
      const separatedZ = Math.abs(left.z - right.z) >= (left.depth + right.depth) / 2 + 0.4;
      if (!separatedX && !separatedZ) {
        throw new Error("Building footprints overlap: " + left.id + " and " + right.id + ".");
      }
    }
  }
}

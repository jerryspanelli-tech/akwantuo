import { DISTRICT_BUILDINGS, type BuildingUse } from "./ghanaianStreetBuildings";

export type PropertyRecord = Readonly<{
  id: string;
  buildingId: string;
  displayName: string;
  use: BuildingUse;
  ownerType: "resident" | "local_business" | "public_service";
  occupancy: "occupied";
  playerTransferEnabled: false;
  interiorId: string | null;
}>;

/**
 * Stage 6 property directory. This is descriptive world data only: no purchase,
 * rent, ownership transfer or valuable state is granted by the browser.
 * Those actions must wait for the trusted server and economy stages.
 */
export const DISTRICT_PROPERTIES: readonly PropertyRecord[] = DISTRICT_BUILDINGS.map((building) => ({
  id: "property-" + building.id,
  buildingId: building.id,
  displayName: building.name,
  use: building.use,
  ownerType: building.use === "clinic" || building.use === "office"
    ? "public_service"
    : building.use === "compound_house" || building.use === "apartment" || building.use === "guest_house"
      ? "resident"
      : "local_business",
  occupancy: "occupied",
  playerTransferEnabled: false,
  interiorId: building.interiorId ?? null
}));

export function isDistrictPropertyCatalogueValid(): boolean {
  const ids = new Set(DISTRICT_PROPERTIES.map((property) => property.id));
  const buildingIds = new Set(DISTRICT_BUILDINGS.map((building) => building.id));
  return ids.size === DISTRICT_PROPERTIES.length &&
    DISTRICT_PROPERTIES.length === DISTRICT_BUILDINGS.length &&
    DISTRICT_PROPERTIES.every((property) =>
      buildingIds.has(property.buildingId) &&
      property.displayName.length > 0 &&
      property.playerTransferEnabled === false &&
      property.occupancy === "occupied" &&
      (property.interiorId === null || property.interiorId.length > 0)
    );
}

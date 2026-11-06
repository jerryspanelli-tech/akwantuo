import { DISTRICT_BUILDINGS, type BuildingUse } from "./ghanaianStreetBuildings";

export type BusinessCategory =
  | "convenience_retail"
  | "pharmacy"
  | "personal_care"
  | "food_service"
  | "vehicle_service"
  | "professional_office"
  | "market_retail"
  | "hospitality"
  | "health_service";

export type DistrictBusiness = Readonly<{
  id: string;
  buildingId: string;
  districtId: string;
  displayName: string;
  category: BusinessCategory;
  services: readonly string[];
  staffRole: string;
  opensAt: string;
  closesAt: string;
  openDays: readonly ("mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun")[];
  access: "public" | "appointment";
  status: "prototype";
}>;

type BusinessProfile = Omit<DistrictBusiness, "id" | "buildingId" | "districtId" | "displayName" | "status">;

const DAILY: DistrictBusiness["openDays"] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const WEEKDAYS_AND_SATURDAY: DistrictBusiness["openDays"] = ["mon", "tue", "wed", "thu", "fri", "sat"];

const BUSINESS_PROFILES: Record<BuildingUse, BusinessProfile | null> = {
  provisions: {
    category: "convenience_retail", services: ["groceries", "drinks", "household essentials"],
    staffRole: "shopkeeper", opensAt: "07:00", closesAt: "21:00", openDays: DAILY, access: "public"
  },
  pharmacy: {
    category: "pharmacy", services: ["over-the-counter medicines", "health essentials"],
    staffRole: "pharmacy attendant", opensAt: "08:00", closesAt: "20:00", openDays: WEEKDAYS_AND_SATURDAY, access: "public"
  },
  salon: {
    category: "personal_care", services: ["haircut", "hair styling", "braiding"],
    staffRole: "barber or hairdresser", opensAt: "09:00", closesAt: "19:00", openDays: WEEKDAYS_AND_SATURDAY, access: "public"
  },
  food: {
    category: "food_service", services: ["local meals", "takeaway", "soft drinks"],
    staffRole: "cook or food vendor", opensAt: "08:00", closesAt: "22:00", openDays: DAILY, access: "public"
  },
  workshop: {
    category: "vehicle_service", services: ["vehicle inspection", "basic repairs", "servicing"],
    staffRole: "mechanic", opensAt: "08:00", closesAt: "18:00", openDays: WEEKDAYS_AND_SATURDAY, access: "public"
  },
  office: {
    category: "professional_office", services: ["customer enquiries", "administrative services"],
    staffRole: "office administrator", opensAt: "08:00", closesAt: "17:00", openDays: WEEKDAYS_AND_SATURDAY, access: "appointment"
  },
  compound_house: null,
  apartment: null,
  market_stall: {
    category: "market_retail", services: ["market goods", "produce", "household wares"],
    staffRole: "market trader", opensAt: "06:00", closesAt: "18:00", openDays: DAILY, access: "public"
  },
  guest_house: {
    category: "hospitality", services: ["guest rooms", "check-in", "guest assistance"],
    staffRole: "guest-house attendant", opensAt: "00:00", closesAt: "23:59", openDays: DAILY, access: "public"
  },
  clinic: {
    category: "health_service", services: ["basic consultation", "first aid", "patient reception"],
    staffRole: "health worker", opensAt: "08:00", closesAt: "18:00", openDays: WEEKDAYS_AND_SATURDAY, access: "public"
  }
};

/**
 * First-release business directory. Hours and services are illustrative game
 * content, not real-world listings or promises of medical/financial service.
 */
export const DISTRICT_BUSINESSES: readonly DistrictBusiness[] = DISTRICT_BUILDINGS.flatMap((building) => {
  const profile = BUSINESS_PROFILES[building.use];
  return profile ? [{
    ...profile,
    id: "business-" + building.id,
    buildingId: building.id,
    districtId: building.districtId,
    displayName: building.name,
    status: "prototype" as const
  }] : [];
});

export function isDistrictBusinessCatalogueValid(): boolean {
  const ids = new Set(DISTRICT_BUSINESSES.map((business) => business.id));
  const buildingIds = new Set(DISTRICT_BUILDINGS.map((building) => building.id));
  const hasValidClock = (value: string): boolean => /^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(value);
  return ids.size === DISTRICT_BUSINESSES.length &&
    DISTRICT_BUSINESSES.length > 0 &&
    DISTRICT_BUSINESSES.every((business) =>
      buildingIds.has(business.buildingId) &&
      business.id === "business-" + business.buildingId &&
      business.displayName.length > 0 &&
      business.services.length > 0 &&
      business.staffRole.length > 0 &&
      hasValidClock(business.opensAt) &&
      hasValidClock(business.closesAt) &&
      business.openDays.length > 0
    ) &&
    DISTRICT_BUILDINGS.every((building) => {
      const hasBusiness = DISTRICT_BUSINESSES.some((business) => business.buildingId === building.id);
      const isResidential = building.use === "compound_house" || building.use === "apartment";
      return isResidential ? !hasBusiness : hasBusiness;
    });
}

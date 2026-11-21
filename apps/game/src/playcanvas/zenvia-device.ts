export type ZenviaModelId = "lite" | "plus" | "pro";

export interface ZenviaDeviceModel {
  id: ZenviaModelId;
  name: string;
  pricePesewas: number;
  tier: "Essential" | "Mid-range" | "Flagship";
  storage: string;
  camera: string;
  performance: string;
  exclusiveFeatures: string[];
}

export const ZENVIA_MODELS: readonly ZenviaDeviceModel[] = [
  {
    id: "lite",
    name: "Zenvia Lite",
    pricePesewas: 80000,
    tier: "Essential",
    storage: "32 GB",
    camera: "Basic photo capture",
    performance: "Everyday apps and core phone functions",
    exclusiveFeatures: ["Chale messaging", "Phone and contacts", "Camera", "WayGo navigation", "CediPay wallet"]
  },
  {
    id: "plus",
    name: "Zenvia Plus",
    pricePesewas: 200000,
    tier: "Mid-range",
    storage: "128 GB",
    camera: "Enhanced photo capture",
    performance: "Faster app switching and expanded multitasking",
    exclusiveFeatures: ["Everything in Lite", "Advanced camera tools", "Expanded app storage", "Multitasking"]
  },
  {
    id: "pro",
    name: "Zenvia Pro",
    pricePesewas: 450000,
    tier: "Flagship",
    storage: "512 GB",
    camera: "Premium photo and video capture",
    performance: "Best available performance and app capacity",
    exclusiveFeatures: ["Everything in Plus", "Premium camera tools", "Advanced personalization", "Exclusive Pro experiences"]
  }
] as const;

const DEVICE_MODEL_KEY = "akwantuo.zenvia.device-model.v1";

export function getZenviaModel(): ZenviaDeviceModel {
  let selected: string | null = null;
  try {
    selected = window.localStorage.getItem(DEVICE_MODEL_KEY);
  } catch {
    // A missing local preference safely falls back to the entry-level device.
  }
  return ZENVIA_MODELS.find(model => model.id === selected) ?? ZENVIA_MODELS[0];
}

export function formatZenviaPrice(pricePesewas: number): string {
  return `GH₵${(pricePesewas / 100).toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

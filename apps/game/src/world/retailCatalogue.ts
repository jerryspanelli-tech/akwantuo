export type RetailProductCategory = "soft_drink" | "water" | "energy_drink" | "malt" | "snack" | "confectionery" | "household";
export type RetailProduct = Readonly<{
  id: string;
  name: string;
  category: RetailProductCategory;
  pricePesewas: number;
  openingStock: number;
  display: "fridge" | "shelf" | "counter";
}>;

/** Fictional convenience-store goods. Names and identities are original game brands. */
export const AKWANTUO_RETAIL_PRODUCTS: readonly RetailProduct[] = [
  { id: "cola-classic", name: "KolaPop Classic", category: "soft_drink", pricePesewas: 1800, openingStock: 36, display: "fridge" },
  { id: "orange-fizz", name: "SunBurst Orange", category: "soft_drink", pricePesewas: 1800, openingStock: 30, display: "fridge" },
  { id: "lemon-lime", name: "LimeLift", category: "soft_drink", pricePesewas: 1800, openingStock: 24, display: "fridge" },
  { id: "berry-soda", name: "BerryPop", category: "soft_drink", pricePesewas: 2000, openingStock: 18, display: "fridge" },
  { id: "ginger-soda", name: "GingerKick", category: "soft_drink", pricePesewas: 1800, openingStock: 18, display: "fridge" },
  { id: "pure-water", name: "ClearSpring Water", category: "water", pricePesewas: 500, openingStock: 72, display: "fridge" },
  { id: "sparkling-water", name: "AquaSpark", category: "water", pricePesewas: 1500, openingStock: 18, display: "fridge" },
  { id: "energy-voltage", name: "VoltRush Energy", category: "energy_drink", pricePesewas: 3000, openingStock: 20, display: "fridge" },
  { id: "malt-rich", name: "MaltMellow", category: "malt", pricePesewas: 2500, openingStock: 24, display: "fridge" },
  { id: "iced-tea", name: "TeaWave", category: "soft_drink", pricePesewas: 2200, openingStock: 16, display: "fridge" },
  { id: "plantain-chips", name: "Crunchy Plantain Bites", category: "snack", pricePesewas: 1200, openingStock: 28, display: "shelf" },
  { id: "peanut-snack", name: "Nutty Gold", category: "snack", pricePesewas: 1000, openingStock: 24, display: "shelf" },
  { id: "spicy-crisps", name: "PepperTwist Crisps", category: "snack", pricePesewas: 1500, openingStock: 24, display: "shelf" },
  { id: "salt-crackers", name: "SnapSalt Crackers", category: "snack", pricePesewas: 900, openingStock: 30, display: "shelf" },
  { id: "choco-bar", name: "ChocoDash Bar", category: "confectionery", pricePesewas: 1200, openingStock: 30, display: "counter" },
  { id: "mint-sweets", name: "CoolMint Drops", category: "confectionery", pricePesewas: 700, openingStock: 40, display: "counter" },
  { id: "vanilla-biscuits", name: "Golden Crumb Biscuits", category: "snack", pricePesewas: 1400, openingStock: 22, display: "shelf" },
  { id: "tissue-pack", name: "SoftFold Tissues", category: "household", pricePesewas: 1800, openingStock: 16, display: "shelf" },
  { id: "soap-bar", name: "FreshPalm Soap", category: "household", pricePesewas: 1600, openingStock: 18, display: "shelf" }
] as const;

export function isAkwantuoRetailCatalogueValid(): boolean {
  const ids = new Set(AKWANTUO_RETAIL_PRODUCTS.map((item) => item.id));
  return ids.size === AKWANTUO_RETAIL_PRODUCTS.length &&
    AKWANTUO_RETAIL_PRODUCTS.length >= 15 &&
    AKWANTUO_RETAIL_PRODUCTS.every((item) =>
      item.id.length > 0 && item.name.length > 0 &&
      Number.isSafeInteger(item.pricePesewas) && item.pricePesewas > 0 &&
      Number.isInteger(item.openingStock) && item.openingStock > 0
    );
}

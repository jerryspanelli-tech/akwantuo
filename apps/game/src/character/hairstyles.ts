/** Hairstyle catalogue foundations for AKWANTUO.
 * Starter styles appear in character creation. The larger catalogue is reserved
 * for barber and salon businesses; prices are fictional in-game GH₵ values.
 */
export type HairstyleCategory = "barber" | "salon" | "natural" | "protective";
export type HairstyleAudience = "masculine" | "feminine" | "all";

export type HairstylePreset = {
  id: string;
  label: string;
  category: HairstyleCategory;
  audience: HairstyleAudience;
  priceCedis: number;
};

export const STARTER_HAIRSTYLE_IDS = [
  "short-natural",
  "low-cut",
  "fade",
  "afro"
] as const;

export const BARBERSHOP_HAIRSTYLES: readonly HairstylePreset[] = [
  { id: "short-natural", label: "Short natural", category: "natural", audience: "all", priceCedis: 0 },
  { id: "low-cut", label: "Low cut", category: "barber", audience: "masculine", priceCedis: 15 },
  { id: "fade", label: "Classic fade", category: "barber", audience: "masculine", priceCedis: 25 },
  { id: "high-fade", label: "High fade", category: "barber", audience: "masculine", priceCedis: 30 },
  { id: "low-fade", label: "Low fade", category: "barber", audience: "masculine", priceCedis: 30 },
  { id: "mid-fade", label: "Mid fade", category: "barber", audience: "masculine", priceCedis: 30 },
  { id: "skin-fade", label: "Skin fade", category: "barber", audience: "masculine", priceCedis: 35 },
  { id: "taper-fade", label: "Taper fade", category: "barber", audience: "all", priceCedis: 30 },
  { id: "waves", label: "Waves", category: "barber", audience: "masculine", priceCedis: 35 },
  { id: "line-up", label: "Shape-up / line-up", category: "barber", audience: "masculine", priceCedis: 15 },
  { id: "afro", label: "Natural afro", category: "natural", audience: "all", priceCedis: 25 },
  { id: "twists", label: "Two-strand twists", category: "natural", audience: "all", priceCedis: 45 },
  { id: "starter-locs", label: "Starter locs", category: "natural", audience: "all", priceCedis: 60 },
  { id: "locs", label: "Locs", category: "natural", audience: "all", priceCedis: 50 },
  { id: "cornrows", label: "Cornrows", category: "protective", audience: "all", priceCedis: 45 },
  { id: "box-braids", label: "Box braids", category: "protective", audience: "feminine", priceCedis: 90 },
  { id: "knotless-braids", label: "Knotless braids", category: "protective", audience: "feminine", priceCedis: 110 },
  { id: "ghana-braids", label: "Ghana braids", category: "protective", audience: "feminine", priceCedis: 80 },
  { id: "feed-in-cornrows", label: "Feed-in cornrows", category: "protective", audience: "feminine", priceCedis: 85 },
  { id: "fulani-braids", label: "Fulani braids", category: "protective", audience: "feminine", priceCedis: 120 },
  { id: "faux-locs", label: "Faux locs", category: "protective", audience: "feminine", priceCedis: 120 },
  { id: "passion-twists", label: "Passion twists", category: "protective", audience: "feminine", priceCedis: 110 },
  { id: "wig-install", label: "Wig installation", category: "salon", audience: "feminine", priceCedis: 100 },
  { id: "natural-bun", label: "Natural bun", category: "salon", audience: "feminine", priceCedis: 35 },
  { id: "covered", label: "Head covering", category: "natural", audience: "all", priceCedis: 0 }
] as const;

export function getHairstyle(id: string): HairstylePreset | undefined {
  return BARBERSHOP_HAIRSTYLES.find((style) => style.id === id);
}

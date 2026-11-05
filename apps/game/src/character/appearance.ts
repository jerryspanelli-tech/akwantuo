import { BARBERSHOP_HAIRSTYLES } from "./hairstyles";

import { BARBERSHOP_HAIRSTYLES } from "./hairstyles";\n\n/** Shared appearance data for the first AKWANTUO character creator.
 * Values here describe presentation only; they never grant gameplay privileges.
 */

export type CharacterPresentation = "masculine" | "feminine";

export type CharacterAppearance = {
  presentation: CharacterPresentation;
  age: number;
  complexionId: string;
  bodyBuild: "slim" | "average" | "broad";
  hairstyleId: string;
  outfitId: string;
};

export type ComplexionPreset = {
  id: string;
  label: string;
  /** Hex colour used by the avatar material. */
  color: string;
};

export type OutfitPreset = {
  id: string;
  label: string;
  category: "casual" | "traditional" | "workwear";
  topColor: string;
  trouserColor: string;
};

export const COMPLEXIONS: readonly ComplexionPreset[] = [
  { id: "deep", label: "Deep brown", color: "#59301f" },
  { id: "dark", label: "Dark brown", color: "#75452e" },
  { id: "medium", label: "Medium brown", color: "#986447" },
  { id: "golden", label: "Golden brown", color: "#b77e55" },
  { id: "light", label: "Light brown", color: "#d09a70" }
];

export const OUTFITS: readonly OutfitPreset[] = [
  { id: "street-green", label: "Accra streetwear", category: "casual", topColor: "#285747", trouserColor: "#252a2d" },
  { id: "street-blue", label: "Everyday casual", category: "casual", topColor: "#345b83", trouserColor: "#303238" },
  { id: "fugu", label: "Northern fugu-inspired", category: "traditional", topColor: "#d0b77d", trouserColor: "#39332b" },
  { id: "kente", label: "Kente-inspired", category: "traditional", topColor: "#a94b27", trouserColor: "#252525" },
  { id: "workwear", label: "Workwear", category: "workwear", topColor: "#b18a45", trouserColor: "#343b36" }
];

export const DEFAULT_APPEARANCE: Readonly<CharacterAppearance> = {
  presentation: "masculine",
  age: 25,
  complexionId: "dark",
  bodyBuild: "average",
  hairstyleId: "short-natural",
  outfitId: "street-green"
};

const complexionIds = new Set(COMPLEXIONS.map((preset) => preset.id));
const outfitIds = new Set(OUTFITS.map((preset) => preset.id));
const hairstyleIds = new Set(BARBERSHOP_HAIRSTYLES.map((style) => style.id));

export function validateAppearance(value: unknown): value is CharacterAppearance {
  if (!value || typeof value !== "object") return false;
  const appearance = value as Partial<CharacterAppearance>;
  return (
    (appearance.presentation === "masculine" || appearance.presentation === "feminine") &&
    Number.isInteger(appearance.age) && (appearance.age as number) >= 18 && (appearance.age as number) <= 80 &&
    typeof appearance.complexionId === "string" && complexionIds.has(appearance.complexionId) &&
    (appearance.bodyBuild === "slim" || appearance.bodyBuild === "average" || appearance.bodyBuild === "broad") &&
    typeof appearance.hairstyleId === "string" && hairstyleIds.has(appearance.hairstyleId) &&
    typeof appearance.outfitId === "string" && outfitIds.has(appearance.outfitId)
  );
}

export function resolveAppearance(value: unknown): CharacterAppearance {
  if (!validateAppearance(value)) return { ...DEFAULT_APPEARANCE };
  return { ...value };
}

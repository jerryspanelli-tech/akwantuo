import type { CharacterAppearance, CharacterPresentation } from "./appearance";
import { BARBERSHOP_HAIRSTYLES, getHairstyle, type HairstylePreset } from "./hairstyles";

export type HairstyleQuote = {
  style: HairstylePreset;
  priceCedis: number;
  alreadyWearing: boolean;
};

/** Return styles appropriate to the selected character presentation. */
export function getSalonCatalogue(presentation: CharacterPresentation): HairstylePreset[] {
  return BARBERSHOP_HAIRSTYLES.filter(
    (style) => style.audience === "all" || style.audience === presentation
  );
}

/** Quote a style before a future server-authoritative in-game payment. */
export function quoteHairstyle(
  current: CharacterAppearance,
  hairstyleId: string
): HairstyleQuote | null {
  const style = getHairstyle(hairstyleId);
  if (!style || (style.audience !== "all" && style.audience !== current.presentation)) return null;
  const alreadyWearing = current.hairstyleId === style.id;
  return {
    style,
    priceCedis: alreadyWearing ? 0 : style.priceCedis,
    alreadyWearing
  };
}

/** Apply a selected style to an appearance record; payment is intentionally separate. */
export function withHairstyle(
  current: CharacterAppearance,
  hairstyleId: string
): CharacterAppearance | null {
  const quote = quoteHairstyle(current, hairstyleId);
  return quote ? { ...current, hairstyleId: quote.style.id } : null;
}

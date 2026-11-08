import { resolveAppearance, type CharacterAppearance } from "./appearance";

/** Read the current character-creator fields into a validated appearance. */
export function readAppearanceForm(form: HTMLFormElement): CharacterAppearance {
  const data = new FormData(form);
  return resolveAppearance({
    presentation: data.get("presentation"), age: Number(data.get("age")),
    complexionId: data.get("complexion"), bodyBuild: data.get("build"),
    hairstyleId: data.get("hairstyle"), outfitId: data.get("outfit")
  });
}

export function fillAppearanceForm(form: HTMLFormElement, appearance: CharacterAppearance): void {
  const values: Record<string, string> = {
    presentation: appearance.presentation, age: String(appearance.age),
    complexion: appearance.complexionId, build: appearance.bodyBuild,
    hairstyle: appearance.hairstyleId, outfit: appearance.outfitId
  };
  for (const [name, value] of Object.entries(values)) {
    const field = form.elements.namedItem(name);
    if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement) field.value = value;
  }
}

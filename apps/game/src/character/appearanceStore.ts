import { DEFAULT_APPEARANCE, resolveAppearance, type CharacterAppearance } from "./appearance";

export const APPEARANCE_STORAGE_KEY = "akwantuo.character-appearance.v1";

/** Load the same appearance record used by character creation and salon visits. */
export function loadAppearance(storage: Pick<Storage, "getItem">): CharacterAppearance {
  try {
    const saved = storage.getItem(APPEARANCE_STORAGE_KEY);
    return saved ? resolveAppearance(JSON.parse(saved) as unknown) : resolveAppearance(DEFAULT_APPEARANCE);
  } catch {
    return resolveAppearance(DEFAULT_APPEARANCE);
  }
}

/** Persist appearance locally; return false when browser storage is unavailable. */
export function saveAppearance(
  appearance: CharacterAppearance,
  storage: Pick<Storage, "setItem">
): boolean {
  try {
    storage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(resolveAppearance(appearance)));
    return true;
  } catch {
    return false;
  }
}

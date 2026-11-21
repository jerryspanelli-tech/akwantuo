/**
 * Persistent single-player world clock.
 *
 * The first local save starts at 08:00 game time. The clock advances at 60x,
 * including while the browser is closed. Multiplayer must replace this local
 * fallback with a server-authoritative timestamp; clients must never decide
 * shared world time from their own device clocks.
 */
const STORAGE_KEY = "akwantuo.world-clock.v1";
const DAY_SECONDS = 24 * 60 * 60;
const GAME_TIME_SCALE = 60;
const INITIAL_WORLD_TIME_SECONDS = 8 * 60 * 60;

type SavedWorldClock = {
  version: 1;
  worldSeconds: number;
  savedAtEpochMs: number;
};

const wrapDay = (seconds: number): number =>
  ((seconds % DAY_SECONDS) + DAY_SECONDS) % DAY_SECONDS;

function readSave(): SavedWorldClock | null {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<SavedWorldClock>;
    if (value.version !== 1 ||
        typeof value.worldSeconds !== "number" || !Number.isFinite(value.worldSeconds) ||
        typeof value.savedAtEpochMs !== "number" || !Number.isFinite(value.savedAtEpochMs)) return null;
    return value as SavedWorldClock;
  } catch {
    return null;
  }
}

/** Restores and catches up the game clock after a reload or offline period. */
export function restoreWorldClock(nowEpochMs = Date.now()): number {
  const saved = readSave();
  if (!saved) return INITIAL_WORLD_TIME_SECONDS;
  const offlineSeconds = Math.max(0, (nowEpochMs - saved.savedAtEpochMs) / 1000);
  return wrapDay(saved.worldSeconds + offlineSeconds * GAME_TIME_SCALE);
}

/** Persist the current game time so it can continue while the game is closed. */
export function persistWorldClock(worldSeconds: number, nowEpochMs = Date.now()): void {
  try {
    const save: SavedWorldClock = {
      version: 1,
      worldSeconds: wrapDay(worldSeconds),
      savedAtEpochMs: nowEpochMs
    };
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(save));
  } catch {
    // Storage can be unavailable in private browsing or under quota pressure.
    // The active session clock continues; the next launch starts from its last save.
  }
}

export const WORLD_CLOCK_GAME_TIME_SCALE = GAME_TIME_SCALE;

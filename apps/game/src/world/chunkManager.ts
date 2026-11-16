/**
 * Spatial chunk lifecycle manager for the Greater Accra world.
 *
 * This module has no Babylon.js dependency: world builders provide the load
 * and dispose callbacks, keeping spatial policy independent from geometry.
 */

export interface WorldPosition {
  x: number;
  z: number;
}

export interface ChunkBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface ChunkHandle {
  dispose(): void | Promise<void>;
}

export interface ChunkManagerOptions {
  /** Width/depth of one square chunk in world metres. */
  chunkSize?: number;
  /** Radius from the player used to request chunks. */
  loadRadius?: number;
  /** Larger radius prevents rapid load/unload while crossing boundaries. */
  unloadRadius?: number;
  /** Limit simultaneous geometry construction to protect mobile devices. */
  maxConcurrentLoads?: number;
  /** Called once when a chunk enters the load radius. */
  loadChunk: (key: string, bounds: ChunkBounds) => ChunkHandle | void | Promise<ChunkHandle | void>;
  /** Optional notification hooks for diagnostics and loading UI. */
  onChunkLoaded?: (key: string) => void;
  onChunkUnloaded?: (key: string) => void;
  onChunkError?: (key: string, error: unknown) => void;
}

interface ChunkRecord {
  key: string;
  bounds: ChunkBounds;
}

function distanceSquaredToBounds(position: WorldPosition, bounds: ChunkBounds): number {
  const dx = position.x < bounds.minX
    ? bounds.minX - position.x
    : position.x > bounds.maxX ? position.x - bounds.maxX : 0;
  const dz = position.z < bounds.minZ
    ? bounds.minZ - position.z
    : position.z > bounds.maxZ ? position.z - bounds.maxZ : 0;
  return dx * dx + dz * dz;
}

/** Stable grid key for a world-space position. */
export function getChunkKey(position: WorldPosition, chunkSize = 600): string {
  if (!Number.isFinite(chunkSize) || chunkSize <= 0) {
    throw new RangeError("chunkSize must be a positive finite number");
  }
  const x = Math.floor(position.x / chunkSize);
  const z = Math.floor(position.z / chunkSize);
  return `${x}:${z}`;
}

/** World-space bounds for a grid key returned by getChunkKey. */
export function getChunkBounds(key: string, chunkSize = 600): ChunkBounds {
  if (!Number.isFinite(chunkSize) || chunkSize <= 0) {
    throw new RangeError("chunkSize must be a positive finite number");
  }
  const parts = key.split(":");
  if (parts.length !== 2) throw new TypeError(`Invalid chunk key: ${key}`);
  const x = Number(parts[0]);
  const z = Number(parts[1]);
  if (!Number.isInteger(x) || !Number.isInteger(z)) {
    throw new TypeError(`Invalid chunk key: ${key}`);
  }
  const minX = x * chunkSize;
  const minZ = z * chunkSize;
  return { minX, maxX: minX + chunkSize, minZ, maxZ: minZ + chunkSize };
}

/**
 * Loads nearby chunks and disposes chunks after they leave a wider unload
 * radius. Async completions are generation-safe: a chunk that finishes after
 * the player has moved away is immediately disposed instead of being retained.
 */
export class WorldChunkManager {
  private readonly chunkSize: number;
  private readonly loadRadius: number;
  private readonly unloadRadius: number;
  private readonly maxConcurrentLoads: number;
  private readonly loadChunk: ChunkManagerOptions["loadChunk"];
  private readonly onChunkLoaded?: ChunkManagerOptions["onChunkLoaded"];
  private readonly onChunkUnloaded?: ChunkManagerOptions["onChunkUnloaded"];
  private readonly onChunkError?: ChunkManagerOptions["onChunkError"];
  private readonly loaded = new Map<string, ChunkHandle | void>();
  private readonly pending = new Set<string>();
  private readonly queued = new Map<string, ChunkRecord>();
  private desired = new Map<string, ChunkRecord>();
  private activeLoads = 0;
  private disposed = false;

  constructor(options: ChunkManagerOptions) {
    this.chunkSize = options.chunkSize ?? 600;
    this.loadRadius = options.loadRadius ?? 850;
    this.unloadRadius = options.unloadRadius ?? Math.max(this.loadRadius + this.chunkSize, 1250);
    this.maxConcurrentLoads = Math.max(1, Math.floor(options.maxConcurrentLoads ?? 1));
    this.loadChunk = options.loadChunk;
    this.onChunkLoaded = options.onChunkLoaded;
    this.onChunkUnloaded = options.onChunkUnloaded;
    this.onChunkError = options.onChunkError;

    if (!Number.isFinite(this.chunkSize) || this.chunkSize <= 0) {
      throw new RangeError("chunkSize must be a positive finite number");
    }
    if (!Number.isFinite(this.loadRadius) || this.loadRadius < 0) {
      throw new RangeError("loadRadius must be a non-negative finite number");
    }
    if (!Number.isFinite(this.unloadRadius) || this.unloadRadius < this.loadRadius) {
      throw new RangeError("unloadRadius must be finite and >= loadRadius");
    }
  }

  /** Reconcile the active set against the player's latest world position. */
  update(position: WorldPosition): void {
    if (this.disposed) return;
    if (!Number.isFinite(position.x) || !Number.isFinite(position.z)) return;

    const nextDesired = this.collectWithinRadius(position, this.loadRadius);
    // Keep already-loaded chunks until they cross the larger unload radius.
    for (const [key, handle] of this.loaded) {
      if (nextDesired.has(key)) continue;
      const bounds = getChunkBounds(key, this.chunkSize);
      if (distanceSquaredToBounds(position, bounds) <= this.unloadRadius ** 2) {
        nextDesired.set(key, { key, bounds });
      } else {
        this.loaded.delete(key);
        void this.disposeHandle(key, handle);
      }
    }

    this.desired = nextDesired;
    // Rebuild queue order from the latest player position on every update.
    // Retaining old Map insertion order can make a single-worker mobile queue
    // finish stale, farther-away chunks before the chunks now nearest the player.
    this.queued.clear();
    for (const record of nextDesired.values()) {
      if (!this.loaded.has(record.key) && !this.pending.has(record.key)) {
        this.queued.set(record.key, record);
      }
    }
    this.pumpQueue();
  }

  /** Immediately releases all loaded chunks and prevents future work. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.desired.clear();
    this.queued.clear();
    for (const [key, handle] of this.loaded) {
      this.loaded.delete(key);
      void this.disposeHandle(key, handle);
    }
  }

  getLoadedChunkKeys(): string[] {
    return [...this.loaded.keys()];
  }

  getPendingChunkKeys(): string[] {
    return [...this.pending];
  }

  private collectWithinRadius(position: WorldPosition, radius: number): Map<string, ChunkRecord> {
    const result = new Map<string, ChunkRecord>();
    const minChunkX = Math.floor((position.x - radius) / this.chunkSize);
    const maxChunkX = Math.floor((position.x + radius) / this.chunkSize);
    const minChunkZ = Math.floor((position.z - radius) / this.chunkSize);
    const maxChunkZ = Math.floor((position.z + radius) / this.chunkSize);
    const radiusSquared = radius * radius;

    for (let x = minChunkX; x <= maxChunkX; x += 1) {
      for (let z = minChunkZ; z <= maxChunkZ; z += 1) {
        const key = `${x}:${z}`;
        const bounds = getChunkBounds(key, this.chunkSize);
        if (distanceSquaredToBounds(position, bounds) <= radiusSquared) {
          result.set(key, { key, bounds });
        }
      }
    }
    return new Map([...result.entries()].sort((a, b) =>
      distanceSquaredToBounds(position, a[1].bounds) - distanceSquaredToBounds(position, b[1].bounds)
    ));
  }

  private pumpQueue(): void {
    while (!this.disposed && this.activeLoads < this.maxConcurrentLoads && this.queued.size > 0) {
      const next = this.queued.entries().next().value as [string, ChunkRecord] | undefined;
      if (!next) return;
      const [key, record] = next;
      this.queued.delete(key);
      if (!this.desired.has(key) || this.loaded.has(key) || this.pending.has(key)) continue;
      this.pending.add(key);
      this.activeLoads += 1;
      void this.loadOne(record);
    }
  }

  private async loadOne(record: ChunkRecord): Promise<void> {
    const { key, bounds } = record;
    try {
      const handle = await this.loadChunk(key, bounds);
      if (this.disposed || !this.desired.has(key)) {
        await this.disposeHandle(key, handle);
      } else {
        this.loaded.set(key, handle);
        this.onChunkLoaded?.(key);
      }
    } catch (error) {
      this.onChunkError?.(key, error);
    } finally {
      this.pending.delete(key);
      this.activeLoads = Math.max(0, this.activeLoads - 1);
      this.pumpQueue();
    }
  }

  private async disposeHandle(key: string, handle: ChunkHandle | void): Promise<void> {
    try {
      await handle?.dispose();
      this.onChunkUnloaded?.(key);
    } catch (error) {
      this.onChunkError?.(key, error);
    }
  }
}

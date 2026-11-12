export const RUNTIME_PHASES = [
  "boot",
  "configured",
  "engine-ready",
  "core-assets-ready",
  "world-ready",
  "player-ready",
  "online-ready",
  "playable",
  "failed",
  "disposed"
] as const;

export type RuntimePhase = (typeof RUNTIME_PHASES)[number];

const TRANSITIONS: Readonly<Record<RuntimePhase, readonly RuntimePhase[]>> = {
  boot: ["configured", "failed", "disposed"],
  configured: ["engine-ready", "failed", "disposed"],
  "engine-ready": ["core-assets-ready", "failed", "disposed"],
  "core-assets-ready": ["world-ready", "failed", "disposed"],
  "world-ready": ["player-ready", "failed", "disposed"],
  "player-ready": ["online-ready", "playable", "failed", "disposed"],
  "online-ready": ["playable", "failed", "disposed"],
  playable: ["failed", "disposed"],
  failed: ["disposed"],
  disposed: []
};

export interface RuntimePhaseChange {
  readonly previous: RuntimePhase;
  readonly current: RuntimePhase;
  readonly at: number;
}

export class RuntimeLifecycle {
  #phase: RuntimePhase = "boot";
  #controller = new AbortController();
  #cleanup: Array<() => void | Promise<void>> = [];
  #listeners = new Set<(change: RuntimePhaseChange) => void>();
  #disposePromise: Promise<void> | null = null;

  get phase(): RuntimePhase {
    return this.#phase;
  }

  get signal(): AbortSignal {
    return this.#controller.signal;
  }

  get isDisposed(): boolean {
    return this.#phase === "disposed";
  }

  transition(next: RuntimePhase): RuntimePhaseChange {
    if (!TRANSITIONS[this.#phase].includes(next)) {
      throw new Error(`Invalid runtime transition: ${this.#phase} -> ${next}`);
    }

    const change: RuntimePhaseChange = {
      previous: this.#phase,
      current: next,
      at: Date.now()
    };
    this.#phase = next;
    for (const listener of this.#listeners) listener(change);
    return change;
  }

  subscribe(listener: (change: RuntimePhaseChange) => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  addCleanup(cleanup: () => void | Promise<void>): () => void {
    if (this.isDisposed) {
      void Promise.resolve(cleanup());
      return () => undefined;
    }
    this.#cleanup.push(cleanup);
    return () => {
      const index = this.#cleanup.indexOf(cleanup);
      if (index >= 0) this.#cleanup.splice(index, 1);
    };
  }

  async dispose(reason = "Runtime disposed"): Promise<void> {
    if (this.#disposePromise) return this.#disposePromise;

    this.#controller.abort(reason);
    if (this.#phase !== "disposed") {
      const change: RuntimePhaseChange = {
        previous: this.#phase,
        current: "disposed",
        at: Date.now()
      };
      this.#phase = "disposed";
      for (const listener of this.#listeners) listener(change);
    }

    this.#disposePromise = (async () => {
      const cleanup = this.#cleanup.splice(0).reverse();
      const failures: unknown[] = [];
      for (const release of cleanup) {
        try {
          await release();
        } catch (error) {
          failures.push(error);
        }
      }
      this.#listeners.clear();
      if (failures.length) {
        throw new AggregateError(failures, "One or more runtime cleanup tasks failed");
      }
    })();

    return this.#disposePromise;
  }
}

export class RuntimeTimeoutError extends Error {
  readonly timeoutMs: number;

  constructor(operation: string, timeoutMs: number) {
    super(`Timed out after ${timeoutMs}ms: ${operation}`);
    this.name = "RuntimeTimeoutError";
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Bound an async startup operation. The supplied abort signal cancels the
 * underlying operation when supported; the timeout also rejects callers when
 * a dependency ignores cancellation.
 */
export async function withRuntimeTimeout<T>(
  operation: string,
  task: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  parentSignal?: AbortSignal
): Promise<T> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new RangeError("timeoutMs must be a positive finite number");
  }
  if (parentSignal?.aborted) throw parentSignal.reason;

  const controller = new AbortController();
  const abortFromParent = (): void => controller.abort(parentSignal?.reason);
  parentSignal?.addEventListener("abort", abortFromParent, { once: true });

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      const error = new RuntimeTimeoutError(operation, timeoutMs);
      controller.abort(error);
      reject(error);
    }, timeoutMs);
  });

  try {
    return await Promise.race([task(controller.signal), timeout]);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
    parentSignal?.removeEventListener("abort", abortFromParent);
  }
}

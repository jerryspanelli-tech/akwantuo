export type EventMap = Record<string, unknown>;

type EventHandler<T> = (payload: T) => void;

export class RuntimeEventBus<Events extends EventMap> {
  #handlers = new Map<keyof Events, Set<EventHandler<never>>>();
  #disposed = false;

  on<K extends keyof Events>(event: K, handler: EventHandler<Events[K]>): () => void {
    if (this.#disposed) throw new Error("Cannot subscribe to a disposed event bus");
    let handlers = this.#handlers.get(event);
    if (!handlers) {
      handlers = new Set<EventHandler<never>>();
      this.#handlers.set(event, handlers);
    }
    handlers.add(handler as EventHandler<never>);
    return () => this.off(event, handler);
  }

  once<K extends keyof Events>(event: K, handler: EventHandler<Events[K]>): () => void {
    let unsubscribe = (): void => undefined;
    unsubscribe = this.on(event, (payload) => {
      unsubscribe();
      handler(payload);
    });
    return unsubscribe;
  }

  off<K extends keyof Events>(event: K, handler: EventHandler<Events[K]>): void {
    const handlers = this.#handlers.get(event);
    handlers?.delete(handler as EventHandler<never>);
    if (handlers?.size === 0) this.#handlers.delete(event);
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    if (this.#disposed) return;
    const handlers = this.#handlers.get(event);
    if (!handlers) return;
    for (const handler of [...handlers]) handler(payload as never);
  }

  clear(): void {
    this.#handlers.clear();
  }

  dispose(): void {
    this.clear();
    this.#disposed = true;
  }
}

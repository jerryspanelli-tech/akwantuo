import { detectRuntimeCapabilities, type RuntimeCapabilities } from "./capabilities";
import { RuntimeDiagnostics } from "./diagnostics";
import { RuntimeEventBus, type EventMap } from "./eventBus";
import { RuntimeLifecycle, type RuntimePhaseChange } from "./lifecycle";

export interface RuntimeEvents extends EventMap {
  "runtime:phase": RuntimePhaseChange;
}

export interface RuntimeContext {
  readonly lifecycle: RuntimeLifecycle;
  readonly diagnostics: RuntimeDiagnostics;
  readonly events: RuntimeEventBus<RuntimeEvents>;
  readonly capabilities: RuntimeCapabilities;
  dispose(reason?: string): Promise<void>;
}

/**
 * Create the application-level runtime services once per game session.
 * This module deliberately has no dependency on game content or Supabase.
 */
export function createRuntimeContext(options?: {
  diagnosticCapacity?: number;
  capabilities?: RuntimeCapabilities;
}): RuntimeContext {
  const lifecycle = new RuntimeLifecycle();
  const diagnostics = new RuntimeDiagnostics(options?.diagnosticCapacity);
  const events = new RuntimeEventBus<RuntimeEvents>();
  const capabilities = options?.capabilities ?? detectRuntimeCapabilities();

  lifecycle.subscribe((change) => {
    diagnostics.record({
      level: change.current === "failed" ? "error" : "info",
      category: "startup",
      name: "phase_changed",
      message: `${change.previous} -> ${change.current}`,
      phase: change.current,
      details: { elapsedAt: change.at }
    });
    events.emit("runtime:phase", change);
  });

  lifecycle.addCleanup(() => events.dispose());

  return {
    lifecycle,
    diagnostics,
    events,
    capabilities,
    dispose: (reason) => lifecycle.dispose(reason)
  };
}

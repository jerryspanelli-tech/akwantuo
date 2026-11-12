import { Engine, Scene, type EngineOptions } from "@babylonjs/core";
import type { RuntimeContext } from "../runtime/context";

export interface BabylonHostOptions {
  antialias?: boolean;
  engineOptions?: EngineOptions;
  adaptToDeviceRatio?: boolean;
  onFrameError?: (error: unknown) => void;
}

export interface BabylonHost {
  readonly engine: Engine;
  readonly scene: Scene;
  readonly canvas: HTMLCanvasElement;
  readonly isDisposed: boolean;
  start(): void;
  stop(): void;
  resize(): void;
  dispose(): void;
}

/**
 * Owns the Babylon engine and its primary scene for one runtime session.
 * Game content is intentionally created by callers, not by this platform layer.
 */
export function createBabylonHost(
  canvas: HTMLCanvasElement,
  runtime: RuntimeContext,
  options: BabylonHostOptions = {}
): BabylonHost {
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new TypeError("A valid HTMLCanvasElement is required");
  }
  if (runtime.lifecycle.isDisposed) {
    throw new Error("Cannot create a Babylon host for a disposed runtime");
  }

  const engine = new Engine(
    canvas,
    options.antialias ?? true,
    options.engineOptions ?? {},
    options.adaptToDeviceRatio ?? true
  );
  const scene = new Scene(engine);
  let disposed = false;
  let running = false;

  const host: BabylonHost = {
    engine,
    scene,
    canvas,
    get isDisposed() {
      return disposed;
    },
    start() {
      if (disposed) throw new Error("Cannot start a disposed Babylon host");
      if (running) return;
      running = true;
      engine.runRenderLoop(() => {
        if (disposed || !running) return;
        try {
          if (!scene.isDisposed) scene.render();
        } catch (error) {
          running = false;
          engine.stopRenderLoop();
          runtime.diagnostics.record({
            level: "error",
            category: "runtime",
            name: "render_loop_failed",
            message: error instanceof Error ? error.message : String(error)
          });
          options.onFrameError?.(error);
        }
      });
    },
    stop() {
      if (!running || disposed) return;
      running = false;
      engine.stopRenderLoop();
    },
    resize() {
      if (!disposed) engine.resize();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      running = false;
      engine.stopRenderLoop();
      scene.dispose();
      engine.dispose();
    }
  };

  runtime.lifecycle.addCleanup(() => host.dispose());
  return host;
}

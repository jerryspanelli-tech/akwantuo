import {
  Scene,
  TransformNode,
  UniversalCamera,
  Vector3
} from "@babylonjs/core";
import type { PassengerCameraMode } from "@akwantuo/shared";

export type PassengerCameraAnchors = {
  /** Seat-level anchor positioned and oriented toward the passenger's window. */
  interiorWindow: TransformNode;
  /** Vehicle-level anchor positioned behind and above the vehicle. */
  exteriorFollow: TransformNode;
};

/**
 * Camera rig for a passenger riding in a moving vehicle.
 *
 * The camera is parented to transforms supplied by the vehicle asset, so it
 * inherits the vehicle's live world transform. The exterior scene therefore
 * remains visible through real window geometry instead of using a video or
 * scrolling background. Vehicle models must provide correctly oriented
 * anchors and transparent window meshes.
 */
export class PassengerCameraRig {
  readonly camera: UniversalCamera;
  private readonly previousCamera;
  private readonly clampLookRotation: () => void;
  private attachedCanvas: HTMLCanvasElement | null = null;
  private mode: PassengerCameraMode = "interior_window";

  constructor(
    private readonly scene: Scene,
    private readonly anchors: PassengerCameraAnchors
  ) {
    this.previousCamera = scene.activeCamera;
    this.camera = new UniversalCamera("akwantuo-passenger-camera", Vector3.Zero(), scene);
    this.camera.minZ = 0.05;
    this.camera.speed = 0;
    this.camera.angularSensibility = 2400;
    this.camera.touchAngularSensibility = 4200;
    this.camera.inputs.removeByType("FreeCameraKeyboardMoveInput");

    this.clampLookRotation = () => {
      if (this.mode !== "interior_free_look") return;
      this.camera.rotation.x = Math.max(-0.48, Math.min(0.48, this.camera.rotation.x));
      this.camera.rotation.y = Math.max(-1.35, Math.min(1.35, this.camera.rotation.y));
      this.camera.rotation.z = 0;
    };
    scene.onBeforeRenderObservable.add(this.clampLookRotation);
    this.setMode("interior_window");
  }

  get currentMode(): PassengerCameraMode {
    return this.mode;
  }

  setMode(mode: PassengerCameraMode, canvas?: HTMLCanvasElement): void {
    const controlCanvas = canvas ?? this.attachedCanvas;
    if (mode === "interior_free_look" && !controlCanvas) {
      throw new Error("A canvas is required to enable passenger free-look controls.");
    }

    this.camera.detachControl();
    this.attachedCanvas = null;
    this.mode = mode;
    this.camera.rotation.set(0, 0, 0);

    if (mode === "exterior_follow") {
      this.camera.parent = this.anchors.exteriorFollow;
    } else {
      this.camera.parent = this.anchors.interiorWindow;
    }
    this.camera.position.set(0, 0, 0);
    this.scene.activeCamera = this.camera;

    if (mode === "interior_free_look") {
      if (!controlCanvas) {
        throw new Error("Passenger free-look canvas was not available.");
      }
      this.camera.attachControl(controlCanvas, true);
      this.attachedCanvas = controlCanvas;
    }
  }

  dispose(): void {
    this.camera.detachControl();
    this.scene.onBeforeRenderObservable.removeCallback(this.clampLookRotation);
    this.camera.parent = null;
    this.camera.dispose();
    if (this.scene.activeCamera === this.camera) {
      this.scene.activeCamera = this.previousCamera ?? null;
    }
  }
}

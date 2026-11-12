export interface RuntimeCapabilities {
  readonly isBrowser: boolean;
  readonly isTouchDevice: boolean;
  readonly isMobileViewport: boolean;
  readonly hardwareConcurrency: number | null;
  readonly deviceMemoryGb: number | null;
  readonly reducedMotion: boolean;
  readonly webgl2: boolean;
  readonly maxTouchPoints: number;
}

export function detectRuntimeCapabilities(
  host: Pick<Window, "matchMedia"> | undefined =
    typeof window === "undefined" ? undefined : window,
  userAgent: string | undefined =
    typeof navigator === "undefined" ? undefined : navigator.userAgent,
  hardwareConcurrency: number | undefined =
    typeof navigator === "undefined" ? undefined : navigator.hardwareConcurrency,
  deviceMemory: number | undefined =
    typeof navigator === "undefined" ? undefined : (navigator as Navigator & { deviceMemory?: number }).deviceMemory,
  maxTouchPoints: number =
    typeof navigator === "undefined" ? 0 : navigator.maxTouchPoints
): RuntimeCapabilities {
  const mobilePattern = /android|iphone|ipad|ipod|mobile/i;
  const isMobileViewport = host?.matchMedia("(max-width: 820px)").matches ?? false;
  const isTouchDevice = maxTouchPoints > 0 || (userAgent ? mobilePattern.test(userAgent) : false);

  let webgl2 = false;
  if (typeof document !== "undefined") {
    try {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("webgl2");
      webgl2 = context !== null;
      context?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch {
      webgl2 = false;
    }
  }

  return Object.freeze({
    isBrowser: typeof window !== "undefined" && typeof document !== "undefined",
    isTouchDevice,
    isMobileViewport,
    hardwareConcurrency: typeof hardwareConcurrency === "number" ? hardwareConcurrency : null,
    deviceMemoryGb: typeof deviceMemory === "number" ? deviceMemory : null,
    reducedMotion: host?.matchMedia("(prefers-reduced-motion: reduce)").matches ?? false,
    webgl2,
    maxTouchPoints
  });
}

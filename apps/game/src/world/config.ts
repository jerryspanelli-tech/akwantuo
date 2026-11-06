import type { Vector3Data } from "@akwantuo/shared";

export const WORLD_CONFIG = {
  id: "accra-preview",
  displayName: "Accra District",
  coordinateUnit: "metres",
  ground: {
    width: 21000,
    depth: 13500
  },
  road: {
    width: 13,
    length: 180
  },
  bounds: {
    minX: -8000,
    maxX: 13000,
    minZ: -5000,
    maxZ: 8500,
    playerMinX: -7900,
    playerMaxX: 12900,
    playerMinZ: -4900,
    playerMaxZ: 8400
  },
  spawn: {
    x: 0,
    y: 0,
    z: 5
  } satisfies Vector3Data,
  environment: {
    clearColor: [0.48, 0.62, 0.66, 1] as const,
    sunlightDirection: { x: 0.2, y: 1, z: 0.1 },
    sunlightIntensity: 0.9
  },
  movement: {
    walkSpeed: 5.2,
    gravity: 17,
    jumpVelocity: 6.3,
    collisionRadius: 0.48
  }
} as const;

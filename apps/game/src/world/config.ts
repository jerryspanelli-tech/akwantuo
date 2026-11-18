import type { Vector3Data } from "@akwantuo/shared";

export const WORLD_CONFIG = {
  id: "akwantuo-greater-accra",
  displayName: "Osu, Greater Accra",
  coordinateUnit: "metres",
  ground: {
    width: 21000,
    depth: 37500
  },
  road: {
    width: 13,
    length: 180
  },
  bounds: {
    minX: -8000,
    maxX: 13000,
    minZ: -5000,
    maxZ: 32500,
    playerMinX: -7900,
    playerMaxX: 12900,
    playerMinZ: -4900,
    playerMaxZ: 32400
  },
  spawn: {
    x: 1100,
    y: 0,
    z: -1250
  } satisfies Vector3Data,
  environment: {
    clearColor: [0.48, 0.62, 0.66, 1] as const,
    sunlightDirection: { x: 0.2, y: 1, z: 0.1 },
    sunlightIntensity: 0.9
  },
  movement: {
    maxSpeed: 12.0,
    gravity: 17,
    jumpVelocity: 6.3,
    collisionRadius: 0.48
  }
} as const;

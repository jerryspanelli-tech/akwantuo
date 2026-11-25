import type { MapPoint, MapRegionAnchor, MapRoadPath, CoastlinePoint } from "../world/greaterAccraLayout";
import type { LandmarkFootprint } from "../world/greaterAccraLandmarkData";
import { GREATER_ACCRA_MAP_EXTENT } from "../world/greaterAccraLayout";
import { findGreaterAccraRoadRoute } from "../world/greaterAccraNavigation";

type Place = MapPoint & { id: string; label: string; kind: "district" | "landmark" };

type Options = {
  roads: readonly MapRoadPath[];
  coastline: readonly CoastlinePoint[];
  regions: readonly MapRegionAnchor[];
  landmarks: readonly LandmarkFootprint[];
  getPlayerPosition: () => MapPoint;
  getPlayerHeading: () => number;
};

const regionLabels: Record<string, string> = {
  "greater-accra": "GREATER ACCRA",
  "airport-city": "AIRPORT CITY",
  "east-legon": "EAST LEGON",
  legon: "LEGON",
  "madina-adenta": "MADINA / ADENTA",
  achimota: "ACHIMOTA",
  "accra-central-makola": "MAKOLA / ACCRA CENTRAL",
  osu: "OSU",
  labadi: "LABADI",
  dansoman: "DANSOMAN",
  kaneshie: "KANESHIE",
  spintex: "SPINTEX",
  tema: "TEMA"
};

export function attachGreaterAccraWorldMap(options: Options): { update: (dt: number) => void } {
  const toggle = document.querySelector<HTMLButtonElement>("#map-toggle");
  const panel = document.querySelector<HTMLElement>("#world-map-panel");
  const close = document.querySelector<HTMLButtonElement>("#map-close");
  const canvas = document.querySelector<HTMLCanvasElement>("#world-map-canvas");
  const list = document.querySelector<HTMLElement>("#map-destinations");
  const status = document.querySelector<HTMLElement>("#map-route-status");
  const context = canvas?.getContext("2d") ?? null;
  if (!toggle || !panel || !close || !canvas || !list || !status || !context) {
    console.warn("[AKWANTUO] World map HUD markup is incomplete.");
    return { update: () => undefined };
  }

  const places: Place[] = [
    ...options.regions
      .filter((region) => region.regionId !== "greater-accra")
      .map((region) => ({
        id: region.regionId,
        label: regionLabels[region.regionId] ?? region.regionId.replace(/-/g, " ").toUpperCase(),
        x: region.x,
        z: region.z,
        kind: "district" as const
      })),
    ...options.landmarks.map((landmark) => ({
      id: landmark.id,
      label: landmark.label.toUpperCase(),
      x: landmark.x,
      z: landmark.z,
      kind: "landmark" as const
    }))
  ];

  let selected: Place | null = null;
  let elapsed = 0;
  let routePoints: readonly MapPoint[] = [];

  const mapX = (x: number) => {
    const pad = 34;
    const scale = Math.min(
      (canvas.width - pad * 2) / (GREATER_ACCRA_MAP_EXTENT.maxX - GREATER_ACCRA_MAP_EXTENT.minX),
      (canvas.height - pad * 2) / (GREATER_ACCRA_MAP_EXTENT.maxZ - GREATER_ACCRA_MAP_EXTENT.minZ)
    );
    const usedWidth = (GREATER_ACCRA_MAP_EXTENT.maxX - GREATER_ACCRA_MAP_EXTENT.minX) * scale;
    return (canvas.width - usedWidth) / 2 + (x - GREATER_ACCRA_MAP_EXTENT.minX) * scale;
  };
  const mapY = (z: number) => {
    const pad = 34;
    const scale = Math.min(
      (canvas.width - pad * 2) / (GREATER_ACCRA_MAP_EXTENT.maxX - GREATER_ACCRA_MAP_EXTENT.minX),
      (canvas.height - pad * 2) / (GREATER_ACCRA_MAP_EXTENT.maxZ - GREATER_ACCRA_MAP_EXTENT.minZ)
    );
    const usedHeight = (GREATER_ACCRA_MAP_EXTENT.maxZ - GREATER_ACCRA_MAP_EXTENT.minZ) * scale;
    return (canvas.height - usedHeight) / 2 + (GREATER_ACCRA_MAP_EXTENT.maxZ - z) * scale;
  };

  const draw = () => {
    const ctx = context;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#10231f";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Gulf of Guinea below the authored southern shoreline.
    if (options.coastline.length > 1) {
      ctx.beginPath();
      options.coastline.forEach((point, index) => {
        const x = mapX(point.x), y = mapY(point.z);
        if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.lineTo(mapX(GREATER_ACCRA_MAP_EXTENT.maxX), canvas.height);
      ctx.lineTo(mapX(GREATER_ACCRA_MAP_EXTENT.minX), canvas.height);
      ctx.closePath();
      ctx.fillStyle = "#123b4b";
      ctx.fill();
      ctx.strokeStyle = "#4e9aa5";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Primary and secondary authored road network.
    for (const road of options.roads) {
      if (!road.playableInFirstRelease || road.points.length < 2) continue;
      ctx.beginPath();
      road.points.forEach((point, index) => {
        const x = mapX(point.x), y = mapY(point.z);
        if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      const highway = /^(n1|n4|n6)-/.test(road.roadSegmentId);
      ctx.strokeStyle = highway ? "#d9b66e" : "#91a59a";
      ctx.lineWidth = highway ? 3.2 : 1.8;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
    }

    // District labels keep the geography readable at a glance.
    ctx.font = "600 13px system-ui, sans-serif";
    ctx.textAlign = "center";
    for (const region of options.regions) {
      if (region.regionId === "greater-accra") continue;
      ctx.fillStyle = "#b8c7bd";
      ctx.fillText(regionLabels[region.regionId] ?? region.regionId.toUpperCase(), mapX(region.x), mapY(region.z) - 12);
    }

    if (routePoints.length > 1) {
      ctx.beginPath();
      routePoints.forEach((point, index) => {
        const x = mapX(point.x), y = mapY(point.z);
        if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = "#64d5c1";
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
    }

    for (const place of places) {
      const x = mapX(place.x), y = mapY(place.z);
      ctx.beginPath();
      ctx.arc(x, y, place.id === selected?.id ? 7 : place.kind === "landmark" ? 5 : 4, 0, Math.PI * 2);
      ctx.fillStyle = place.id === selected?.id ? "#64d5c1" : place.kind === "landmark" ? "#e9bd70" : "#f1eee4";
      ctx.fill();
      ctx.strokeStyle = "#10201d";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    const player = options.getPlayerPosition();
    const px = mapX(player.x), py = mapY(player.z);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(-options.getPlayerHeading());
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(7, 8);
    ctx.lineTo(0, 4);
    ctx.lineTo(-7, 8);
    ctx.closePath();
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.strokeStyle = "#0b1714";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  };

  const choosePlace = (place: Place) => {
    selected = place;
    const start = options.getPlayerPosition();
    const route = findGreaterAccraRoadRoute(start, place, options.roads);
    routePoints = route?.points ?? [];
    if (route) {
      status.textContent = `Route to ${place.label}: ${(route.distanceM / 1000).toFixed(1)} km via the current road network.`;
    } else {
      const direct = Math.hypot(place.x - start.x, place.z - start.z);
      status.textContent = `No connected road route is mapped to ${place.label} yet. Straight-line distance: ${(direct / 1000).toFixed(1)} km.`;
    }
    draw();
    list.querySelectorAll("button").forEach((button) => {
      button.setAttribute("aria-pressed", button.dataset.placeId === place.id ? "true" : "false");
    });
  };

  for (const place of places) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "map-place-button";
    button.textContent = place.label;
    button.dataset.placeId = place.id;
    button.addEventListener("click", () => choosePlace(place));
    list.appendChild(button);
  }

  const setOpen = (open: boolean) => {
    panel.hidden = !open;
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) {
      draw();
      status.textContent = selected ? status.textContent : "Choose a district or landmark to plot a road route.";
    }
  };
  toggle.addEventListener("click", () => setOpen(panel.hidden));
  close.addEventListener("click", () => setOpen(false));
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden) setOpen(false);
  });

  return {
    update: (dt: number) => {
      if (panel.hidden) return;
      elapsed += Math.max(0, dt);
      if (elapsed < 0.25) return;
      elapsed = 0;
      draw();
    }
  };
}
